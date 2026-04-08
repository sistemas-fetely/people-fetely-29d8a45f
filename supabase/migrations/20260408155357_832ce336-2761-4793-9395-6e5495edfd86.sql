
CREATE TABLE public.movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- promocao, transferencia, alteracao_salarial, alteracao_cargo, mudanca_departamento
  colaborador_id UUID REFERENCES public.colaboradores_clt(id) ON DELETE CASCADE,
  contrato_pj_id UUID REFERENCES public.contratos_pj(id) ON DELETE CASCADE,
  data_efetivacao DATE NOT NULL,
  cargo_anterior TEXT,
  cargo_novo TEXT,
  departamento_anterior TEXT,
  departamento_novo TEXT,
  salario_anterior NUMERIC,
  salario_novo NUMERIC,
  motivo TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_vinculo CHECK (colaborador_id IS NOT NULL OR contrato_pj_id IS NOT NULL)
);

ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

-- Admin, HR, Financeiro full access
CREATE POLICY "Admin HR Fin can manage movimentacoes"
ON public.movimentacoes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

-- Gestor direto can view
CREATE POLICY "Gestor direto can view movimentacoes"
ON public.movimentacoes FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_direto'::app_role));

-- Colaborador can view own
CREATE POLICY "Colaborador can view own movimentacoes"
ON public.movimentacoes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM colaboradores_clt c
  WHERE c.id = movimentacoes.colaborador_id AND c.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_movimentacoes_updated_at
BEFORE UPDATE ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_movimentacoes_colaborador ON public.movimentacoes(colaborador_id);
CREATE INDEX idx_movimentacoes_contrato_pj ON public.movimentacoes(contrato_pj_id);
CREATE INDEX idx_movimentacoes_data ON public.movimentacoes(data_efetivacao DESC);
