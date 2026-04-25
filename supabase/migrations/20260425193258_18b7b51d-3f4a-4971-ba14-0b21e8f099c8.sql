CREATE OR REPLACE FUNCTION public.fix_lancamentos_origem_constraint()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  dropped INT := 0;
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
    dropped := dropped + 1;
  END LOOP;

  ALTER TABLE public.lancamentos_financeiros ADD CONSTRAINT lancamentos_financeiros_origem_check
    CHECK (origem IN ('csv', 'api_bling', 'manual', 'csv_qive', 'xml_nfe', 'pdf_nfe', 'nf_pj_interno', 'recorrente', 'extrato'));

  RETURN 'OK: ' || dropped || ' constraint(s) removida(s) e recriada com valores expandidos';
END;
$$;