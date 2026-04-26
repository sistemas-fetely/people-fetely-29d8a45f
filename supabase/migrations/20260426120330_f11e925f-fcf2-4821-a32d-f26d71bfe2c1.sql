-- 1. Renomear status "agendado" → "aguardando_pagamento"
UPDATE public.contas_pagar_receber
SET status = 'aguardando_pagamento'
WHERE status = 'agendado';

-- 2. Atualizar histórico também
UPDATE public.contas_pagar_historico
SET status_anterior = 'aguardando_pagamento'
WHERE status_anterior = 'agendado';

UPDATE public.contas_pagar_historico
SET status_novo = 'aguardando_pagamento'
WHERE status_novo = 'agendado';

COMMENT ON COLUMN public.contas_pagar_receber.status IS 'Status: rascunho, aberto, aprovado, nf_pendente, aguardando_pagamento, pago, conciliado, cancelado';