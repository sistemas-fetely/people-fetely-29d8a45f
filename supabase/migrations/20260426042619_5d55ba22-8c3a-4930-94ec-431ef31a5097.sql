-- ============================================
-- PARTE 1: BACKUP
-- ============================================
CREATE TABLE IF NOT EXISTS public.backup_contas_pagar_receber_20260426 AS
SELECT * FROM public.contas_pagar_receber;

CREATE TABLE IF NOT EXISTS public.backup_movimentacoes_bancarias_20260426 AS
SELECT * FROM public.movimentacoes_bancarias;

CREATE TABLE IF NOT EXISTS public.backup_parceiros_comerciais_20260426 AS
SELECT * FROM public.parceiros_comerciais;

CREATE TABLE IF NOT EXISTS public.backup_contas_pagar_itens_20260426 AS
SELECT * FROM public.contas_pagar_itens;

CREATE TABLE IF NOT EXISTS public.backup_contas_pagar_historico_20260426 AS
SELECT * FROM public.contas_pagar_historico;

COMMENT ON TABLE public.backup_contas_pagar_receber_20260426 IS
  'Backup criado em 26/04/2026 antes de reset completo do financeiro';
COMMENT ON TABLE public.backup_movimentacoes_bancarias_20260426 IS
  'Backup criado em 26/04/2026 antes de reset completo do financeiro';
COMMENT ON TABLE public.backup_parceiros_comerciais_20260426 IS
  'Backup criado em 26/04/2026 antes de reset completo do financeiro';
COMMENT ON TABLE public.backup_contas_pagar_itens_20260426 IS
  'Backup criado em 26/04/2026 antes de reset completo do financeiro';
COMMENT ON TABLE public.backup_contas_pagar_historico_20260426 IS
  'Backup criado em 26/04/2026 antes de reset completo do financeiro';

-- ============================================
-- PARTE 2: DELETAR DADOS (ordem de FK)
-- ============================================

-- 1) Itens de conciliação agrupada
DELETE FROM public.conciliacoes_agrupadas_itens;

-- 2) Cabeçalho de conciliação agrupada
DELETE FROM public.conciliacoes_agrupadas;

-- 3) Documentos anexados a contas
DELETE FROM public.contas_pagar_documentos;

-- 4) Histórico de contas
DELETE FROM public.contas_pagar_historico;

-- 5) Itens de contas
DELETE FROM public.contas_pagar_itens;

-- 6) Contas a pagar/receber
DELETE FROM public.contas_pagar_receber;

-- 7) Movimentações bancárias
DELETE FROM public.movimentacoes_bancarias;

-- 8) Parceiros comerciais (fornecedores/clientes)
DELETE FROM public.parceiros_comerciais;