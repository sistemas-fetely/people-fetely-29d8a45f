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
    -- Anti-duplicata por bling_id
    IF (NEW.bling_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lancamentos_financeiros WHERE bling_id = NEW.bling_id
    )) THEN
      RETURN NEW;
    END IF;
    -- Anti-duplicata por chave NF
    IF (NEW.nf_chave_acesso IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lancamentos_financeiros WHERE nf_chave_acesso = NEW.nf_chave_acesso
    )) THEN
      RETURN NEW;
    END IF;

    -- Normalizar origem pra valor aceito pela constraint
    v_origem = COALESCE(NEW.origem, 'manual');
    IF v_origem NOT IN ('csv', 'api_bling', 'manual', 'csv_qive', 'xml_nfe', 'pdf_nfe', 'nf_pj_interno', 'recorrente', 'extrato') THEN
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

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'lancamentos_financeiros'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%origem%'
  LOOP
    EXECUTE 'ALTER TABLE public.lancamentos_financeiros DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE public.lancamentos_financeiros ADD CONSTRAINT lancamentos_financeiros_origem_check
  CHECK (origem IN ('csv', 'api_bling', 'manual', 'csv_qive', 'xml_nfe', 'pdf_nfe', 'nf_pj_interno', 'recorrente', 'extrato'));

DROP TRIGGER IF EXISTS trg_gerar_lancamentos ON public.contas_pagar_receber;
CREATE TRIGGER trg_gerar_lancamentos
  AFTER INSERT OR UPDATE ON public.contas_pagar_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_lancamentos_de_contas();