-- ============================================================================
-- MIG-3: DROP tabelas de backup do sprint 24-25/04/2026
-- ============================================================================
-- backup_movimentacoes_bancarias_20260426 e backup_parceiros_comerciais_20260426
-- foram criadas em 26/04/2026 como rede de segurança antes do sprint de refactor:
--   - fornecedores → parceiros_comerciais (20260424215741)
--   - tipo_pagamento em movimentacoes_bancarias (20260425221612)
--   - conciliacoes_agrupadas com CASCADE em movimentacoes (20260425213847)
--
-- 22 dias depois: sistema estável, zero consumers no código, função expirada.
-- Zero referências a .from("backup_*") em src/ (exceto types.ts auto-gerado).
-- ============================================================================

DROP TABLE IF EXISTS public.backup_movimentacoes_bancarias_20260426;
DROP TABLE IF EXISTS public.backup_parceiros_comerciais_20260426;
