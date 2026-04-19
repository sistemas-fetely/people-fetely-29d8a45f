-- Adicionar telefone corporativo
ALTER TABLE public.colaboradores_clt 
  ADD COLUMN IF NOT EXISTS telefone_corporativo TEXT;

COMMENT ON COLUMN public.colaboradores_clt.telefone_corporativo IS 
  'Telefone do ativo corporativo (celular funcional, ramal). Distinto do telefone pessoal (dado LGPD).';

ALTER TABLE public.contratos_pj 
  ADD COLUMN IF NOT EXISTS telefone_corporativo TEXT;

COMMENT ON COLUMN public.contratos_pj.telefone_corporativo IS 
  'Telefone corporativo da pessoa vinculada ao contrato PJ. Distinto do telefone pessoal/contato.';

-- Função para verificar se um user_id está órfão (referenciado mas não existe em auth.users)
CREATE OR REPLACE FUNCTION public.verificar_user_orfao(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id);
$$;

GRANT EXECUTE ON FUNCTION public.verificar_user_orfao(UUID) TO authenticated;