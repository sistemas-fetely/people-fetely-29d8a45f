-- Fix 1: Drop overly permissive public SELECT on convites_cadastro
-- The app uses get_convite_by_token RPC for public access, so this policy is unnecessary
DROP POLICY IF EXISTS "Public can read convite by token" ON public.convites_cadastro;

-- Fix 2: Tighten the public UPDATE policy to exclude 'preenchido' status
DROP POLICY IF EXISTS "Public can update pendente or email_enviado convite" ON public.convites_cadastro;
CREATE POLICY "Public can update pendente or email_enviado convite"
  ON public.convites_cadastro
  FOR UPDATE
  TO public
  USING (
    status IN ('pendente', 'email_enviado')
    AND expira_em > now()
  )
  WITH CHECK (
    status IN ('pendente', 'email_enviado')
    AND expira_em > now()
  );

-- Fix 3: Change notificacoes_rh INSERT from public to authenticated with role check
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notificacoes_rh;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notificacoes_rh
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'gestor_rh'::app_role)
    OR has_role(auth.uid(), 'financeiro'::app_role)
  );