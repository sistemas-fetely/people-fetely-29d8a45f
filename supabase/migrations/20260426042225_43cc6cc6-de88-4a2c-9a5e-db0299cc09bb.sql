ALTER TABLE public.contas_pagar_receber 
ADD COLUMN IF NOT EXISTS dados_pix TEXT,
ADD COLUMN IF NOT EXISTS link_boleto TEXT;

COMMENT ON COLUMN public.contas_pagar_receber.dados_pix IS 'Chave PIX ou dados bancários para pagamento';
COMMENT ON COLUMN public.contas_pagar_receber.link_boleto IS 'URL do boleto (se aplicável)';