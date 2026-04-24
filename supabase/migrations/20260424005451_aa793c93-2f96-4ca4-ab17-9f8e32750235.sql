
-- ========== integracoes_config ==========
CREATE TABLE IF NOT EXISTS public.integracoes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema TEXT NOT NULL UNIQUE,
  client_id TEXT,
  client_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  ativo BOOLEAN DEFAULT false,
  ultima_sync_at TIMESTAMPTZ,
  ultima_sync_status TEXT,
  ultima_sync_detalhes TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.integracoes_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin only for integracoes" ON public.integracoes_config;
CREATE POLICY "Super admin only for integracoes"
  ON public.integracoes_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

DROP TRIGGER IF EXISTS trg_integracoes_config_updated_at ON public.integracoes_config;
CREATE TRIGGER trg_integracoes_config_updated_at
  BEFORE UPDATE ON public.integracoes_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed bling
INSERT INTO public.integracoes_config (sistema)
VALUES ('bling')
ON CONFLICT (sistema) DO NOTHING;

-- ========== integracoes_sync_log ==========
CREATE TABLE IF NOT EXISTS public.integracoes_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema TEXT NOT NULL,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'executando' CHECK (status IN ('executando','sucesso','erro','parcial')),
  registros_criados INT DEFAULT 0,
  registros_atualizados INT DEFAULT 0,
  registros_erro INT DEFAULT 0,
  detalhes TEXT,
  iniciado_por UUID NOT NULL,
  duracao_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.integracoes_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin only for sync_log" ON public.integracoes_sync_log;
CREATE POLICY "Super admin only for sync_log"
  ON public.integracoes_sync_log FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_sync_log_sistema_created ON public.integracoes_sync_log (sistema, created_at DESC);

-- ========== Trigger gerar lançamentos ==========
CREATE OR REPLACE FUNCTION public.gerar_lancamentos_de_contas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pago' AND NEW.data_pagamento IS NOT NULL AND NEW.bling_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.lancamentos_financeiros
      WHERE bling_id = NEW.bling_id AND origem = 'api_bling'
    ) THEN
      INSERT INTO public.lancamentos_financeiros (
        conta_id, descricao, valor, tipo_lancamento,
        data_competencia, data_pagamento,
        centro_custo, fornecedor,
        origem, bling_id
      ) VALUES (
        NEW.conta_id,
        NEW.descricao,
        NEW.valor,
        CASE WHEN NEW.tipo = 'pagar' THEN 'debito' ELSE 'credito' END,
        NEW.data_vencimento,
        NEW.data_pagamento,
        NEW.centro_custo,
        NEW.fornecedor_cliente,
        'api_bling',
        NEW.bling_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_lancamentos ON public.contas_pagar_receber;
CREATE TRIGGER trg_gerar_lancamentos
  AFTER INSERT OR UPDATE ON public.contas_pagar_receber
  FOR EACH ROW EXECUTE FUNCTION public.gerar_lancamentos_de_contas();
