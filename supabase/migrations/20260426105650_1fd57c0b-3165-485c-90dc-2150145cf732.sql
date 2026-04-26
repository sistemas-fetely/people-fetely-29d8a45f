ALTER TABLE public.contas_pagar_receber
  ADD COLUMN IF NOT EXISTS nf_numero TEXT,
  ADD COLUMN IF NOT EXISTS nf_serie TEXT,
  ADD COLUMN IF NOT EXISTS nf_chave_acesso TEXT,
  ADD COLUMN IF NOT EXISTS observacao_financeiro TEXT;

CREATE INDEX IF NOT EXISTS idx_cpr_nf_chave ON public.contas_pagar_receber(nf_chave_acesso);

COMMENT ON COLUMN public.contas_pagar_receber.nf_numero IS 'Número da Nota Fiscal';
COMMENT ON COLUMN public.contas_pagar_receber.nf_serie IS 'Série da Nota Fiscal';
COMMENT ON COLUMN public.contas_pagar_receber.nf_chave_acesso IS 'Chave de acesso (44 dígitos)';
COMMENT ON COLUMN public.contas_pagar_receber.observacao_financeiro IS 'Observações para equipe financeiro';