-- ============================================================
-- Fase NF-3 + NF-4 · Aprovação RH + email financeiro + governança
-- ============================================================

-- ═══ 1. Tabela de log fiscal dedicado (LGPD — Dra. Renata) ═══

CREATE TABLE IF NOT EXISTS public.nf_pj_log_fiscal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais_pj(id) ON DELETE CASCADE,
  
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN (
    'submetida', 'validada_automatica', 'rejeitada_automatica',
    'aprovada_rh', 'enviada_pagamento', 'reaberta', 'disputada',
    'cancelada', 'email_enviado_financeiro', 'email_enviado_pj'
  )),
  
  ator_user_id UUID REFERENCES auth.users(id),
  ator_papel TEXT,
  
  detalhes JSONB DEFAULT '{}'::JSONB,
  email_destinatario TEXT,
  hash_arquivo TEXT,
  
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nf_log_fiscal_nota ON public.nf_pj_log_fiscal(nota_fiscal_id, registrado_em DESC);
CREATE INDEX IF NOT EXISTS idx_nf_log_fiscal_evento ON public.nf_pj_log_fiscal(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_nf_log_fiscal_ator ON public.nf_pj_log_fiscal(ator_user_id);

COMMENT ON TABLE public.nf_pj_log_fiscal IS 
  'Log fiscal dedicado de eventos em NF PJ. Separado de audit_log generico e email_send_log. Atende requisito LGPD/fiscal de rastreabilidade perpetua. Nunca deletar — so inativar nota.';

ALTER TABLE public.nf_pj_log_fiscal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nf_log_fiscal_read_self_pj" ON public.nf_pj_log_fiscal
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notas_fiscais_pj nf
      JOIN public.contratos_pj cpj ON cpj.id = nf.contrato_id
      WHERE nf.id = nota_fiscal_id
        AND cpj.user_id = auth.uid()
    )
  );

CREATE POLICY "nf_log_fiscal_read_admin" ON public.nf_pj_log_fiscal
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_rh'::app_role)
    OR has_role(auth.uid(), 'financeiro'::app_role)
  );

CREATE POLICY "nf_log_fiscal_insert_admin" ON public.nf_pj_log_fiscal
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_rh'::app_role)
    OR has_role(auth.uid(), 'financeiro'::app_role)
  );

-- ═══ 2. Função helper para log fiscal ═══

CREATE OR REPLACE FUNCTION public.registrar_log_fiscal_nf(
  _nota_id UUID,
  _tipo_evento TEXT,
  _detalhes JSONB DEFAULT '{}'::JSONB,
  _email_destinatario TEXT DEFAULT NULL,
  _ator_papel TEXT DEFAULT 'sistema'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.nf_pj_log_fiscal (
    nota_fiscal_id, tipo_evento, detalhes,
    email_destinatario, ator_user_id, ator_papel
  ) VALUES (
    _nota_id, _tipo_evento, _detalhes,
    _email_destinatario, auth.uid(), _ator_papel
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END $$;

COMMENT ON FUNCTION public.registrar_log_fiscal_nf IS 
  'Helper para registrar evento no log fiscal de NF PJ. Usar em triggers e funcoes de aprovacao.';

-- ═══ 3. Função para aprovar NF ═══

CREATE OR REPLACE FUNCTION public.aprovar_nf_pj(
  _nota_id UUID,
  _observacao_rh TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nota RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) 
          OR has_role(auth.uid(), 'admin_rh'::app_role)
          OR has_role(auth.uid(), 'gestor_rh'::app_role)) THEN
    RETURN jsonb_build_object('erro', 'Sem permissao para aprovar NF');
  END IF;
  
  SELECT * INTO v_nota FROM public.notas_fiscais_pj WHERE id = _nota_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Nota nao encontrada');
  END IF;
  
  IF v_nota.status != 'aguardando_aprovacao' THEN
    RETURN jsonb_build_object('erro', 'NF precisa estar em aguardando_aprovacao para ser aprovada. Status atual: ' || v_nota.status);
  END IF;
  
  UPDATE public.notas_fiscais_pj
  SET status = 'aprovada',
      observacoes = COALESCE(observacoes, '') || 
        E'\n[Aprovada por ' || auth.uid()::TEXT || ' em ' || now()::TEXT || 
        CASE WHEN _observacao_rh IS NOT NULL THEN ' · ' || _observacao_rh ELSE '' END || ']'
  WHERE id = _nota_id;
  
  PERFORM public.registrar_log_fiscal_nf(
    _nota_id, 'aprovada_rh',
    jsonb_build_object('observacao', _observacao_rh),
    NULL, 'admin_rh'
  );
  
  UPDATE public.sncf_tarefas
  SET status = 'concluida',
      concluida_em = now(),
      concluida_por = auth.uid(),
      evidencia_texto = 'NF aprovada. ' || COALESCE(_observacao_rh, '')
  WHERE tipo_processo = 'aprovacao_nf'
    AND processo_id = _nota_id
    AND status NOT IN ('concluida', 'cancelada');
  
  RETURN jsonb_build_object('sucesso', true, 'nota_id', _nota_id);
END $$;

COMMENT ON FUNCTION public.aprovar_nf_pj IS 
  'Aprova uma NF PJ. Atualiza status, registra log fiscal, fecha tarefa de aprovacao.';

-- ═══ 4. Função para rejeitar NF na aprovação ═══

CREATE OR REPLACE FUNCTION public.rejeitar_nf_pj(
  _nota_id UUID,
  _motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nota RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) 
          OR has_role(auth.uid(), 'admin_rh'::app_role)
          OR has_role(auth.uid(), 'gestor_rh'::app_role)) THEN
    RETURN jsonb_build_object('erro', 'Sem permissao');
  END IF;
  
  IF _motivo IS NULL OR LENGTH(TRIM(_motivo)) < 10 THEN
    RETURN jsonb_build_object('erro', 'Motivo obrigatorio, minimo 10 caracteres');
  END IF;
  
  SELECT * INTO v_nota FROM public.notas_fiscais_pj WHERE id = _nota_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Nota nao encontrada');
  END IF;
  
  UPDATE public.notas_fiscais_pj
  SET status = 'precisa_correcao',
      observacoes = COALESCE(observacoes, '') || 
        E'\n[Rejeitada na aprovacao por ' || auth.uid()::TEXT || ': ' || _motivo || ']'
  WHERE id = _nota_id;
  
  PERFORM public.registrar_log_fiscal_nf(
    _nota_id, 'rejeitada_automatica',
    jsonb_build_object('motivo', _motivo, 'rejeitada_por', 'rh'),
    NULL, 'admin_rh'
  );
  
  UPDATE public.sncf_tarefas
  SET status = 'cancelada',
      concluida_em = now(),
      concluida_por = auth.uid(),
      evidencia_texto = 'NF rejeitada: ' || _motivo
  WHERE tipo_processo = 'aprovacao_nf'
    AND processo_id = _nota_id
    AND status NOT IN ('concluida', 'cancelada');
  
  PERFORM public.criar_tarefa_correcao_nf_pj(
    _nota_id, 
    jsonb_build_array(jsonb_build_object('campo', 'aprovacao', 'mensagem', _motivo))
  );
  
  RETURN jsonb_build_object('sucesso', true);
END $$;

COMMENT ON FUNCTION public.rejeitar_nf_pj IS 
  'RH rejeita NF na fase de aprovacao. Motivo obrigatorio. Cria tarefa de correcao pro PJ.';

-- ═══ 5. Função para marcar como enviada pra pagamento ═══

CREATE OR REPLACE FUNCTION public.marcar_nf_enviada_pagamento(
  _nota_id UUID,
  _email_destinatario TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nota RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'super_admin'::app_role) 
          OR has_role(auth.uid(), 'admin_rh'::app_role)
          OR has_role(auth.uid(), 'gestor_rh'::app_role)) THEN
    RETURN jsonb_build_object('erro', 'Sem permissao');
  END IF;
  
  SELECT * INTO v_nota FROM public.notas_fiscais_pj WHERE id = _nota_id;
  
  IF NOT FOUND THEN RETURN jsonb_build_object('erro', 'Nota nao encontrada'); END IF;
  
  IF v_nota.status != 'aprovada' THEN
    RETURN jsonb_build_object('erro', 'NF precisa estar aprovada para marcar como enviada. Status atual: ' || v_nota.status);
  END IF;
  
  UPDATE public.notas_fiscais_pj
  SET status = 'enviada_pagamento',
      observacoes = COALESCE(observacoes, '') || 
        E'\n[Email enviado para ' || _email_destinatario || ' em ' || now()::TEXT || ']'
  WHERE id = _nota_id;
  
  PERFORM public.registrar_log_fiscal_nf(
    _nota_id, 'email_enviado_financeiro',
    jsonb_build_object('destinatario', _email_destinatario),
    _email_destinatario, 'admin_rh'
  );
  
  PERFORM public.registrar_log_fiscal_nf(
    _nota_id, 'enviada_pagamento',
    '{}'::JSONB, NULL, 'sistema'
  );
  
  RETURN jsonb_build_object('sucesso', true);
END $$;

-- ═══ 6. Função para reabrir NF (disputa) ═══

CREATE OR REPLACE FUNCTION public.reabrir_nf_pj(
  _nota_id UUID,
  _motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nota RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN jsonb_build_object('erro', 'Apenas super admin pode reabrir NF');
  END IF;
  
  IF _motivo IS NULL OR LENGTH(TRIM(_motivo)) < 10 THEN
    RETURN jsonb_build_object('erro', 'Motivo obrigatorio, minimo 10 caracteres');
  END IF;
  
  SELECT * INTO v_nota FROM public.notas_fiscais_pj WHERE id = _nota_id;
  
  IF NOT FOUND THEN RETURN jsonb_build_object('erro', 'Nota nao encontrada'); END IF;
  
  UPDATE public.notas_fiscais_pj
  SET status = 'em_disputa',
      observacoes = COALESCE(observacoes, '') || 
        E'\n[Reaberta por ' || auth.uid()::TEXT || ': ' || _motivo || ']'
  WHERE id = _nota_id;
  
  PERFORM public.registrar_log_fiscal_nf(
    _nota_id, 'reaberta',
    jsonb_build_object('motivo', _motivo),
    NULL, 'super_admin'
  );
  
  RETURN jsonb_build_object('sucesso', true);
END $$;

COMMENT ON FUNCTION public.reabrir_nf_pj IS 
  'Mecanismo de disputa: super admin reabre NF para disputa/revisao.';

-- ═══ 7. View de KPIs NF PJ ═══

CREATE OR REPLACE VIEW public.kpis_nf_pj_mensal AS
SELECT 
  TO_CHAR(DATE_TRUNC('month', nf.created_at), 'YYYY-MM') AS mes_submissao,
  COUNT(*) AS total_submetidas,
  COUNT(*) FILTER (WHERE nf.status IN ('aprovada', 'enviada_pagamento', 'paga')) AS total_aprovadas,
  COUNT(*) FILTER (WHERE nf.status = 'precisa_correcao') AS total_rejeitadas,
  COUNT(*) FILTER (WHERE nf.status = 'em_disputa') AS total_em_disputa,
  AVG(nf.valor) AS valor_medio,
  COALESCE(SUM(
    (SELECT SUM(valor) FROM public.nf_pj_classificacoes 
     WHERE nota_fiscal_id = nf.id AND categoria_valor = 'contrato')
  ), 0) AS folha_contratual,
  COALESCE(SUM(
    (SELECT SUM(valor) FROM public.nf_pj_classificacoes 
     WHERE nota_fiscal_id = nf.id AND categoria_valor != 'contrato')
  ), 0) AS despesa_variavel,
  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE nf.id NOT IN (
        SELECT nota_fiscal_id FROM public.nf_pj_log_fiscal 
        WHERE tipo_evento = 'rejeitada_automatica'
      )
    ) / NULLIF(COUNT(*), 0), 
    2
  ) AS taxa_aprovacao_1a_tentativa_pct
FROM public.notas_fiscais_pj nf
GROUP BY DATE_TRUNC('month', nf.created_at)
ORDER BY mes_submissao DESC;

GRANT SELECT ON public.kpis_nf_pj_mensal TO authenticated;

COMMENT ON VIEW public.kpis_nf_pj_mensal IS 
  'KPIs agregados mensais do fluxo NF PJ. Base para Fetely em Numeros.';

-- ═══ 8. Evoluir processo emissao_nf_pj para versão 3 (FINAL) ═══

DO $$
DECLARE
  v_proc_id UUID := (SELECT id FROM public.processos WHERE codigo = 'emissao_nf_pj');
  v_narrativa_v3 TEXT;
  v_diagrama_v3 TEXT;
BEGIN
  IF v_proc_id IS NULL THEN RETURN; END IF;

  v_narrativa_v3 := E'# Emissão de NF PJ — Ciclo Mensal Completo\n\n> **Versão 3 · 20/04/2026** — Módulo NF PJ completo: emissão → validação → aprovação → envio financeiro → log fiscal → KPIs.\n> **Processo espelho:** `fechamento_folha_clt` (CLT) — a mapear.\n\nCiclo mensal **completo** de emissão e processamento de Nota Fiscal por colaboradores PJ. Do cron automático até o envio para pagamento — tudo orquestrado pelo portal, rastreado no log fiscal dedicado.\n\n---\n\n## Fluxo completo (v3)\n\n1. **Dia 25:** cron cria tarefa "Emitir NF"\n2. **PJ submete** via `/minhas-notas` (upload + classificação)\n3. **Trigger valida** cadastral + valor do contrato\n4. **Se OK** → tarefa aprovacao_nf pro RH\n5. **Se falha** → tarefa correcao_nf pro PJ\n6. **RH aprova** via tarefa em `/tarefas` (dialog especial com resumo + valores + classificação)\n7. **Sistema envia email** ao responsável pelo pagamento (parametrizável) com cópia pro RH\n8. **PJ recebe notificação** na tarefa (não email) — status atualizado para `enviada_pagamento`\n9. **FIM do fluxo Uauuu** — retorno de pagamento fica pro futuro\n\n---\n\n## Governança ativa\n\n### Log fiscal dedicado (Dra. Renata)\nTabela `nf_pj_log_fiscal` — registra todo evento:\n- submetida, validada, rejeitada, aprovada, enviada, disputada, reaberta\n- email_enviado_financeiro, email_enviado_pj\n- Inclui hash do arquivo quando aplicável\n- **Retenção perpétua** — nunca deletar, só inativar\n\n### Mecanismo de disputa (Thiago Serrano)\nFunção `public.reabrir_nf_pj(nota_id, motivo)`:\n- Só super_admin pode reabrir\n- Motivo obrigatório (mín 10 caracteres)\n- Status vira `em_disputa`\n- Registra no log fiscal\n\n### KPIs expostos\nView `public.kpis_nf_pj_mensal`:\n- Total submetidas / aprovadas / rejeitadas / em disputa\n- Valor médio (ticket)\n- **Folha contratual** (Σ categoria=contrato) — previsibilidade\n- **Despesa variável** (Σ categoria≠contrato) — controle\n- Taxa de aprovação 1ª tentativa\n\n---\n\n## Quem faz o quê (RACI final)\n\n- **R (Emissão):** Colaborador PJ\n- **R (Aprovação):** Admin RH / Gestor RH\n- **A:** Super Admin (reabre em disputa)\n- **C:** Board Jurídico (compliance fiscal futuro), Thiago (KPIs)\n- **I:** Responsável pelo pagamento (recebe email), gestor direto do PJ\n\n---\n\n## Componentes entregues (módulo completo)\n\n- ✅ Fase NF-0.A — Schema conceitual\n- ✅ Fase NF-0.B — Cadastro manual emergencial\n- ✅ Fase NF-1.A — Cron + tarefas automáticas\n- ✅ Fase NF-1.B — Portal PJ (/minhas-notas + submit)\n- ✅ Fase NF-2 — Validação automática + roteamento\n- ✅ Fase NF-3 — Aprovação RH + email financeiro\n- ✅ Fase NF-4 — Log fiscal + disputa + KPIs\n\n---\n\n## KPIs candidatos ativos\n\n- Ciclo emissão → enviada_pagamento\n- Folha real contratual (Σ categoria=contrato)\n- Despesa variável PJ (Σ extras)\n- Taxa aprovação 1ª tentativa\n- Volume NFs em disputa\n- Aderência ao prazo de emissão\n\n---\n\n## Futuro não escopado neste módulo\n\n- **Pagamento confirmado** — retorno manual hoje (responsabilidade do PJ checar)\n- **Validação fiscal profunda** — CNAE, retenções automáticas, XML NFSe\n- **Processo irmão Reembolso** (REEMB-01 no roadmap)\n- **Prestador pontual** — categoria_pj=prestador_servico, processo próprio\n\n---\n\n## Histórico de versões\n\n- **v0 (19/04/2026):** Rascunho (Fase NF-0.A)\n- **v1 (19/04/2026):** Cron ativo (Fase NF-1.A)\n- **v2 (20/04/2026):** Validação automática (Fase NF-2)\n- **v3 (20/04/2026):** Módulo completo — aprovação RH + email financeiro + governança (NF-3 + NF-4)';

  v_diagrama_v3 := E'flowchart TB\n    Cron([Cron dia 25]) --> Tarefa[Tarefa emissao_nf]\n    Tarefa --> PJ[PJ em /tarefas]\n    PJ --> Portal[Submete /minhas-notas]\n    Portal --> NF[NF aguardando_validacao]\n    NF --> Trigger{Trigger validar_nf_pj}\n    Trigger -- OK --> AprovR[status=aguardando_aprovacao]\n    AprovR --> TarRH[Tarefa aprovacao_nf pro admin_rh]\n    Trigger -- Falha --> Corr[status=precisa_correcao]\n    Corr --> TarPJ[Tarefa correcao_nf volta pro PJ]\n    TarPJ --> Portal\n    TarRH --> RH{RH decide}\n    RH -- Aprova --> Apr[aprovar_nf_pj status=aprovada]\n    RH -- Rejeita --> Rej[rejeitar_nf_pj volta pro PJ]\n    Rej --> Corr\n    Apr --> Email[Email pro responsavel pagamento]\n    Email --> Enviada[marcar_nf_enviada_pagamento status=enviada_pagamento]\n    Enviada --> FimUauuu([Fim do fluxo Uauuu])\n    Apr -.log fiscal.-> Log[(nf_pj_log_fiscal)]\n    Email -.log fiscal.-> Log\n    Enviada -.log fiscal.-> Log\n    Enviada -.disputa.-> Super[Super admin reabrir_nf_pj]\n    Super --> Disputa[status=em_disputa]\n    classDef auto fill:#4FC3D8,color:#1a3d2b,stroke:#1a3d2b\n    classDef humano fill:#F4A7B9,color:#1a3d2b,stroke:#8B1A2F\n    classDef final fill:#1a3d2b,color:#fff,stroke:#1a3d2b\n    class Cron,Tarefa,NF,Trigger,AprovR,Corr,TarRH,TarPJ,Apr,Rej,Email,Enviada auto\n    class PJ,Portal,RH,Super humano\n    class FimUauuu,Log,Disputa final';

  INSERT INTO public.processos_versoes (
    processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot,
    natureza_snapshot, diagrama_snapshot, motivo_alteracao
  )
  VALUES (
    v_proc_id, 3, 'Emissão de NF PJ (Ciclo Mensal) v3 — COMPLETO',
    'Módulo NF PJ completo',
    v_narrativa_v3, 'operacional', v_diagrama_v3,
    'Versão 3 (FINAL do escopo atual) — Fases NF-3 e NF-4 aplicadas. Aprovação RH + email financeiro + log fiscal + KPIs + mecanismo de disputa. Módulo completo, pronto para operar.'
  );

  UPDATE public.processos 
  SET versao_atual = 3,
      narrativa = v_narrativa_v3,
      diagrama_mermaid = v_diagrama_v3,
      versao_vigente_em = now()
  WHERE id = v_proc_id;
END $$;