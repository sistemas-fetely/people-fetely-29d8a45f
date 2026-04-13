
-- Add trial period columns to colaboradores_clt
ALTER TABLE public.colaboradores_clt
  ADD COLUMN IF NOT EXISTS fim_periodo_experiencia_1 date,
  ADD COLUMN IF NOT EXISTS fim_periodo_experiencia_2 date;

-- Create alertas_agendados table
CREATE TABLE public.alertas_agendados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text,
  link text,
  data_alerta date NOT NULL,
  user_id uuid,
  colaborador_id uuid REFERENCES public.colaboradores_clt(id) ON DELETE CASCADE,
  contrato_pj_id uuid REFERENCES public.contratos_pj(id) ON DELETE CASCADE,
  convite_id uuid REFERENCES public.convites_cadastro(id) ON DELETE CASCADE,
  executado boolean NOT NULL DEFAULT false,
  executado_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.alertas_agendados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR admins can manage all alertas"
  ON public.alertas_agendados FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'admin_rh'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'admin_rh'::app_role));

CREATE POLICY "Users can view own alertas"
  ON public.alertas_agendados FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Gestor direto can view alertas"
  ON public.alertas_agendados FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor_direto'::app_role));

CREATE INDEX idx_alertas_data ON public.alertas_agendados (data_alerta) WHERE executado = false;

CREATE TRIGGER update_alertas_agendados_updated_at
  BEFORE UPDATE ON public.alertas_agendados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update convites_cadastro public update policy to allow devolvido status re-editing
DROP POLICY IF EXISTS "Public can update pendente or email_enviado convite" ON public.convites_cadastro;
CREATE POLICY "Public can update pendente or email_enviado or devolvido convite"
  ON public.convites_cadastro FOR UPDATE TO public
  USING (status = ANY (ARRAY['pendente', 'email_enviado', 'devolvido']) AND expira_em > now())
  WITH CHECK (status = ANY (ARRAY['pendente', 'email_enviado', 'devolvido']) AND expira_em > now());
