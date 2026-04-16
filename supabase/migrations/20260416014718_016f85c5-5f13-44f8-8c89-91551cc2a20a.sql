-- Remover constraint antiga e recriar com "aprovado"
ALTER TABLE public.convites_cadastro DROP CONSTRAINT IF EXISTS convites_cadastro_status_check;

ALTER TABLE public.convites_cadastro ADD CONSTRAINT convites_cadastro_status_check
  CHECK (status IN ('pendente', 'email_enviado', 'preenchido', 'aprovado', 'devolvido', 'cadastrado', 'cancelado', 'expirado'));

-- Corrigir convites com status "cadastrado" que não tiveram colaborador criado
UPDATE public.convites_cadastro
SET status = 'aprovado'
WHERE status = 'cadastrado'
  AND colaborador_id IS NULL
  AND contrato_pj_id IS NULL;