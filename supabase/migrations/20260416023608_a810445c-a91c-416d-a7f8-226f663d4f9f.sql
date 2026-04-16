
ALTER TABLE public.convites_cadastro
ADD COLUMN lembretes_ativos boolean NOT NULL DEFAULT true,
ADD COLUMN lembretes_suspenso_por uuid REFERENCES auth.users(id),
ADD COLUMN lembretes_suspenso_em timestamptz;
