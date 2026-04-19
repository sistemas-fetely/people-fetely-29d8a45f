-- Seed do termo de uso v1.0 (versão vigente)
INSERT INTO public.parametros (categoria, valor, label, ordem, ativo)
VALUES ('termo_uso', 'versao_vigente', '1.0', 1, true)
ON CONFLICT (categoria, valor) DO NOTHING;

-- Função: retorna versão vigente do termo
CREATE OR REPLACE FUNCTION public.termo_uso_versao_vigente()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT label FROM public.parametros 
  WHERE categoria = 'termo_uso' AND valor = 'versao_vigente' AND ativo = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.termo_uso_versao_vigente TO authenticated, anon;

-- Função: registrar aceite do termo (gravar data/versão no profile do usuário autenticado)
CREATE OR REPLACE FUNCTION public.registrar_aceite_termo_uso(_versao TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET termo_uso_aceito_em = now(),
      termo_uso_versao = _versao
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_aceite_termo_uso TO authenticated;