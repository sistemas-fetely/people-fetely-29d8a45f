-- Tabela principal de agrupamento
CREATE TABLE IF NOT EXISTS public.conciliacoes_agrupadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id uuid NOT NULL REFERENCES public.movimentacoes_bancarias(id) ON DELETE CASCADE,
  soma_esperada numeric(14,2) NOT NULL,
  soma_real numeric(14,2) NOT NULL,
  diferenca_percentual numeric(8,4) NOT NULL DEFAULT 0,
  observacao text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conciliacoes_agrupadas_mov 
  ON public.conciliacoes_agrupadas(movimentacao_id);

CREATE TABLE IF NOT EXISTS public.conciliacoes_agrupadas_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agrupamento_id uuid NOT NULL REFERENCES public.conciliacoes_agrupadas(id) ON DELETE CASCADE,
  conta_pagar_id uuid NOT NULL REFERENCES public.contas_pagar_receber(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agrupamento_id, conta_pagar_id)
);

CREATE INDEX IF NOT EXISTS idx_conciliacoes_agrupadas_itens_agrup 
  ON public.conciliacoes_agrupadas_itens(agrupamento_id);
CREATE INDEX IF NOT EXISTS idx_conciliacoes_agrupadas_itens_conta 
  ON public.conciliacoes_agrupadas_itens(conta_pagar_id);

ALTER TABLE public.conciliacoes_agrupadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conciliacoes_agrupadas_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read agrupamentos"
  ON public.conciliacoes_agrupadas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "auth insert agrupamentos"
  ON public.conciliacoes_agrupadas FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "admin delete agrupamentos"
  ON public.conciliacoes_agrupadas FOR DELETE
  TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role) 
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
  );

CREATE POLICY "auth read agrupamentos itens"
  ON public.conciliacoes_agrupadas_itens FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "auth insert agrupamentos itens"
  ON public.conciliacoes_agrupadas_itens FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "admin delete agrupamentos itens"
  ON public.conciliacoes_agrupadas_itens FOR DELETE
  TO authenticated USING (
    public.has_role(auth.uid(), 'super_admin'::app_role) 
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
  );