-- Habilita RLS nas tabelas de backup
ALTER TABLE public.backup_contas_pagar_receber_20260426 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_movimentacoes_bancarias_20260426 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_parceiros_comerciais_20260426 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_contas_pagar_itens_20260426 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_contas_pagar_historico_20260426 ENABLE ROW LEVEL SECURITY;

-- Apenas super_admin consegue ler (consulta histórica)
CREATE POLICY "super_admin_select_backup_cpr_20260426"
ON public.backup_contas_pagar_receber_20260426
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admin_select_backup_mov_20260426"
ON public.backup_movimentacoes_bancarias_20260426
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admin_select_backup_parc_20260426"
ON public.backup_parceiros_comerciais_20260426
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admin_select_backup_itens_20260426"
ON public.backup_contas_pagar_itens_20260426
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admin_select_backup_hist_20260426"
ON public.backup_contas_pagar_historico_20260426
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));