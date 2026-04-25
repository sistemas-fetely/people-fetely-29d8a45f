ALTER TABLE public.lancamentos_financeiros DROP CONSTRAINT IF EXISTS lancamentos_financeiros_origem_check;
ALTER TABLE public.lancamentos_financeiros ADD CONSTRAINT lancamentos_financeiros_origem_check
  CHECK (origem IN ('csv', 'api_bling', 'manual', 'csv_qive', 'xml_nfe', 'pdf_nfe', 'nf_pj_interno', 'recorrente', 'extrato'));