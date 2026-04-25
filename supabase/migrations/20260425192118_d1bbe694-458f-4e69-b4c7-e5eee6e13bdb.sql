CREATE OR REPLACE FUNCTION public.gerar_lancamentos_de_contas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origem TEXT;
BEGIN
  IF NEW.status = 'pago' AND NEW.data_pagamento IS NOT NULL THEN
    IF (NEW.bling_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lancamentos_financeiros WHERE bling_id = NEW.bling_id
    )) THEN
      RETURN NEW;
    END IF;
    IF (NEW.nf_chave_acesso IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lancamentos_financeiros WHERE nf_chave_acesso = NEW.nf_chave_acesso
    )) THEN
      RETURN NEW;
    END IF;

    v_origem = COALESCE(NEW.origem, 'manual');
    IF v_origem = 'api_bling' THEN
      v_origem = 'api_bling';
    ELSIF v_origem IN ('csv', 'csv_qive') THEN
      v_origem = 'csv';
    ELSE
      v_origem = 'manual';
    END IF;

    INSERT INTO public.lancamentos_financeiros (
      conta_id, descricao, valor, tipo_lancamento,
      data_competencia, data_pagamento,
      centro_custo, fornecedor,
      origem, bling_id, nf_chave_acesso
    ) VALUES (
      NEW.conta_id, NEW.descricao, NEW.valor,
      CASE WHEN NEW.tipo = 'pagar' THEN 'debito' ELSE 'credito' END,
      COALESCE(NEW.nf_data_emissao, NEW.data_vencimento, NEW.data_pagamento),
      NEW.data_pagamento, NEW.centro_custo, NEW.fornecedor_cliente,
      v_origem, NEW.bling_id, NEW.nf_chave_acesso
    );
  END IF;
  RETURN NEW;
END;
$$;