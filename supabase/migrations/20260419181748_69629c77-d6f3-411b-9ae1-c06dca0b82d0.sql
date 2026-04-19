DROP POLICY IF EXISTS "processos_sugestoes_update_owner" ON public.processos_sugestoes;

CREATE POLICY "processos_sugestoes_update_owner" ON public.processos_sugestoes
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_rh'::app_role)
    OR EXISTS (SELECT 1 FROM public.processos p WHERE p.id = processos_sugestoes.processo_id AND p.owner_user_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_rh'::app_role)
    OR EXISTS (SELECT 1 FROM public.processos p WHERE p.id = processos_sugestoes.processo_id AND p.owner_user_id = auth.uid())
  );