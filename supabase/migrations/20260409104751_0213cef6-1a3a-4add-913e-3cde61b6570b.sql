CREATE POLICY "Admin HR can read email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor_rh'::app_role)
  OR public.has_role(auth.uid(), 'financeiro'::app_role)
);