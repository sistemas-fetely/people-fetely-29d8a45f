ALTER TABLE public.ti_ativos_historico
ADD COLUMN IF NOT EXISTS tipo_manutencao TEXT CHECK (tipo_manutencao IN ('preventiva', 'corretiva', 'upgrade', 'garantia', 'formatacao')),
ADD COLUMN IF NOT EXISTS fornecedor TEXT,
ADD COLUMN IF NOT EXISTS valor NUMERIC,
ADD COLUMN IF NOT EXISTS data_inicio DATE,
ADD COLUMN IF NOT EXISTS data_fim DATE,
ADD COLUMN IF NOT EXISTS garantia_servico_ate DATE,
ADD COLUMN IF NOT EXISTS status_anterior TEXT;