-- ============================================
-- Parte 1: Agendamento revogação D+30 (P-10)
-- ============================================

-- Remover agendamento antigo se houver (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'revogar_acessos_ex_colaboradores_diario') THEN
    PERFORM cron.unschedule('revogar_acessos_ex_colaboradores_diario');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron.job não acessível: %', SQLERRM;
END $$;

-- Agendar diariamente às 03:00 UTC (00:00 Brasília)
SELECT cron.schedule(
  'revogar_acessos_ex_colaboradores_diario',
  '0 3 * * *',
  $$ SELECT public.revogar_acessos_ex_colaboradores(); $$
);

-- View pra auditoria LGPD (Dra. Renata)
CREATE OR REPLACE VIEW public.revogacoes_acesso_historico AS
SELECT 
  al.id,
  al.acao AS tipo_acao,
  al.tabela,
  al.registro_id AS user_id_revogado,
  al.dados_antes,
  al.dados_depois,
  al.justificativa,
  al.created_at AS criado_em,
  al.user_id AS ator_user_id,
  al.user_nome AS ator_nome
FROM public.audit_log al
WHERE al.acao = 'REVOGACAO_ACESSO_POS_DESLIGAMENTO'
ORDER BY al.created_at DESC;

GRANT SELECT ON public.revogacoes_acesso_historico TO authenticated;

COMMENT ON VIEW public.revogacoes_acesso_historico IS 
  'Histórico de revogações automáticas de acesso pós-desligamento (D+30). Auditoria LGPD.';

-- ============================================
-- Parte 2: Conhecimento — área de negócio (M-BC-01)
-- ============================================

ALTER TABLE public.fala_fetely_conhecimento 
  ADD COLUMN IF NOT EXISTS area_negocio TEXT;

COMMENT ON COLUMN public.fala_fetely_conhecimento.area_negocio IS 
  'Área de negócio aplicável (chave parametros.categoria=area_negocio). Substitui publico_alvo conceitualmente errado.';

-- Migrar: itens marcados "todos" viram NULL (geral). Outros mantêm publico_alvo legado.
UPDATE public.fala_fetely_conhecimento 
SET area_negocio = NULL 
WHERE publico_alvo = 'todos';