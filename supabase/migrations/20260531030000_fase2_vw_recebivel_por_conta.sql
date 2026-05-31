-- 🔵 SNCF — FASE 2 PAINEL FINANCEIRO DA CONTA / view de agregação (read-only)
-- Agrega títulos EM ABERTO por cliente (conta_id), com aging calculado da data de vencimento vs hoje.
-- NÃO usa as views legadas (que leem do CPR antigo). Fonte única = titulo_a_receber.
-- Smoke esperado: roda sem erro (criação de view).

BEGIN;

CREATE OR REPLACE VIEW public.vw_recebivel_por_conta AS
WITH abertos AS (
  SELECT
    t.conta_id,
    t.valor_atual,
    (t.data_vencimento_atual < current_date)                     AS vencido,
    GREATEST(0, (current_date - t.data_vencimento_atual))::int   AS dias_atraso
  FROM public.titulo_a_receber t
  WHERE t.status IN (
    'aguardando_pagamento','aguardando_envio_bling','aguardando_emissao_nf',
    'vigente','vigente_parcial','vencido','vencido_suspenso','em_juridico','renegociado'
  )
)
SELECT
  pc.id                                                              AS conta_id,
  pc.razao_social                                                    AS cliente,
  pc.cnpj,
  count(*)                                                           AS qtd_titulos_abertos,
  COALESCE(sum(a.valor_atual), 0)                                    AS total_a_receber,
  COALESCE(sum(a.valor_atual) FILTER (WHERE a.vencido), 0)           AS total_vencido,
  -- faixas de aging (financeiras), calculadas da data
  COALESCE(sum(a.valor_atual) FILTER (WHERE NOT a.vencido), 0)                   AS faixa_a_vencer,
  COALESCE(sum(a.valor_atual) FILTER (WHERE a.dias_atraso BETWEEN 1 AND 15), 0)  AS faixa_1_15,
  COALESCE(sum(a.valor_atual) FILTER (WHERE a.dias_atraso BETWEEN 16 AND 30), 0) AS faixa_16_30,
  COALESCE(sum(a.valor_atual) FILTER (WHERE a.dias_atraso BETWEEN 31 AND 60), 0) AS faixa_31_60,
  COALESCE(sum(a.valor_atual) FILTER (WHERE a.dias_atraso > 60), 0)              AS faixa_60_mais,
  COALESCE(max(a.dias_atraso) FILTER (WHERE a.vencido), 0)           AS dias_atraso_max
FROM public.parceiros_comerciais pc
JOIN abertos a ON a.conta_id = pc.id
GROUP BY pc.id, pc.razao_social, pc.cnpj;

COMMENT ON VIEW public.vw_recebivel_por_conta IS
  'Fase 2 — posição de recebível por cliente (títulos em aberto + aging por faixa, calculado da data). Fonte: titulo_a_receber.';

COMMIT;

-- Conferência opcional (rode pra ver a posição já com os títulos de exemplo):
-- SELECT cliente, total_a_receber, total_vencido, faixa_a_vencer, faixa_1_15, faixa_16_30, faixa_31_60, faixa_60_mais
-- FROM public.vw_recebivel_por_conta ORDER BY total_a_receber DESC;
