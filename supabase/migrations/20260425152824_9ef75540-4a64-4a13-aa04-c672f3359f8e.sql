-- 1.1 Campos de workflow
ALTER TABLE public.contas_pagar_receber
  ADD COLUMN IF NOT EXISTS enviado_pagamento_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enviado_pagamento_por UUID,
  ADD COLUMN IF NOT EXISTS email_pagamento_enviado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dados_pagamento_fornecedor JSONB,
  ADD COLUMN IF NOT EXISTS tarefa_id UUID,
  ADD COLUMN IF NOT EXISTS sla_aprovacao_dias INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS sla_pagamento_dias INT DEFAULT 0;

-- 1.2 Histórico de status
CREATE TABLE IF NOT EXISTS public.contas_pagar_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.contas_pagar_receber(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  observacao TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_historico_conta ON public.contas_pagar_historico(conta_id);

ALTER TABLE public.contas_pagar_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View cp historico" ON public.contas_pagar_historico;
CREATE POLICY "View cp historico" ON public.contas_pagar_historico
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insert cp historico" ON public.contas_pagar_historico;
CREATE POLICY "Insert cp historico" ON public.contas_pagar_historico
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Manage cp historico" ON public.contas_pagar_historico;
CREATE POLICY "Manage cp historico" ON public.contas_pagar_historico
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'super_admin'));

-- 1.3 Config financeiro externo
CREATE TABLE IF NOT EXISTS public.config_financeiro_externo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.config_financeiro_externo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View config fin" ON public.config_financeiro_externo;
CREATE POLICY "View config fin" ON public.config_financeiro_externo
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Manage config fin" ON public.config_financeiro_externo;
CREATE POLICY "Manage config fin" ON public.config_financeiro_externo
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'super_admin'));

-- Função para atualizar contas atrasadas
CREATE OR REPLACE FUNCTION public.atualizar_contas_atrasadas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contas_pagar_receber
  SET status = 'atrasado', updated_at = now()
  WHERE status IN ('aberto', 'aprovado', 'agendado')
    AND data_vencimento < CURRENT_DATE
    AND tipo = 'pagar';
END;
$$;