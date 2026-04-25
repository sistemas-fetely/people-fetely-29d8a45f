ALTER TABLE contas_pagar_receber 
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;

ALTER TABLE contas_pagar_receber
ADD COLUMN IF NOT EXISTS dados_enriquecidos_qive BOOLEAN DEFAULT false;

COMMENT ON COLUMN contas_pagar_receber.forma_pagamento IS 
  'Meio de pagamento: Cartão Crédito, PIX, Boleto, TED, Dinheiro, Débito Automático, Outros';

COMMENT ON COLUMN contas_pagar_receber.dados_enriquecidos_qive IS
  'Indica se os dados foram enriquecidos via API Qive';

CREATE INDEX IF NOT EXISTS idx_cpr_forma_pagamento ON contas_pagar_receber(forma_pagamento);
CREATE INDEX IF NOT EXISTS idx_cpr_dados_enriquecidos ON contas_pagar_receber(dados_enriquecidos_qive);