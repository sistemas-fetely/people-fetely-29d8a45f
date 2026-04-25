-- Fix 1: Corrigir registros existentes
UPDATE public.contas_pagar_receber
SET docs_status = 'ok'
WHERE nf_chave_acesso IS NOT NULL
  AND nf_chave_acesso != ''
  AND (docs_status = 'pendente' OR docs_status IS NULL);

-- Fix 2: Trigger no INSERT e UPDATE
CREATE OR REPLACE FUNCTION public.atualizar_docs_status_nf()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.nf_chave_acesso IS NOT NULL AND NEW.nf_chave_acesso != '' THEN
    NEW.docs_status = 'ok';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_docs_status_nf ON public.contas_pagar_receber;
CREATE TRIGGER trg_docs_status_nf
  BEFORE INSERT OR UPDATE ON public.contas_pagar_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_docs_status_nf();