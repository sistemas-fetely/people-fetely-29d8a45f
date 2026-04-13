
-- Add new columns to convites_cadastro
ALTER TABLE public.convites_cadastro
  ADD COLUMN IF NOT EXISTS salario_previsto numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_inicio_prevista date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prazo_dias integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS observacoes_colaborador text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lider_direto_id uuid DEFAULT NULL REFERENCES public.profiles(id);
