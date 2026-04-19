-- ============================================================
-- Fase NF-1.A · Infraestrutura de tarefas mensais NF PJ
-- ============================================================

-- ═══ 1. Ampliar tipo_processo em sncf_tarefas ═══
ALTER TABLE public.sncf_tarefas 
  DROP CONSTRAINT IF EXISTS sncf_tarefas_tipo_processo_check;

ALTER TABLE public.sncf_tarefas 
  ADD CONSTRAINT sncf_tarefas_tipo_processo_check 
  CHECK (tipo_processo IN ('onboarding', 'offboarding', 'movimentacao', 'manutencao', 'manual', 'emissao_nf'));

COMMENT ON COLUMN public.sncf_tarefas.tipo_processo IS 
  'Tipo de processo que originou a tarefa. Valores: onboarding, offboarding, movimentacao, manutencao, manual, emissao_nf (NF PJ mensal).';

-- ═══ 2. Função: cria tarefa de emissão para 1 PJ e 1 competência ═══
CREATE OR REPLACE FUNCTION public.criar_tarefa_emissao_nf_pj(
  _contrato_id UUID,
  _competencia TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato RECORD;
  v_prazo_dias INTEGER;
  v_tarefa_id UUID;
  v_dia_fim_mes DATE;
  v_prazo_emissao DATE;
BEGIN
  SELECT id, user_id, contato_nome, razao_social, nome_fantasia, valor_mensal, 
         categoria_pj, status, email_corporativo
  INTO v_contrato
  FROM public.contratos_pj
  WHERE id = _contrato_id
    AND status = 'ativo'
    AND categoria_pj = 'colaborador';
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Contrato % não elegível (não ativo ou não colaborador)', _contrato_id;
    RETURN NULL;
  END IF;
  
  SELECT COALESCE(NULLIF(label, '')::INTEGER, 5) INTO v_prazo_dias
  FROM public.parametros 
  WHERE categoria = 'nf_pj_config' AND valor = 'dias_antecedencia_aviso'
  LIMIT 1;
  
  IF v_prazo_dias IS NULL THEN v_prazo_dias := 5; END IF;
  
  v_dia_fim_mes := (date_trunc('month', (_competencia || '-01')::DATE) + INTERVAL '1 month - 1 day')::DATE;
  v_prazo_emissao := v_dia_fim_mes;
  
  -- Idempotência
  SELECT id INTO v_tarefa_id
  FROM public.sncf_tarefas
  WHERE tipo_processo = 'emissao_nf'
    AND colaborador_id = v_contrato.id
    AND descricao LIKE '%' || _competencia || '%'
    AND status NOT IN ('concluida', 'cancelada');
  
  IF v_tarefa_id IS NOT NULL THEN
    RAISE NOTICE 'Tarefa já existe para contrato % competência %: %', _contrato_id, _competencia, v_tarefa_id;
    RETURN v_tarefa_id;
  END IF;
  
  INSERT INTO public.sncf_tarefas (
    tipo_processo,
    sistema_origem,
    colaborador_id,
    colaborador_tipo,
    colaborador_nome,
    titulo,
    descricao,
    prioridade,
    area_destino,
    responsavel_role,
    responsavel_user_id,
    prazo_data,
    prazo_dias,
    status
  ) VALUES (
    'emissao_nf',
    'people',
    v_contrato.id,
    'pj',
    COALESCE(v_contrato.contato_nome, v_contrato.razao_social),
    'Emitir NF · competência ' || _competencia,
    E'Emissão mensal de Nota Fiscal referente ao contrato PJ.\n\n**Competência:** ' || _competencia || 
    E'\n**Valor base do contrato:** R$ ' || TO_CHAR(v_contrato.valor_mensal, 'FM999G999G990D00') ||
    E'\n**Prazo de emissão:** até ' || TO_CHAR(v_prazo_emissao, 'DD/MM/YYYY') ||
    E'\n\nAcesse `/minhas-notas` no portal para anexar a NF e classificar valores. Caso o valor emitido seja diferente do contrato, é necessário justificar e classificar os valores extras (ex: extra de projeto, reembolso).',
    'normal',
    'financeiro',
    'colaborador',
    v_contrato.user_id,
    v_prazo_emissao,
    v_prazo_dias,
    'pendente'
  )
  RETURNING id INTO v_tarefa_id;
  
  PERFORM public.registrar_audit(
    'TAREFA_EMISSAO_NF_CRIADA',
    jsonb_build_object(
      'tarefa_id', v_tarefa_id,
      'contrato_id', _contrato_id,
      'competencia', _competencia,
      'prazo', v_prazo_emissao
    )
  );
  
  RETURN v_tarefa_id;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao criar tarefa de emissão NF contrato=% comp=%: %', _contrato_id, _competencia, SQLERRM;
  RETURN NULL;
END $$;

COMMENT ON FUNCTION public.criar_tarefa_emissao_nf_pj IS 
  'Cria tarefa individual "Emitir NF" para 1 contrato PJ colaborador + 1 competência. Idempotente (não cria duplicado). Usado pelo cron mensal e também pode ser chamado manualmente.';

-- ═══ 3. Função batch mensal ═══
CREATE OR REPLACE FUNCTION public.criar_tarefas_emissao_nf_pj_mensal()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato RECORD;
  v_total INTEGER := 0;
  v_criadas INTEGER := 0;
  v_competencia TEXT;
BEGIN
  v_competencia := TO_CHAR(now(), 'YYYY-MM');
  
  FOR v_contrato IN
    SELECT id, contato_nome, razao_social
    FROM public.contratos_pj
    WHERE status = 'ativo'
      AND categoria_pj = 'colaborador'
      AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
  LOOP
    v_total := v_total + 1;
    
    IF public.criar_tarefa_emissao_nf_pj(v_contrato.id, v_competencia) IS NOT NULL THEN
      v_criadas := v_criadas + 1;
    END IF;
  END LOOP;
  
  PERFORM public.registrar_audit(
    'BATCH_EMISSAO_NF_PJ_MENSAL',
    jsonb_build_object(
      'competencia', v_competencia,
      'total_contratos_elegiveis', v_total,
      'tarefas_criadas_ou_ja_existentes', v_criadas,
      'executado_em', now()
    )
  );
  
  RAISE NOTICE 'Batch NF PJ mensal (comp=%): % contratos elegíveis, % tarefas processadas', 
    v_competencia, v_total, v_criadas;
  
  RETURN v_criadas;
END $$;

COMMENT ON FUNCTION public.criar_tarefas_emissao_nf_pj_mensal IS 
  'Batch mensal: cria tarefas "Emitir NF competência [mês atual]" para todos os PJ colaboradores ativos. Agendado via pg_cron. Idempotente — se rodar duas vezes no mesmo mês, não duplica tarefas.';

-- ═══ 4. Agendar pg_cron mensal ═══
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'criar_tarefas_emissao_nf_pj_mensal') THEN
    PERFORM cron.unschedule('criar_tarefas_emissao_nf_pj_mensal');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron.job não acessível ainda: %', SQLERRM;
END $$;

SELECT cron.schedule(
  'criar_tarefas_emissao_nf_pj_mensal',
  '0 9 25 * *',
  $$ SELECT public.criar_tarefas_emissao_nf_pj_mensal(); $$
);

-- ═══ 5. View: tarefas de emissão NF pendentes ═══
CREATE OR REPLACE VIEW public.tarefas_emissao_nf_pendentes AS
SELECT 
  t.id AS tarefa_id,
  t.colaborador_id AS contrato_id,
  t.colaborador_nome AS pj_nome,
  t.responsavel_user_id AS pj_user_id,
  t.titulo,
  t.prazo_data,
  t.status,
  t.created_at,
  cpj.razao_social,
  cpj.email_corporativo,
  cpj.valor_mensal,
  cpj.departamento
FROM public.sncf_tarefas t
LEFT JOIN public.contratos_pj cpj ON cpj.id = t.colaborador_id
WHERE t.tipo_processo = 'emissao_nf'
  AND t.status IN ('pendente', 'em_andamento')
ORDER BY t.prazo_data ASC NULLS LAST;

GRANT SELECT ON public.tarefas_emissao_nf_pendentes TO authenticated;

COMMENT ON VIEW public.tarefas_emissao_nf_pendentes IS 
  'Tarefas de emissão de NF PJ ainda pendentes. Auditoria rápida e base para dashboards.';

-- ═══ 6. Evoluir processo emissao_nf_pj para versão 1 ═══
DO $$
DECLARE
  v_proc_id UUID := (SELECT id FROM public.processos WHERE codigo = 'emissao_nf_pj');
  v_narrativa_v1 TEXT;
  v_diagrama_v1 TEXT;
BEGIN
  IF v_proc_id IS NULL THEN
    RAISE NOTICE 'Processo emissao_nf_pj não encontrado. Versão 1 não será criada.';
    RETURN;
  END IF;

  v_narrativa_v1 := E'# Emissão de NF PJ — Ciclo Mensal\n\n> **Versão 1 · 19/04/2026 22:45** — Fase NF-1.A aplicada: cron mensal + tarefas automáticas ativos.\n> **Processo espelho:** `fechamento_folha_clt` (CLT) — ainda não mapeado.\n\nCiclo mensal de emissão e processamento de Nota Fiscal por colaboradores PJ da Fetely.\n\n---\n\n## Gatilho do processo\n\n**Cron automático:** todo dia 25 do mês às 09:00 UTC, sistema cria tarefa "Emitir NF · competência [YYYY-MM]" para cada contrato PJ ativo com `categoria_pj = colaborador`.\n\n- Tarefa cai em `/tarefas` do PJ (responsável = own user)\n- Email corporativo recebe notificação auxiliar (fase NF-3)\n- Prazo = fim do mês da competência\n- Idempotente: rodar 2x no mesmo mês não duplica\n\n---\n\n## Fluxo atual (v1)\n\n1. **Dia 25:** cron cria tarefa "Emitir NF"\n2. **PJ recebe a tarefa** em `/tarefas`\n3. **PJ acessa `/minhas-notas`** (Fase NF-1.B — UI do portal)\n4. **PJ anexa PDF** + classifica valores (contrato/extra/reembolso) + justificativa se aplicável\n5. **NF entra no sistema** com status `aguardando_validacao`\n6. **Validação automática** (Fase NF-2) — futuro\n7. **Aprovação RH + envio financeiro** (Fase NF-3) — futuro\n\n---\n\n## Quem faz o quê (RACI v1)\n\n- **R:** Colaborador PJ (executa a tarefa)\n- **A:** RH (aprovará — futuro)\n- **C:** Board Jurídico + People Fetely\n- **I:** Gestor direto (acompanha tarefas do time)\n\n---\n\n## Componentes já entregues\n\n- ✅ Fase NF-0.A — Schema conceitual (migration 20260419214919)\n- ✅ Fase NF-0.B — Cadastro manual emergencial\n- ✅ Fase NF-1.A — Cron + função + view (esta migration)\n- ⏳ Fase NF-1.B — Portal `/minhas-notas` (UI) — próximo\n- ⏳ Fase NF-2 — Validação automática (IA + regras)\n- ⏳ Fase NF-3 — Aprovação RH + envio financeiro\n- ⏳ Fase NF-4 — Governança + KPIs\n\n---\n\n## Classificação de valores (DRE)\n\nCada NF pode ter múltiplas classificações cadastradas em `nf_pj_classificacoes`:\n- **contrato** — mensalidade do contrato PJ (entra na Folha real)\n- **extra_projeto** — serviço adicional (despesa variável)\n- **reembolso** — despesas reembolsáveis (despesa variável)\n- **ajuste_retroativo** — correção de período anterior\n\n**Justificativa obrigatória** para categorias que não sejam `contrato`.\n\n---\n\n## Funções e cron ativos\n\n- `public.criar_tarefa_emissao_nf_pj(contrato_id, competencia)` — cria 1 tarefa individual\n- `public.criar_tarefas_emissao_nf_pj_mensal()` — batch que varre todos PJ colaboradores\n- Cron `criar_tarefas_emissao_nf_pj_mensal` rodando dia 25 às 09:00 UTC\n- View `public.tarefas_emissao_nf_pendentes` para consulta rápida\n\n---\n\n## KPIs candidatos (Fetely em Números)\n\n- Tempo médio ciclo: emissão → enviada_pagamento (futuro)\n- Taxa de aprovação 1ª tentativa (futuro)\n- Volume de NF inconsistente por prestador (futuro)\n- Aderência ao prazo de emissão (aferível pela view `tarefas_emissao_nf_pendentes`)\n- Folha real contratual (Σ valores categoria=contrato)\n- Despesa variável PJ (Σ valores extras/reembolso)\n\n---\n\n## Histórico de versões\n\n- **v0 (19/04/2026 22:00):** Rascunho inicial. Schema + parametrização cadastrados (Fase NF-0.A).\n- **v1 (19/04/2026 22:45):** Infraestrutura de tarefas ativa. Cron mensal criando tarefas automaticamente para todos os PJ colaboradores. Processo formalmente operacional, aguardando UI do portal.';

  v_diagrama_v1 := E'flowchart TB\n    Cron([Cron dia 25 · 09:00 UTC]) --> Loop[Varre PJ colaboradores ativos]\n    Loop --> ForEach{Para cada<br/>contrato}\n    ForEach --> CriaTarefa[Cria tarefa<br/>emitir NF comp YYYY-MM]\n    CriaTarefa --> Tarefa[sncf_tarefas<br/>tipo=emissao_nf<br/>prazo=fim do mês]\n    Tarefa --> PJ[PJ recebe em<br/>/tarefas]\n    PJ --> Portal[Acessa portal<br/>/minhas-notas<br/>Fase NF-1.B]\n    Portal --> Submete[Anexa PDF + classifica<br/>valores + justificativa]\n    Submete --> NF[NF criada status<br/>aguardando_validacao]\n    NF --> Futuro([Validação IA →<br/>Aprovação RH →<br/>Envio financeiro<br/>Fases NF-2, NF-3])\n    \n    classDef ativa fill:#1a3d2b,color:#fff,stroke:#1a3d2b\n    classDef futura fill:#f5f5f5,color:#666,stroke:#ccc,stroke-dasharray:3 3\n    class Cron,Loop,CriaTarefa,Tarefa ativa\n    class Portal,Submete,NF,Futuro futura';

  INSERT INTO public.processos_versoes (
    processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot,
    natureza_snapshot, diagrama_snapshot, motivo_alteracao
  )
  VALUES (
    v_proc_id, 1, 'Emissão de NF PJ (Ciclo Mensal) v1',
    'Ciclo mensal de remuneração PJ — cron ativo',
    v_narrativa_v1, 'operacional', v_diagrama_v1,
    'Versão 1 — Fase NF-1.A aplicada. Cron mensal ativo criando tarefas automaticamente. Processo formalmente operacional. Aguardando UI do portal (Fase NF-1.B).'
  );

  UPDATE public.processos 
  SET 
    versao_atual = 1,
    status_valor = 'vigente',
    narrativa = v_narrativa_v1,
    diagrama_mermaid = v_diagrama_v1,
    versao_vigente_em = now()
  WHERE id = v_proc_id;

  RAISE NOTICE 'Processo emissao_nf_pj evoluído para v1';
END $$;