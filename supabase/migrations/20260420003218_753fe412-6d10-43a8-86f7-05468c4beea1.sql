-- ═══ 1. Ampliar tipo_processo em sncf_tarefas ═══
ALTER TABLE public.sncf_tarefas 
  DROP CONSTRAINT IF EXISTS sncf_tarefas_tipo_processo_check;

ALTER TABLE public.sncf_tarefas 
  ADD CONSTRAINT sncf_tarefas_tipo_processo_check 
  CHECK (tipo_processo IN (
    'onboarding', 'offboarding', 'movimentacao', 'manutencao', 
    'manual', 'emissao_nf', 'correcao_nf', 'aprovacao_nf'
  ));

COMMENT ON COLUMN public.sncf_tarefas.tipo_processo IS 
  'Tipo de processo que originou a tarefa. Valores: onboarding, offboarding, movimentacao, manutencao, manual, emissao_nf (NF PJ mensal), correcao_nf (NF precisa correção pelo PJ), aprovacao_nf (RH precisa aprovar).';

-- ═══ 2. Função de validação cadastral + valor ═══
CREATE OR REPLACE FUNCTION public.validar_nf_pj(_nota_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nota RECORD;
  v_valor_contrato_na_nf NUMERIC;
  v_erros JSONB := '[]'::JSONB;
  v_warnings JSONB := '[]'::JSONB;
  v_aprovada BOOLEAN := true;
BEGIN
  SELECT nf.*, cpj.cnpj AS cnpj_contrato, cpj.razao_social AS razao_contrato, 
         cpj.valor_mensal AS valor_contrato, cpj.categoria_pj
  INTO v_nota
  FROM public.notas_fiscais_pj nf
  JOIN public.contratos_pj cpj ON cpj.id = nf.contrato_id
  WHERE nf.id = _nota_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'erro', 'motivo', 'Nota fiscal não encontrada');
  END IF;
  
  -- Validação 1: Valor classificado como "contrato"
  SELECT COALESCE(SUM(valor), 0)
  INTO v_valor_contrato_na_nf
  FROM public.nf_pj_classificacoes
  WHERE nota_fiscal_id = _nota_id
    AND categoria_valor = 'contrato';
  
  IF ABS(v_valor_contrato_na_nf - v_nota.valor_contrato) > 0.01 THEN
    v_erros := v_erros || jsonb_build_object(
      'campo', 'valor_contrato',
      'detectado', v_valor_contrato_na_nf,
      'esperado', v_nota.valor_contrato,
      'mensagem', 'Valor classificado como "Mensalidade do contrato" diverge do valor mensal do seu contrato (R$ ' 
        || TO_CHAR(v_nota.valor_contrato, 'FM999G999G990D00') || '). Ajuste e reenvie.'
    );
    v_aprovada := false;
  END IF;
  
  -- Validação 2: Classificações com categoria != contrato precisam de justificativa
  IF EXISTS (
    SELECT 1 FROM public.nf_pj_classificacoes
    WHERE nota_fiscal_id = _nota_id
      AND categoria_valor != 'contrato'
      AND (justificativa IS NULL OR TRIM(justificativa) = '')
  ) THEN
    v_erros := v_erros || jsonb_build_object(
      'campo', 'justificativa',
      'mensagem', 'Itens classificados como extras (não-contrato) precisam de justificativa preenchida.'
    );
    v_aprovada := false;
  END IF;
  
  -- Validação 3: Soma das classificações bate com valor total da NF
  IF EXISTS (
    SELECT 1 FROM public.nf_pj_classificacoes WHERE nota_fiscal_id = _nota_id
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.nf_pj_classificacoes 
      WHERE nota_fiscal_id = _nota_id
      GROUP BY nota_fiscal_id
      HAVING ABS(SUM(valor) - v_nota.valor) < 0.01
    ) THEN
      v_erros := v_erros || jsonb_build_object(
        'campo', 'soma_classificacoes',
        'mensagem', 'Soma dos itens classificados não bate com valor total da NF. Revise os valores.'
      );
      v_aprovada := false;
    END IF;
  ELSE
    v_erros := v_erros || jsonb_build_object(
      'campo', 'classificacoes',
      'mensagem', 'A nota não tem classificação de valores. É necessário classificar ao menos 1 item.'
    );
    v_aprovada := false;
  END IF;
  
  -- Warnings (não bloqueiam)
  IF v_nota.numero IS NULL OR LENGTH(TRIM(v_nota.numero)) < 3 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'campo', 'numero',
      'mensagem', 'Número da NF muito curto — verifique se foi extraído corretamente.'
    );
  END IF;
  
  IF v_nota.categoria_pj != 'colaborador' THEN
    v_warnings := v_warnings || jsonb_build_object(
      'campo', 'categoria_pj',
      'mensagem', 'Contrato classificado como prestador_servico — fluxo automático pode não aplicar.'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'aprovada', v_aprovada,
    'status', CASE WHEN v_aprovada THEN 'aprovada_automatica' ELSE 'precisa_correcao' END,
    'erros', v_erros,
    'warnings', v_warnings,
    'validado_em', now()
  );
END $$;

COMMENT ON FUNCTION public.validar_nf_pj IS 
  'Valida automaticamente uma NF PJ contra o contrato. Retorna JSONB com aprovada (bool), erros e warnings.';

-- ═══ 3. Função que cria tarefa de correção pro PJ ═══
CREATE OR REPLACE FUNCTION public.criar_tarefa_correcao_nf_pj(
  _nota_id UUID,
  _erros JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nota RECORD;
  v_tarefa_id UUID;
  v_lista_erros TEXT;
  v_erro JSONB;
BEGIN
  SELECT nf.id, nf.numero, nf.competencia, nf.valor, nf.contrato_id,
         cpj.user_id, cpj.contato_nome, cpj.razao_social
  INTO v_nota
  FROM public.notas_fiscais_pj nf
  JOIN public.contratos_pj cpj ON cpj.id = nf.contrato_id
  WHERE nf.id = _nota_id;
  
  IF NOT FOUND OR v_nota.user_id IS NULL THEN
    RAISE NOTICE 'Nota % não encontrada ou sem user_id', _nota_id;
    RETURN NULL;
  END IF;
  
  v_lista_erros := '';
  FOR v_erro IN SELECT jsonb_array_elements(_erros) LOOP
    v_lista_erros := v_lista_erros || E'\n- ' || (v_erro->>'mensagem');
  END LOOP;
  
  INSERT INTO public.sncf_tarefas (
    tipo_processo, sistema_origem,
    colaborador_id, colaborador_tipo, colaborador_nome,
    titulo, descricao, prioridade,
    area_destino, responsavel_role, responsavel_user_id,
    prazo_dias, status,
    processo_id
  ) VALUES (
    'correcao_nf', 'people',
    v_nota.contrato_id, 'pj',
    COALESCE(v_nota.contato_nome, v_nota.razao_social),
    'Corrigir NF · ' || COALESCE(v_nota.numero, '[sem número]') || ' · comp ' || v_nota.competencia,
    E'Sua NF precisa de alguns ajustes antes de seguir para o pagamento. Abaixo o que precisa ser corrigido:\n' ||
    v_lista_erros ||
    E'\n\nAcesse `/minhas-notas` e reenvie uma nova NF ou reclassifique os valores desta.',
    'alta',
    'financeiro', 'colaborador', v_nota.user_id,
    5, 'pendente',
    _nota_id::UUID
  )
  RETURNING id INTO v_tarefa_id;
  
  PERFORM public.registrar_audit(
    'TAREFA_CORRECAO_NF_CRIADA',
    'sncf_tarefas',
    v_tarefa_id::TEXT,
    NULL,
    jsonb_build_object('tarefa_id', v_tarefa_id, 'nota_id', _nota_id, 'erros', _erros),
    'Validação automática reprovou NF — tarefa de correção criada para PJ'
  );
  
  RETURN v_tarefa_id;
END $$;

COMMENT ON FUNCTION public.criar_tarefa_correcao_nf_pj IS 
  'Cria tarefa "Corrigir NF" para PJ quando validação automática falha. Vincula nota ao processo_id da tarefa.';

-- ═══ 4. Função que cria tarefa de aprovação pro RH ═══
CREATE OR REPLACE FUNCTION public.criar_tarefa_aprovacao_nf_pj(_nota_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nota RECORD;
  v_tarefa_id UUID;
BEGIN
  SELECT nf.id, nf.numero, nf.competencia, nf.valor, nf.contrato_id,
         cpj.contato_nome, cpj.razao_social
  INTO v_nota
  FROM public.notas_fiscais_pj nf
  JOIN public.contratos_pj cpj ON cpj.id = nf.contrato_id
  WHERE nf.id = _nota_id;
  
  IF NOT FOUND THEN RETURN NULL; END IF;
  
  INSERT INTO public.sncf_tarefas (
    tipo_processo, sistema_origem,
    colaborador_id, colaborador_tipo, colaborador_nome,
    titulo, descricao, prioridade,
    area_destino, responsavel_role,
    prazo_dias, status,
    processo_id
  ) VALUES (
    'aprovacao_nf', 'people',
    v_nota.contrato_id, 'pj',
    COALESCE(v_nota.contato_nome, v_nota.razao_social),
    'Aprovar NF · ' || COALESCE(v_nota.numero, '[sem número]') || ' · ' || COALESCE(v_nota.contato_nome, v_nota.razao_social),
    E'NF aprovada na validação automática — aguarda aprovação do RH para seguir pro financeiro.\n\n' ||
    'Competência: ' || v_nota.competencia || E'\n' ||
    'Valor: R$ ' || TO_CHAR(v_nota.valor, 'FM999G999G990D00'),
    'normal',
    'financeiro', 'admin_rh',
    3, 'pendente',
    _nota_id::UUID
  )
  RETURNING id INTO v_tarefa_id;
  
  PERFORM public.registrar_audit(
    'TAREFA_APROVACAO_NF_CRIADA',
    'sncf_tarefas',
    v_tarefa_id::TEXT,
    NULL,
    jsonb_build_object('tarefa_id', v_tarefa_id, 'nota_id', _nota_id),
    'NF passou validação automática — tarefa de aprovação criada para RH'
  );
  
  RETURN v_tarefa_id;
END $$;

COMMENT ON FUNCTION public.criar_tarefa_aprovacao_nf_pj IS 
  'Cria tarefa de aprovação para RH quando NF passa na validação automática.';

-- ═══ 5. Trigger: ao submeter NF, valida + roteia ═══
CREATE OR REPLACE FUNCTION public.processar_nf_pj_auto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validacao JSONB;
BEGIN
  IF NEW.status != 'aguardando_validacao' THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.status = 'aguardando_validacao' THEN
    RETURN NEW;
  END IF;
  
  v_validacao := public.validar_nf_pj(NEW.id);
  
  IF (v_validacao->>'aprovada')::BOOLEAN THEN
    UPDATE public.notas_fiscais_pj 
      SET status = 'aguardando_aprovacao',
          observacoes = COALESCE(observacoes, '') || 
            E'\n[Validação automática OK em ' || now()::TEXT || ']'
      WHERE id = NEW.id;
    
    PERFORM public.criar_tarefa_aprovacao_nf_pj(NEW.id);
  ELSE
    UPDATE public.notas_fiscais_pj 
      SET status = 'precisa_correcao',
          observacoes = COALESCE(observacoes, '') || 
            E'\n[Validação automática reprovou em ' || now()::TEXT || ': ' || 
            (v_validacao->'erros')::TEXT || ']'
      WHERE id = NEW.id;
    
    PERFORM public.criar_tarefa_correcao_nf_pj(NEW.id, v_validacao->'erros');
  END IF;
  
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_nf_pj_auto ON public.notas_fiscais_pj;
CREATE TRIGGER trg_nf_pj_auto
  AFTER INSERT ON public.notas_fiscais_pj
  FOR EACH ROW
  WHEN (NEW.status = 'aguardando_validacao')
  EXECUTE FUNCTION public.processar_nf_pj_auto();

COMMENT ON TRIGGER trg_nf_pj_auto ON public.notas_fiscais_pj IS
  'Processa NF recém-criada: valida cadastro + valor. Se OK → tarefa aprovação RH. Se falha → tarefa correção PJ.';

-- ═══ 6. Evoluir processo emissao_nf_pj para v2 ═══
DO $$
DECLARE
  v_proc_id UUID := (SELECT id FROM public.processos WHERE codigo = 'emissao_nf_pj');
  v_narrativa_v2 TEXT;
  v_diagrama_v2 TEXT;
BEGIN
  IF v_proc_id IS NULL THEN RETURN; END IF;

  v_narrativa_v2 := E'# Emissão de NF PJ — Ciclo Mensal\n\n> **Versão 2 · 20/04/2026** — Fase NF-2 aplicada: validação automática ativa.\n> **Processo espelho:** `fechamento_folha_clt` (CLT) — ainda não mapeado.\n\nCiclo mensal de emissão e processamento de Nota Fiscal por colaboradores PJ da Fetely. Agora com validação automática inteligente — NF passa pelo filtro antes de chegar no RH.\n\n---\n\n## Gatilho do processo\n\n**Cron automático:** todo dia 25 às 09:00 UTC, cria tarefa "Emitir NF" para cada PJ colaborador ativo.\n\n---\n\n## Fluxo atual (v2)\n\n1. **Dia 25:** cron cria tarefa "Emitir NF"\n2. **PJ recebe** em `/tarefas`\n3. **PJ submete via /minhas-notas** — upload PDF + classificação de valores\n4. **NF criada** com status `aguardando_validacao`\n5. **Trigger automático valida:**\n   - Valor classificado como "contrato" bate com valor mensal do contrato?\n   - Itens extras (não-contrato) têm justificativa preenchida?\n   - Soma das classificações bate com valor total da NF?\n6. **Se OK** → status `aguardando_aprovacao` + cria tarefa pro RH aprovar\n7. **Se falha** → status `precisa_correcao` + cria tarefa `correcao_nf` pro PJ com motivo detalhado\n8. **Aprovação RH + envio financeiro** (Fase NF-3) — próximo\n\n---\n\n## Validação automática — o que é checado\n\n✅ **Valor contrato vs. contrato PJ** — tolerância de 1 centavo\n✅ **Justificativa em extras** — obrigatória para categorias ≠ contrato\n✅ **Soma fecha com valor total da NF**\n⚠️ **Warning (não bloqueia):** número da NF muito curto, categoria PJ diferente de colaborador\n\n**Valores extras NÃO são validados** — RH revisa manualmente na aprovação.\n\n---\n\n## Quem faz o quê (RACI v2)\n\n- **R:** Colaborador PJ (emite + corrige se necessário)\n- **A:** RH (aprovará — Fase NF-3)\n- **C:** Sistema (validação automática — silencioso)\n- **I:** Gestor direto\n\n---\n\n## Componentes já entregues\n\n- ✅ Fase NF-0.A — Schema\n- ✅ Fase NF-0.B — Cadastro manual\n- ✅ Fase NF-1.A — Cron + tarefas\n- ✅ Fase NF-1.B — Portal PJ (tela /minhas-notas + submit)\n- ✅ Fase NF-2 — Validação automática (esta migration)\n- ⏳ Fase NF-3 — Aprovação RH + envio financeiro\n- ⏳ Fase NF-4 — Governança + KPIs\n\n---\n\n## Funções e triggers ativos\n\n- `public.validar_nf_pj(nota_id)` — valida cadastro + valor, retorna JSONB\n- `public.criar_tarefa_correcao_nf_pj(nota_id, erros)` — tarefa de volta pro PJ\n- `public.criar_tarefa_aprovacao_nf_pj(nota_id)` — tarefa pro RH\n- `public.processar_nf_pj_auto()` — trigger roteador\n- Trigger `trg_nf_pj_auto` AFTER INSERT em `notas_fiscais_pj`\n\n---\n\n## Histórico de versões\n\n- **v0 (19/04/2026):** Rascunho inicial (Fase NF-0.A)\n- **v1 (19/04/2026):** Cron ativo (Fase NF-1.A)\n- **v2 (20/04/2026):** Validação automática (Fase NF-2). PJ recebe correção imediata, RH só vê NFs que passaram no filtro.';

  v_diagrama_v2 := E'flowchart TB\n    Cron([Cron dia 25]) --> Tarefa[Tarefa emissao_nf criada]\n    Tarefa --> PJ[PJ em /tarefas]\n    PJ --> Portal[Submete via /minhas-notas]\n    Portal --> NF[NF criada<br/>status=aguardando_validacao]\n    NF --> Trigger{Trigger<br/>validar_nf_pj}\n    Trigger -- Passou --> Apro[status=aguardando_aprovacao]\n    Apro --> TarRH[Tarefa aprovacao_nf<br/>pro admin_rh]\n    TarRH --> RH[RH aprova<br/>Fase NF-3]\n    Trigger -- Falhou --> Corr[status=precisa_correcao]\n    Corr --> TarPJ[Tarefa correcao_nf<br/>volta pro PJ]\n    TarPJ --> PJ2[PJ corrige + reenvia]\n    PJ2 --> Portal\n    \n    classDef auto fill:#4FC3D8,color:#1a3d2b,stroke:#1a3d2b\n    classDef humano fill:#F4A7B9,color:#1a3d2b,stroke:#8B1A2F\n    classDef futura fill:#f5f5f5,color:#666,stroke:#ccc,stroke-dasharray:3 3\n    class Cron,Tarefa,NF,Trigger,Apro,Corr,TarRH,TarPJ auto\n    class PJ,Portal,PJ2 humano\n    class RH futura';

  INSERT INTO public.processos_versoes (
    processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot,
    natureza_snapshot, diagrama_snapshot, motivo_alteracao
  )
  VALUES (
    v_proc_id, 2, 'Emissão de NF PJ (Ciclo Mensal) v2',
    'Validação automática ativa',
    v_narrativa_v2, 'operacional', v_diagrama_v2,
    'Versão 2 — Fase NF-2 aplicada. Trigger valida NF no momento do submit. Tarefas de correção (PJ) e aprovação (RH) criadas automaticamente.'
  );

  UPDATE public.processos 
  SET versao_atual = 2,
      narrativa = v_narrativa_v2,
      diagrama_mermaid = v_diagrama_v2,
      versao_vigente_em = now()
  WHERE id = v_proc_id;
END $$;