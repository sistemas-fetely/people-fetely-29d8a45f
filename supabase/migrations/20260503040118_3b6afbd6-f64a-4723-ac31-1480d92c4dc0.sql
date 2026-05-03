CREATE OR REPLACE FUNCTION public.documentos_envio_agrupados(
  p_estado text DEFAULT 'todos'::text,
  p_periodo_inicio date DEFAULT NULL::date,
  p_periodo_fim date DEFAULT NULL::date,
  p_busca text DEFAULT NULL::text
)
RETURNS TABLE(
  parceiro_id uuid,
  parceiro_razao_social text,
  qtd_contas bigint,
  total_valor numeric,
  mais_antigo_dias integer,
  qtd_canceladas_apos_envio bigint,
  contas_json jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_busca TEXT;
BEGIN
  v_busca := NULLIF(TRIM(COALESCE(p_busca, '')), '');

  RETURN QUERY
  WITH base AS (
    SELECT
      v.*,
      cpr.compromisso_parcelado_id
    FROM public.vw_documentos_envio_estados v
    JOIN public.contas_pagar_receber cpr ON cpr.id = v.conta_id
    WHERE
      (p_estado = 'todos' OR v.estado_envio = p_estado)
      AND (
        p_periodo_inicio IS NULL OR
        COALESCE(v.data_pagamento, v.data_vencimento) >= p_periodo_inicio
      )
      AND (
        p_periodo_fim IS NULL OR
        COALESCE(v.data_pagamento, v.data_vencimento) <= p_periodo_fim
      )
      AND (
        v_busca IS NULL OR
        v.descricao ILIKE '%' || v_busca || '%' OR
        v.parceiro_razao_social ILIKE '%' || v_busca || '%' OR
        v.nf_numero ILIKE '%' || v_busca || '%'
      )
  ),
  eventos AS (
    -- Avulsas (sem compromisso_parcelado_id)
    SELECT
      b.parceiro_id,
      b.parceiro_razao_social,
      'conta_avulsa'::text AS tipo,
      b.conta_id,
      b.descricao,
      b.valor AS valor_evento,
      b.data_vencimento,
      b.data_pagamento,
      b.status_conta,
      b.docs_status,
      b.nf_numero,
      b.estado_envio,
      b.cancelada_apos_envio,
      b.ultima_remessa_id,
      b.ultima_remessa_em,
      b.dias_aguardando,
      b.tem_nf_anexada,
      b.nf_aplicavel,
      b.nf_aplicavel_motivo,
      b.parceiro_cnpj,
      NULL::uuid AS compromisso_id,
      1::int AS qtd_parcelas_grupo,
      0::int AS parcelas_pagas_grupo,
      jsonb_build_array(
        jsonb_build_object(
          'conta_id', b.conta_id,
          'descricao', b.descricao,
          'valor', b.valor,
          'data_vencimento', b.data_vencimento,
          'data_pagamento', b.data_pagamento,
          'status_conta', b.status_conta,
          'docs_status', b.docs_status,
          'tem_nf_anexada', b.tem_nf_anexada,
          'estado_envio', b.estado_envio
        )
      ) AS parcelas_json
    FROM base b
    WHERE b.compromisso_parcelado_id IS NULL

    UNION ALL

    -- Compromissos parcelados (1 entrada por compromisso)
    SELECT
      (ARRAY_AGG(b.parceiro_id))[1] AS parceiro_id,
      (ARRAY_AGG(b.parceiro_razao_social))[1] AS parceiro_razao_social,
      'compromisso'::text AS tipo,
      (ARRAY_AGG(b.conta_id ORDER BY
        CASE WHEN b.status_conta <> 'paga' THEN 0 ELSE 1 END,
        b.data_vencimento ASC
      ))[1] AS conta_id,
      MAX(cp.descricao) AS descricao,
      MAX(cp.valor_total) AS valor_evento,
      MIN(b.data_vencimento) AS data_vencimento,
      NULL::date AS data_pagamento,
      MAX(cp.status) AS status_conta,
      CASE
        WHEN BOOL_OR(COALESCE(b.docs_status, 'pendente') = 'pendente')
         AND BOOL_OR(COALESCE(b.docs_status, 'pendente') = 'ok') THEN 'parcial'
        WHEN BOOL_OR(COALESCE(b.docs_status, 'pendente') = 'pendente') THEN 'pendente'
        ELSE 'ok'
      END AS docs_status,
      MAX(b.nf_numero) AS nf_numero,
      CASE
        WHEN BOOL_OR(b.estado_envio = 'cobrar') THEN 'cobrar'
        WHEN BOOL_OR(b.estado_envio = 'pronto') THEN 'pronto'
        ELSE 'enviado'
      END AS estado_envio,
      BOOL_OR(b.cancelada_apos_envio) AS cancelada_apos_envio,
      (ARRAY_AGG(b.ultima_remessa_id) FILTER (WHERE b.ultima_remessa_id IS NOT NULL))[1] AS ultima_remessa_id,
      MAX(b.ultima_remessa_em) AS ultima_remessa_em,
      MAX(b.dias_aguardando) AS dias_aguardando,
      BOOL_OR(b.tem_nf_anexada) AS tem_nf_anexada,
      BOOL_AND(COALESCE(b.nf_aplicavel, true)) AS nf_aplicavel,
      MAX(b.nf_aplicavel_motivo) AS nf_aplicavel_motivo,
      MAX(b.parceiro_cnpj) AS parceiro_cnpj,
      b.compromisso_parcelado_id AS compromisso_id,
      MAX(cp.qtd_parcelas)::int AS qtd_parcelas_grupo,
      MAX(cp.parcelas_pagas)::int AS parcelas_pagas_grupo,
      jsonb_agg(
        jsonb_build_object(
          'conta_id', b.conta_id,
          'descricao', b.descricao,
          'valor', b.valor,
          'data_vencimento', b.data_vencimento,
          'data_pagamento', b.data_pagamento,
          'status_conta', b.status_conta,
          'docs_status', b.docs_status,
          'tem_nf_anexada', b.tem_nf_anexada,
          'estado_envio', b.estado_envio
        )
        ORDER BY b.data_vencimento ASC
      ) AS parcelas_json
    FROM base b
    LEFT JOIN compromissos_parcelados cp ON cp.id = b.compromisso_parcelado_id
    WHERE b.compromisso_parcelado_id IS NOT NULL
    GROUP BY b.compromisso_parcelado_id
  )
  SELECT
    e.parceiro_id,
    e.parceiro_razao_social,
    COUNT(*)::BIGINT AS qtd_contas,
    COALESCE(SUM(e.valor_evento), 0) AS total_valor,
    COALESCE(MAX(e.dias_aguardando), 0) AS mais_antigo_dias,
    COUNT(*) FILTER (WHERE e.cancelada_apos_envio)::BIGINT AS qtd_canceladas_apos_envio,
    jsonb_agg(
      jsonb_build_object(
        'tipo', e.tipo,
        'conta_id', e.conta_id,
        'compromisso_id', e.compromisso_id,
        'descricao', e.descricao,
        'valor', e.valor_evento,
        'data_vencimento', e.data_vencimento,
        'data_pagamento', e.data_pagamento,
        'status_conta', e.status_conta,
        'docs_status', e.docs_status,
        'nf_numero', e.nf_numero,
        'estado_envio', e.estado_envio,
        'cancelada_apos_envio', e.cancelada_apos_envio,
        'ultima_remessa_id', e.ultima_remessa_id,
        'ultima_remessa_em', e.ultima_remessa_em,
        'dias_aguardando', e.dias_aguardando,
        'tem_nf_anexada', e.tem_nf_anexada,
        'nf_aplicavel', e.nf_aplicavel,
        'nf_aplicavel_motivo', e.nf_aplicavel_motivo,
        'parceiro_cnpj', e.parceiro_cnpj,
        'qtd_parcelas', e.qtd_parcelas_grupo,
        'parcelas_pagas', e.parcelas_pagas_grupo,
        'parcelas', e.parcelas_json
      )
      ORDER BY e.data_pagamento DESC NULLS LAST, e.data_vencimento DESC
    ) AS contas_json
  FROM eventos e
  GROUP BY e.parceiro_id, e.parceiro_razao_social
  ORDER BY total_valor DESC, qtd_contas DESC;
END;
$function$;