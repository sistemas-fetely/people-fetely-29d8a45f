ALTER TABLE public.contas_bancarias
  ADD COLUMN IF NOT EXISTS unidade text,
  ADD COLUMN IF NOT EXISTS saldo_inicial numeric,
  ADD COLUMN IF NOT EXISTS data_saldo_inicial date,
  ADD COLUMN IF NOT EXISTS dia_fechamento integer,
  ADD COLUMN IF NOT EXISTS dia_vencimento integer,
  ADD COLUMN IF NOT EXISTS limite_credito numeric;