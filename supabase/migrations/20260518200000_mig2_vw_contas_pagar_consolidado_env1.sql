-- ============================================================================
-- MIG-2: vw_contas_pagar_consolidado + pasta_contrato_id + parcela_grupo_id
-- ============================================================================
-- Estende a view com campos necessários para ENV-1 (agrupamento por contrato).
-- pasta_contrato_id: permite detectar parcelas do mesmo contrato no Dialog de envio.
-- parcela_grupo_id: corrige bug latente onde AcoesInlineConta não passava o campo
--   (view não expunha, query usava *, parcela_grupo_id chegava undefined no Dialog).
-- Doutrinas: #126 (lógica no servidor), MIG-2 (18/05/2026).
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_contas_pagar_consolidado AS
SELECT
  cp.id, cp.descricao, cp.valor, cp.data_vencimento, cp.data_pagamento,
  cp.status, cp.tags, cp.fornecedor_id, cp.parceiro_id, cp.conta_id,
  cp.centro_custo_id, cp.forma_pagamento_id, cp.numero_parcela,
  cp.parcela_atual, cp.meio_pagamento_id,
  mp.codigo = 'fatura_cartao'::text AS eh_cartao,
  mp.codigo AS meio_codigo,
  cp.origem, cp.criado_por, cp.aprovado_em, cp.aprovado_por,
  cp.observacao, cp.comprovante_url, cp.created_at, cp.updated_at,
  ns.id AS nf_stage_id, ns.tipo_documento AS nf_tipo,
  ns.fornecedor_razao_social AS nf_fornecedor,
  ns.nf_numero AS nf_numero_repositorio, ns.valor AS nf_valor,
  cp.movimentacao_bancaria_id,
  mb.conciliado AS mov_conciliada, mb.data_transacao AS mov_data,
  mb.valor AS mov_valor, mb.descricao AS mov_descricao,
  CASE
    WHEN cp.status = 'aguardando_pagamento'::text AND mb.conciliado = true THEN 'pago_conciliado'::text
    WHEN cp.status = 'aguardando_pagamento'::text AND mb.id IS NOT NULL THEN 'em_movimentacao'::text
    ELSE cp.status
  END AS status_efetivo,
  ('doc_pendente'::text IN (SELECT jsonb_array_elements_text(cp.tags))) AS tem_doc_pendente,
  cp.data_vencimento < CURRENT_DATE
    AND (cp.status = ANY (ARRAY['aberto'::text, 'aprovado'::text, 'aguardando_pagamento'::text, 'doc_pendente'::text]))
    AND cp.data_pagamento IS NULL AS atrasada,
  cp.pasta_contrato_id,
  cp.parcela_grupo_id
FROM contas_pagar_receber cp
JOIN meios_pagamento mp ON mp.id = cp.meio_pagamento_id
LEFT JOIN LATERAL (
  SELECT nfs_stage.id, nfs_stage.tipo_documento, nfs_stage.fornecedor_razao_social,
         nfs_stage.nf_numero, nfs_stage.valor
  FROM nfs_stage
  WHERE nfs_stage.conta_pagar_id = cp.id AND nfs_stage.status <> 'descartada'::text
  ORDER BY nfs_stage.nf_data_emissao DESC NULLS LAST, nfs_stage.id
  LIMIT 1
) ns ON true
LEFT JOIN movimentacoes_bancarias mb ON mb.id = cp.movimentacao_bancaria_id;
