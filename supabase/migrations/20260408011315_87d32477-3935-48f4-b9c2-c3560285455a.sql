
-- Add corporate email to colaboradores_clt
ALTER TABLE public.colaboradores_clt ADD COLUMN IF NOT EXISTS email_corporativo text;
ALTER TABLE public.colaboradores_clt ADD COLUMN IF NOT EXISTS ramal text;
ALTER TABLE public.colaboradores_clt ADD COLUMN IF NOT EXISTS data_integracao date;

-- System access tracking
CREATE TABLE public.colaborador_acessos_sistemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores_clt(id) ON DELETE CASCADE,
  sistema text NOT NULL,
  tem_acesso boolean NOT NULL DEFAULT false,
  usuario text,
  observacoes text,
  data_concessao date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.colaborador_acessos_sistemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin and HR can manage acessos" ON public.colaborador_acessos_sistemas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role));

CREATE POLICY "Colaborador can view own acessos" ON public.colaborador_acessos_sistemas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM colaboradores_clt c WHERE c.id = colaborador_acessos_sistemas.colaborador_id AND c.user_id = auth.uid()));

CREATE POLICY "Gestor direto can view acessos" ON public.colaborador_acessos_sistemas
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor_direto'::app_role));

-- Equipment tracking
CREATE TABLE public.colaborador_equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores_clt(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  marca text,
  modelo text,
  numero_patrimonio text,
  numero_serie text,
  data_entrega date,
  data_devolucao date,
  estado text NOT NULL DEFAULT 'novo',
  termo_responsabilidade_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.colaborador_equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin and HR can manage equipamentos" ON public.colaborador_equipamentos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role));

CREATE POLICY "Colaborador can view own equipamentos" ON public.colaborador_equipamentos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM colaboradores_clt c WHERE c.id = colaborador_equipamentos.colaborador_id AND c.user_id = auth.uid()));

CREATE POLICY "Gestor direto can view equipamentos" ON public.colaborador_equipamentos
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor_direto'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_acessos_updated_at BEFORE UPDATE ON public.colaborador_acessos_sistemas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON public.colaborador_equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
