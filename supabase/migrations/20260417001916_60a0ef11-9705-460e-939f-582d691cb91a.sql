ALTER TABLE public.ti_ativos_historico
DROP CONSTRAINT IF EXISTS ti_ativos_historico_tipo_manutencao_check;

ALTER TABLE public.ti_ativos_historico
ADD CONSTRAINT ti_ativos_historico_tipo_manutencao_check
CHECK (tipo_manutencao IN ('preventiva', 'corretiva', 'upgrade', 'garantia', 'formatacao'));