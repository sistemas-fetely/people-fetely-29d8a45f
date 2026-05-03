ALTER TABLE public.parceiros_comerciais
  ADD COLUMN IF NOT EXISTS meio_pagamento_padrao text,
  ADD COLUMN IF NOT EXISTS pix_chave text,
  ADD COLUMN IF NOT EXISTS pix_tipo text;