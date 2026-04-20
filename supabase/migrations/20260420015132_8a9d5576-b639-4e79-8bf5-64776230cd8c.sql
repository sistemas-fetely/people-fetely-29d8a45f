ALTER TABLE public.contratos_pj
  ADD COLUMN IF NOT EXISTS data_nascimento DATE;

COMMENT ON COLUMN public.contratos_pj.data_nascimento IS 
  'Data de nascimento do colaborador PJ (pessoa física do contato). Opcional. Usado pelo Mural Fetely para celebrações de aniversário. DNA: colaborador PJ é colaborador também.';