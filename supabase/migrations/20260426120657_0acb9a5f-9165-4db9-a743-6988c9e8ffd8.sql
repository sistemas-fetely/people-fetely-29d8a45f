-- 1. Tabela de alertas
CREATE TABLE IF NOT EXISTS public.contas_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.contas_pagar_receber(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_alertas_conta ON public.contas_alertas(conta_id);
CREATE INDEX idx_alertas_ativos ON public.contas_alertas(ativo) WHERE ativo = true;
CREATE INDEX idx_alertas_tipo ON public.contas_alertas(tipo);

ALTER TABLE public.contas_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver alertas"
  ON public.contas_alertas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autenticados podem criar alertas"
  ON public.contas_alertas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Autenticados podem resolver alertas"
  ON public.contas_alertas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Trigger: criar alerta quando vai pra nf_pendente
CREATE OR REPLACE FUNCTION public.criar_alerta_nf_pendente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'nf_pendente' AND (OLD.status IS NULL OR OLD.status != 'nf_pendente') THEN
    INSERT INTO public.contas_alertas (conta_id, tipo, mensagem)
    VALUES (
      NEW.id,
      'nf_pendente',
      'Nota Fiscal ou Recibo pendente de anexação'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_criar_alerta_nf_pendente ON public.contas_pagar_receber;
CREATE TRIGGER trigger_criar_alerta_nf_pendente
  AFTER INSERT OR UPDATE OF status ON public.contas_pagar_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_alerta_nf_pendente();

-- 3. Trigger: fechar alerta quando NF for anexada
CREATE OR REPLACE FUNCTION public.resolver_alerta_nf_anexada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aguardando_pagamento' AND OLD.status = 'nf_pendente' THEN
    UPDATE public.contas_alertas
    SET ativo = false,
        resolvido_em = now()
    WHERE conta_id = NEW.id
      AND tipo = 'nf_pendente'
      AND ativo = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_resolver_alerta_nf_anexada ON public.contas_pagar_receber;
CREATE TRIGGER trigger_resolver_alerta_nf_anexada
  AFTER UPDATE OF status ON public.contas_pagar_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.resolver_alerta_nf_anexada();

COMMENT ON TABLE public.contas_alertas IS 'Alertas e pendências de contas a pagar';
COMMENT ON COLUMN public.contas_alertas.tipo IS 'Tipo do alerta: nf_pendente, vencimento_proximo, etc';
COMMENT ON COLUMN public.contas_alertas.ativo IS 'Se false, alerta foi resolvido';