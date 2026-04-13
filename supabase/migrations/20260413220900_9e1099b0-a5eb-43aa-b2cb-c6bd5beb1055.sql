
ALTER TABLE public.parametros ADD COLUMN IF NOT EXISTS is_clevel BOOLEAN DEFAULT false;

UPDATE public.parametros
SET is_clevel = true
WHERE categoria = 'cargo'
  AND (
    upper(label) LIKE '%CEO%' OR
    upper(label) LIKE '%COO%' OR
    upper(label) LIKE '%CFO%' OR
    upper(label) LIKE '%CTO%' OR
    upper(label) LIKE '%CPO%' OR
    upper(label) LIKE '%CISO%' OR
    upper(label) LIKE '%CMO%' OR
    upper(label) LIKE '%CRO%'
  );
