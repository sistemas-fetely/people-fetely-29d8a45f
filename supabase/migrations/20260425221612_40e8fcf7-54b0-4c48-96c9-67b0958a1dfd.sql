-- Adiciona coluna tipo_pagamento
ALTER TABLE public.movimentacoes_bancarias 
ADD COLUMN IF NOT EXISTS tipo_pagamento TEXT;

-- Função para detectar tipo de pagamento da descrição
CREATE OR REPLACE FUNCTION public.detectar_tipo_pagamento(descricao TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  desc_upper TEXT;
BEGIN
  IF descricao IS NULL THEN
    RETURN 'Outros';
  END IF;
  
  desc_upper := UPPER(descricao);
  
  -- Fatura de cartão (prioridade alta)
  IF desc_upper ~ '(SISPAG|FAT.*CART|FATURA.*CART|PAG.*TIT.*\d{11})' THEN
    RETURN 'Fatura Cartão';
  END IF;
  
  -- PIX
  IF desc_upper ~ 'PIX' THEN
    IF desc_upper ~ 'QR.*CODE' THEN
      RETURN 'PIX QR Code';
    ELSE
      RETURN 'PIX';
    END IF;
  END IF;
  
  -- Boleto/Cobrança
  IF desc_upper ~ '(BOLETO|COBRANCA|PAGTO\.? FORNEC|PAG\. TITULO)' THEN
    RETURN 'Boleto';
  END IF;
  
  -- TED/DOC/Transferência
  IF desc_upper ~ '(TED|DOC|TRANSF)' AND NOT (desc_upper ~ 'PIX') THEN
    RETURN 'TED/Transferência';
  END IF;
  
  -- Impostos
  IF desc_upper ~ 'DARF' THEN
    RETURN 'DARF (Federal)';
  END IF;
  
  IF desc_upper ~ 'DARE' THEN
    RETURN 'DARE (Estadual)';
  END IF;
  
  IF desc_upper ~ '(TRIBUT|IPTU|ISS)' THEN
    RETURN 'Tributo Municipal';
  END IF;
  
  -- Débito automático
  IF desc_upper ~ 'DEB(ITO)?\.? AUTO' THEN
    RETURN 'Débito Automático';
  END IF;
  
  -- Tarifas
  IF desc_upper ~ '(TARIFA|TAR\.)' THEN
    RETURN 'Tarifa Bancária';
  END IF;
  
  RETURN 'Outros';
END;
$$;

-- Preenche tipos nas movimentações existentes
UPDATE public.movimentacoes_bancarias
SET tipo_pagamento = public.detectar_tipo_pagamento(descricao)
WHERE tipo_pagamento IS NULL;

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_mov_tipo_pagamento ON public.movimentacoes_bancarias(tipo_pagamento);

-- Comentário
COMMENT ON COLUMN public.movimentacoes_bancarias.tipo_pagamento IS 'Tipo de pagamento detectado automaticamente da descrição (PIX, Boleto, Fatura Cartão, etc.)';