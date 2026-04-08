
-- Notas Fiscais PJ
CREATE TABLE public.notas_fiscais_pj (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos_pj(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  serie TEXT,
  valor NUMERIC NOT NULL,
  data_emissao DATE NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  competencia TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notas_fiscais_pj ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin and HR can manage notas_fiscais_pj"
  ON public.notas_fiscais_pj FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role));

CREATE POLICY "Financeiro can manage notas_fiscais_pj"
  ON public.notas_fiscais_pj FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Gestor direto can view notas_fiscais_pj"
  ON public.notas_fiscais_pj FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor_direto'::app_role));

CREATE TRIGGER update_notas_fiscais_pj_updated_at
  BEFORE UPDATE ON public.notas_fiscais_pj
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pagamentos PJ
CREATE TABLE public.pagamentos_pj (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos_pj(id) ON DELETE CASCADE,
  nota_fiscal_id UUID REFERENCES public.notas_fiscais_pj(id) ON DELETE SET NULL,
  valor NUMERIC NOT NULL,
  data_pagamento DATE,
  data_prevista DATE NOT NULL,
  competencia TEXT NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'transferencia',
  comprovante_url TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamentos_pj ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin and HR can manage pagamentos_pj"
  ON public.pagamentos_pj FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role));

CREATE POLICY "Financeiro can manage pagamentos_pj"
  ON public.pagamentos_pj FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Gestor direto can view pagamentos_pj"
  ON public.pagamentos_pj FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor_direto'::app_role));

CREATE TRIGGER update_pagamentos_pj_updated_at
  BEFORE UPDATE ON public.pagamentos_pj
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
