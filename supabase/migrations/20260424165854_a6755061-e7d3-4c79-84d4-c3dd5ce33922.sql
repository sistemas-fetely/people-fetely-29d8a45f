CREATE OR REPLACE FUNCTION public.gerar_lancamentos_de_contas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pago' AND NEW.data_pagamento IS NOT NULL THEN
    IF NEW.bling_id IS NOT NULL AND NOT EXISTS (
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
        COALESCE(NEW.data_vencimento, NEW.data_pagamento),
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
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_lancamentos_de_contas();

-- Backfill: gerar lançamentos retroativos para contas já pagas
INSERT INTO public.lancamentos_financeiros (
  conta_id, descricao, valor, tipo_lancamento,
  data_competencia, data_pagamento,
  centro_custo, fornecedor, origem, bling_id
)
SELECT
  c.conta_id,
  c.descricao,
  c.valor,
  CASE WHEN c.tipo = 'pagar' THEN 'debito' ELSE 'credito' END,
  COALESCE(c.data_vencimento, c.data_pagamento),
  c.data_pagamento,
  c.centro_custo,
  c.fornecedor_cliente,
  'api_bling',
  c.bling_id
FROM public.contas_pagar_receber c
WHERE c.status = 'pago'
  AND c.data_pagamento IS NOT NULL
  AND c.bling_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.lancamentos_financeiros l
    WHERE l.bling_id = c.bling_id AND l.origem = 'api_bling'
  );