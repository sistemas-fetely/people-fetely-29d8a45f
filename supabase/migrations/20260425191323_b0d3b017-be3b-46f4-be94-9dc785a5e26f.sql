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
    EXECUTE 'ALTER TABLE public.lancamentos_financeiros DROP CONSTRAINT IF EXISTS ' || r.conname;
  END LOOP;
END $$;

ALTER TABLE public.lancamentos_financeiros ADD CONSTRAINT lancamentos_financeiros_origem_check
  CHECK (origem IN ('csv', 'api_bling', 'manual', 'csv_qive', 'xml_nfe', 'pdf_nfe', 'nf_pj_interno', 'recorrente', 'extrato'));