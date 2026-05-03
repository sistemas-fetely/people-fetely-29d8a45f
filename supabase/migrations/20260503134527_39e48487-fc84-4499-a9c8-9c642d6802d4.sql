ALTER TABLE public.parceiros_comerciais
  ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT NOT NULL DEFAULT 'PJ',
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE;

ALTER TABLE public.parceiros_comerciais
  DROP CONSTRAINT IF EXISTS parceiros_comerciais_tipo_pessoa_check;

ALTER TABLE public.parceiros_comerciais
  ADD CONSTRAINT parceiros_comerciais_tipo_pessoa_check
  CHECK (tipo_pessoa IN ('PF','PJ'));

CREATE INDEX IF NOT EXISTS idx_parceiros_cpf ON public.parceiros_comerciais(cpf) WHERE cpf IS NOT NULL;