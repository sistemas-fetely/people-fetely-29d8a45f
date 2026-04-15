ALTER TABLE public.parametros 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.parametros(id) ON DELETE SET NULL;