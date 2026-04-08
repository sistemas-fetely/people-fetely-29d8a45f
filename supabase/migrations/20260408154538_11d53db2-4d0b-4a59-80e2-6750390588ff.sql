
CREATE TABLE public.beneficios_colaborador (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores_clt(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- vt, vr, va, plano_saude, plano_odontologico, seguro_vida, outros
  descricao text,
  operadora text,
  numero_cartao text,
  valor_empresa numeric NOT NULL DEFAULT 0,
  valor_desconto numeric NOT NULL DEFAULT 0,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  status text NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beneficios_colaborador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin HR Fin can manage beneficios"
ON public.beneficios_colaborador FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Gestor direto can view beneficios"
ON public.beneficios_colaborador FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_direto'::app_role));

CREATE POLICY "Colaborador can view own beneficios"
ON public.beneficios_colaborador FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM colaboradores_clt c WHERE c.id = beneficios_colaborador.colaborador_id AND c.user_id = auth.uid()));

CREATE TRIGGER update_beneficios_updated_at
BEFORE UPDATE ON public.beneficios_colaborador
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
