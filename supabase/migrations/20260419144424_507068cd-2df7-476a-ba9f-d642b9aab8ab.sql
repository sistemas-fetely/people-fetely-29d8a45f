-- Corrigir view: usar security_invoker para respeitar RLS do usuário consultante
ALTER VIEW public.processos_unificados SET (security_invoker = true);

-- Corrigir policy de update sugestoes: WITH CHECK específico
DROP POLICY IF EXISTS "processos_sugestoes_update_owner" ON public.processos_sugestoes;

CREATE POLICY "processos_sugestoes_update_owner" ON public.processos_sugestoes
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.processos p WHERE p.id = processo_id AND p.owner_user_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.processos p WHERE p.id = processo_id AND p.owner_user_id = auth.uid())
  );