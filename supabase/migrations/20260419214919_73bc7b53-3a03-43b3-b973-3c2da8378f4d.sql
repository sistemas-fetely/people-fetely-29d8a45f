-- ═══ 1. Campo categoria_pj em contratos_pj ═══
ALTER TABLE public.contratos_pj 
  ADD COLUMN IF NOT EXISTS categoria_pj TEXT NOT NULL DEFAULT 'colaborador'
  CHECK (categoria_pj IN ('colaborador', 'prestador_servico'));

COMMENT ON COLUMN public.contratos_pj.categoria_pj IS 
  'Classificação do tipo de vínculo PJ: colaborador (atua no time, email corporativo, relação contínua) ou prestador_servico (serviço pontual/episódico). O fluxo de NF do Uauuu é desenhado inicialmente para categoria colaborador. Prestadores pontuais terão processo próprio. Revisar trimestralmente — o campo é declaração, não fato.';

CREATE INDEX IF NOT EXISTS idx_contratos_pj_categoria ON public.contratos_pj(categoria_pj);

-- ═══ 2. Tabela nova: nf_pj_classificacoes ═══
CREATE TABLE IF NOT EXISTS public.nf_pj_classificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais_pj(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL CHECK (valor > 0),
  categoria_valor TEXT NOT NULL,
  descricao_adicional TEXT,
  justificativa TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nf_class_nota ON public.nf_pj_classificacoes(nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_nf_class_categoria ON public.nf_pj_classificacoes(categoria_valor);

COMMENT ON TABLE public.nf_pj_classificacoes IS 
  'Quebra do valor total de uma NF PJ em categorias (contrato, extra_projeto, reembolso, ajuste_retroativo). Permite DRE correto separando folha contratual de despesa variável. Soma dos valores aqui deve bater com valor total da nota_fiscal_id.';

COMMENT ON COLUMN public.nf_pj_classificacoes.justificativa IS
  'Justificativa obrigatória para categorias que não sejam "contrato" — permite auditoria e automação de validação.';

ALTER TABLE public.nf_pj_classificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nf_class_admin_all" ON public.nf_pj_classificacoes
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_rh'::app_role)
    OR has_role(auth.uid(), 'financeiro'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_rh'::app_role)
    OR has_role(auth.uid(), 'financeiro'::app_role)
  );

CREATE POLICY "nf_class_read_self_pj" ON public.nf_pj_classificacoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais_pj nf
      JOIN public.contratos_pj cpj ON cpj.id = nf.contrato_id
      WHERE nf.id = nota_fiscal_id
        AND cpj.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_nf_class_updated_at ON public.nf_pj_classificacoes;
CREATE TRIGGER trg_nf_class_updated_at
  BEFORE UPDATE ON public.nf_pj_classificacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ 3. Parametrização: categoria_valor_nf ═══
INSERT INTO public.parametros (categoria, valor, label, ordem, ativo) VALUES
  ('categoria_valor_nf', 'contrato',          'Mensalidade do contrato',           1, true),
  ('categoria_valor_nf', 'extra_projeto',     'Extra de projeto pontual',          2, true),
  ('categoria_valor_nf', 'reembolso',         'Reembolso de despesa',              3, true),
  ('categoria_valor_nf', 'ajuste_retroativo', 'Ajuste retroativo (correção)',      4, true)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ═══ 4. Parâmetros operacionais NF PJ ═══
INSERT INTO public.parametros (categoria, valor, label, descricao, ordem, ativo) VALUES
  ('nf_pj_config', 'email_responsavel_pagamento', '(não configurado)', 
   'Email do responsável financeiro que recebe as NFs aprovadas. Alterar em Parâmetros.', 1, true),
  ('nf_pj_config', 'dias_antecedencia_aviso', '5', 
   'Quantos dias antes do fim da competência o sistema cria a tarefa de emissão de NF pro PJ.', 2, true),
  ('nf_pj_config', 'cron_dia_mes_aviso', '25', 
   'Dia do mês em que o cron cria as tarefas de emissão de NF para competência do mês seguinte.', 3, true),
  ('nf_pj_config', 'cron_hora_aviso', '09', 
   'Hora (UTC) em que o cron de emissão de NF roda.', 4, true)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ═══ 5. Expandir status em notas_fiscais_pj (parametrizar) ═══
INSERT INTO public.parametros (categoria, valor, label, ordem, ativo) VALUES
  ('status_nf_pj', 'aguardando_emissao',     'Aguardando emissão pelo PJ',        1, true),
  ('status_nf_pj', 'em_analise',             'Em análise automática',              2, true),
  ('status_nf_pj', 'precisa_correcao',       'Precisa correção pelo PJ',           3, true),
  ('status_nf_pj', 'aguardando_aprovacao',   'Aguardando aprovação do RH',        4, true),
  ('status_nf_pj', 'aprovada',               'Aprovada pelo RH',                   5, true),
  ('status_nf_pj', 'enviada_pagamento',      'Enviada para pagamento',             6, true),
  ('status_nf_pj', 'paga',                   'Paga (confirmação manual por ora)',  7, true),
  ('status_nf_pj', 'rejeitada',              'Rejeitada',                          8, true),
  ('status_nf_pj', 'em_disputa',             'Em disputa (PJ discorda)',          9, true)
ON CONFLICT (categoria, valor) DO NOTHING;

COMMENT ON COLUMN public.notas_fiscais_pj.status IS
  'Status do ciclo de NF PJ. Valores esperados em parametros categoria=status_nf_pj. Migração gradual: status legados (pendente, aprovada, enviada_pagamento, paga) continuam válidos até Fase NF-3.';

-- ═══ 6. Cadastro do processo emissao_nf_pj em Processos Fetely (RASCUNHO) ═══
DO $$
DECLARE
  v_proc_id UUID;
  v_area_adm UUID := (SELECT id FROM public.parametros WHERE categoria='area_negocio' AND valor='administrativo' LIMIT 1);
  v_depto_rh UUID := (SELECT id FROM public.parametros WHERE categoria='departamento' AND valor='rh' LIMIT 1);
  v_depto_fin UUID := (SELECT id FROM public.parametros WHERE categoria='departamento' AND valor='financeiro' LIMIT 1);
  v_narrativa TEXT;
BEGIN
  v_narrativa := E'# Emissão de NF PJ — Ciclo mensal de remuneração\n\n> **Status:** Em construção (rascunho — v0). Desenhado em 19/04/2026.\n> **Processo espelho:** `fechamento_folha_clt` (CLT) — ainda não mapeado.\n\nEste processo descreve o ciclo mensal de emissão e processamento de Nota Fiscal por colaboradores PJ da Fetely. É o **espelho PJ** do pagamento de salário CLT — ambos implementam o conceito "ciclo mensal de remuneração".\n\n**Escopo desta versão:** apenas colaboradores PJ (`contratos_pj.categoria_pj = colaborador`). Prestadores pontuais (`categoria_pj = prestador_servico`) terão processo próprio.\n\n---\n\n## Quem faz o quê (RACI)\n\n- **R:** Colaborador PJ (emite NF, submete pela tarefa)\n- **A:** RH (aprova NFs válidas)\n- **C:** Dr. Marcos Teixeira (base trabalhista), Dra. Ana Cláudia Ferreira (compliance fiscal), Dra. Renata Souza (LGPD), Thiago Serrano (KPIs e disputas)\n- **I:** Gestor direto do PJ (acompanha), responsável pelo pagamento (recebe NFs aprovadas)\n\n---\n\n## Fluxo planejado (4 fases de construção)\n\n### Fase NF-1 · Portal do PJ + tarefa de emissão\n- Tela `/minhas-notas` no portal PJ com timeline\n- Cron mensal cria tarefa "Emitir NF competência X" para cada PJ ativo\n- PJ anexa PDF + classificação de valores + justificativa antecipada opcional\n\n### Fase NF-2 · Validação automática\n- Integração com `parse-nf-pdf` (existente)\n- Validação cadastral (nome, CNPJ vs contrato)\n- Validação de valor "contrato" (só a parte contratual é comparada)\n- Inconsistência → tarefa volta pro PJ com status `precisa_correcao`\n\n### Fase NF-3 · Aprovação RH + envio financeiro\n- Tarefa de aprovação pro RH\n- Email automático pro responsável pelo pagamento (parametrizável)\n- Fim do fluxo controlado pelo Uauuu — confirmação de pagamento fica pro futuro\n\n### Fase NF-4 · Governança + KPIs\n- Log fiscal dedicado (LGPD — Dra. Renata)\n- Mecanismo de disputa (Thiago)\n- KPIs expostos no processo (Fetely em Números)\n\n---\n\n## Classificação de valores (DRE)\n\nCada NF pode ter múltiplas classificações:\n- **contrato** — mensalidade do contrato PJ (entra na Folha real da Fetely)\n- **extra_projeto** — serviço adicional contratado (despesa variável)\n- **reembolso** — despesas reembolsáveis (despesa variável)\n- **ajuste_retroativo** — correção de período anterior (ajuste contábil)\n\n**Justificativa obrigatória** para categorias que não sejam `contrato`. Validação automática compara apenas a parte `contrato` com o valor do contrato PJ.\n\n---\n\n## KPIs candidatos (para Fetely em Números)\n\n- Tempo médio ciclo: emissão → enviada_pagamento\n- Taxa de aprovação 1ª tentativa (sem volta pro PJ)\n- Taxa de intervenção manual do RH\n- Volume de NF inconsistente por prestador (identifica quem precisa de ajuda)\n- Aderência ao prazo de emissão\n- **Folha real contratual** (Σ valores categoria=contrato) — indicador previsível\n- **Despesa variável PJ** (Σ valores extras/reembolso) — indicador de gestão\n- % de NFs com extras (qualidade do planejamento contratual)\n\n---\n\n## Conexões com outros processos\n\n- **Espelho:** `fechamento_folha_clt` (a mapear)\n- **Irmão:** `reembolso_despesas` (PJ + CLT, REEMB-01 no roadmap)\n- **Atividade gerada em:** Minhas Tarefas (transversal SNCF)\n- **Alimenta:** Pagamentos PJ (via status `enviada_pagamento`)\n\n---\n\n## Boards consultados\n\n- **Dr. Marcos Teixeira (Trabalhista):** comunicação via portal/email corporativo está OK desde que contrato preveja; tom de lembrete não pode virar pressão; prazo perdido não é punição, é exceção a tratar\n- **Dra. Ana Cláudia Ferreira (Tributário):** validação cadastral + valor é camada 1; validação fiscal (CNAE, retenções) é camada 2 — começar simples, evoluir com tabela de regras\n- **Dra. Renata Souza (LGPD):** log fiscal dedicado (não misturar com email_send_log); retenção perpétua de NF paga\n- **Ricardo Mendes (Ops):** trilha de auditoria obrigatória em cada mudança de status; SLA por etapa; escape manual sempre disponível\n- **Beatriz Lemos (UX):** copy humano nos emails/tarefas; portal do PJ com timeline visual\n- **Thiago Serrano (Performance/LGPD):** KPIs desde o início; mecanismo formal de disputa\n\n---\n\n## Histórico de versões\n\n- **v0 (19/04/2026):** Rascunho inicial. Schema + parametrização cadastrados (Fase NF-0.A). Tela e fluxos pendentes.';

  INSERT INTO public.processos (codigo, nome, descricao, narrativa, area_negocio_id, natureza_valor, status_valor, sensivel)
  VALUES (
    'emissao_nf_pj',
    'Emissão de NF PJ (Ciclo Mensal)',
    'Ciclo mensal de emissão, validação, aprovação e envio para pagamento de Nota Fiscal de colaboradores PJ. Espelho PJ do fechamento de folha CLT.',
    v_narrativa,
    v_area_adm,
    'operacional',
    'em_construcao',
    false
  )
  ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_proc_id;

  IF v_proc_id IS NOT NULL THEN
    IF v_area_adm IS NOT NULL THEN
      INSERT INTO public.processos_tags_areas(processo_id, area_id) VALUES (v_proc_id, v_area_adm) ON CONFLICT DO NOTHING;
    END IF;
    IF v_depto_rh IS NOT NULL THEN
      INSERT INTO public.processos_tags_departamentos(processo_id, departamento_id) VALUES (v_proc_id, v_depto_rh) ON CONFLICT DO NOTHING;
    END IF;
    IF v_depto_fin IS NOT NULL THEN
      INSERT INTO public.processos_tags_departamentos(processo_id, departamento_id) VALUES (v_proc_id, v_depto_fin) ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO public.processos_tags_tipos_colaborador(processo_id, tipo) 
    VALUES (v_proc_id, 'pj') ON CONFLICT DO NOTHING;

    INSERT INTO public.processos_versoes (
      processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot,
      natureza_snapshot, motivo_alteracao
    )
    VALUES (
      v_proc_id, 0, 'Emissão de NF PJ (Ciclo Mensal)',
      'Ciclo mensal de remuneração PJ — rascunho',
      v_narrativa, 'operacional',
      'Versão 0 (rascunho) — escopo completo desenhado em 19/04/2026. Schema + parametrização prontos. Fluxo operacional e diagrama serão adicionados na Fase NF-1 quando tela + tarefa de emissão forem construídas. Primeira aplicação do padrão "código e processo nascem juntos" da Metodologia Uauuu.'
    );

    UPDATE public.processos SET versao_atual = 0 WHERE id = v_proc_id;
  END IF;
END $$;