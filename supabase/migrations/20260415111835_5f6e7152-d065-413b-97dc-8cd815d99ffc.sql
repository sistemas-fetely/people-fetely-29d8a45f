
ALTER TABLE public.testes_tecnicos
ADD COLUMN IF NOT EXISTS skills_validadas JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS skills_a_validar JSONB DEFAULT '[]';
