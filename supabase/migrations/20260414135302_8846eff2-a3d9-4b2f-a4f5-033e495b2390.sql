ALTER TABLE public.vagas 
ADD COLUMN IF NOT EXISTS ferramentas_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS beneficios_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS beneficios_outros TEXT,
ADD COLUMN IF NOT EXISTS ferramentas_outras TEXT;