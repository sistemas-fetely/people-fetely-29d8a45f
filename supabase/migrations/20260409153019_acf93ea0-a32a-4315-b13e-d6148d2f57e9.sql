
CREATE TABLE public.beneficios_pj (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid NOT NULL REFERENCES public.contratos_pj(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text,
  operadora text,
  numero_cartao text,
  valor_empresa numeric NOT NULL DEFAULT 0,
  valor_desconto numeric NOT NULL DEFAULT 0,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  status text NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.beneficios_pj ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin HR Fin can manage beneficios_pj"
ON public.beneficios_pj FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "PJ user can view own beneficios_pj"
ON public.beneficios_pj FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM contratos_pj c WHERE c.id = beneficios_pj.contrato_id AND c.user_id = auth.uid()));

CREATE POLICY "Gestor direto can view beneficios_pj"
ON public.beneficios_pj FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_direto'::app_role));

CREATE TRIGGER update_beneficios_pj_updated_at
BEFORE UPDATE ON public.beneficios_pj
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
