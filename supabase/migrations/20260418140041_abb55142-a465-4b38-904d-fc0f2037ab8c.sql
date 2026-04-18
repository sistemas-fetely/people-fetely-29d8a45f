-- ═══ MIGRATION 1 — nivel_rank ═══
CREATE OR REPLACE FUNCTION public.nivel_rank(_nivel TEXT)
RETURNS INT
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE _nivel
    WHEN 'estagio'     THEN 1
    WHEN 'assistente'  THEN 2
    WHEN 'analista'    THEN 3
    WHEN 'coordenador' THEN 4
    WHEN 'gerente'     THEN 5
    WHEN 'diretor'     THEN 6
    ELSE 0
  END;
$$;

-- ═══ MIGRATION 2 — tem_permissao() — coração do v2 ═══
CREATE OR REPLACE FUNCTION public.tem_permissao(
  _user_id UUID,
  _modulo TEXT,
  _acao TEXT,
  _unidade_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tem BOOLEAN;
BEGIN
  IF public.has_role(_user_id, 'super_admin') THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_atribuicoes ua
    JOIN public.perfis p ON p.id = ua.perfil_id
    JOIN public.perfil_packs pp ON pp.perfil_id = p.id
    JOIN public.permission_pack_items ppi ON ppi.pack_id = pp.pack_id
    WHERE ua.user_id = _user_id
      AND p.ativo = true
      AND ppi.modulo = _modulo
      AND ppi.acao = _acao
      AND (ua.valido_ate IS NULL OR ua.valido_ate >= CURRENT_DATE)
      AND (
        ppi.nivel_minimo IS NULL
        OR public.nivel_rank(ua.nivel) >= public.nivel_rank(ppi.nivel_minimo)
      )
      AND (
        p.tipo = 'transversal'
        OR (p.tipo = 'area' AND _unidade_id IS NULL)
        OR (p.tipo = 'area' AND ua.unidade_id = _unidade_id)
      )
  ) INTO v_tem;

  RETURN COALESCE(v_tem, false);
END;
$$;

COMMENT ON FUNCTION public.tem_permissao IS 
  'Função central de autorização do Fetely v2. Resolve pessoa → atribuições → perfis → pacotes → permissões, respeitando nível e escopo (unidade).';

-- ═══ MIGRATION 3 — user_unidades_acessiveis ═══
CREATE OR REPLACE FUNCTION public.user_unidades_acessiveis(_user_id UUID)
RETURNS TABLE (unidade_id UUID, unidade_codigo TEXT, unidade_nome TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.has_role(_user_id, 'super_admin') THEN
    RETURN QUERY
      SELECT u.id, u.codigo, u.nome
      FROM public.unidades u
      WHERE u.ativa = true
      ORDER BY u.nome;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_atribuicoes ua
    JOIN public.perfis p ON p.id = ua.perfil_id
    WHERE ua.user_id = _user_id AND p.codigo = 'diretoria_executiva'
  ) THEN
    RETURN QUERY
      SELECT u.id, u.codigo, u.nome
      FROM public.unidades u
      WHERE u.ativa = true
      ORDER BY u.nome;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT DISTINCT u.id, u.codigo, u.nome
    FROM public.user_atribuicoes ua
    JOIN public.unidades u ON u.id = ua.unidade_id
    WHERE ua.user_id = _user_id
      AND u.ativa = true
      AND (ua.valido_ate IS NULL OR ua.valido_ate >= CURRENT_DATE)
    ORDER BY u.nome;
END;
$$;

-- ═══ MIGRATION 4 — user_perfis_detalhados ═══
CREATE OR REPLACE FUNCTION public.user_perfis_detalhados(_user_id UUID)
RETURNS TABLE (
  atribuicao_id UUID,
  perfil_codigo TEXT,
  perfil_nome TEXT,
  perfil_tipo TEXT,
  unidade_id UUID,
  unidade_nome TEXT,
  nivel TEXT,
  valido_ate DATE
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    ua.id,
    p.codigo,
    p.nome,
    p.tipo,
    ua.unidade_id,
    u.nome,
    ua.nivel,
    ua.valido_ate
  FROM public.user_atribuicoes ua
  JOIN public.perfis p ON p.id = ua.perfil_id
  LEFT JOIN public.unidades u ON u.id = ua.unidade_id
  WHERE ua.user_id = _user_id
    AND p.ativo = true
    AND (ua.valido_ate IS NULL OR ua.valido_ate >= CURRENT_DATE)
  ORDER BY 
    CASE p.tipo WHEN 'transversal' THEN 0 ELSE 1 END,
    p.nome;
$$;

-- ═══ MIGRATION 5 — tem_qualquer_acesso_modulo ═══
CREATE OR REPLACE FUNCTION public.tem_qualquer_acesso_modulo(_user_id UUID, _modulo TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin') OR
    EXISTS (
      SELECT 1
      FROM public.user_atribuicoes ua
      JOIN public.perfis p ON p.id = ua.perfil_id
      JOIN public.perfil_packs pp ON pp.perfil_id = p.id
      JOIN public.permission_pack_items ppi ON ppi.pack_id = pp.pack_id
      WHERE ua.user_id = _user_id
        AND p.ativo = true
        AND ppi.modulo = _modulo
        AND (ua.valido_ate IS NULL OR ua.valido_ate >= CURRENT_DATE)
        AND (ppi.nivel_minimo IS NULL OR public.nivel_rank(ua.nivel) >= public.nivel_rank(ppi.nivel_minimo))
    );
$$;

-- ═══ MIGRATION 6 — Testes de sanidade ═══
DO $$
DECLARE
  v_flavio UUID;
  v_joseph UUID;
  v_isabella UUID;
  v_matriz UUID;
  v_joinville UUID;
  v_resultado BOOLEAN;
BEGIN
  SELECT id INTO v_flavio   FROM auth.users WHERE email = 'flavio@fetely.com.br' LIMIT 1;
  SELECT id INTO v_joseph   FROM auth.users WHERE email = 'joseph@fetely.com.br' LIMIT 1;
  SELECT id INTO v_isabella FROM auth.users WHERE email = 'isabella.vieira@fetely.com.br' LIMIT 1;
  SELECT id INTO v_matriz    FROM public.unidades WHERE codigo = 'matriz_sp';
  SELECT id INTO v_joinville FROM public.unidades WHERE codigo = 'joinville';

  IF v_flavio IS NOT NULL THEN
    v_resultado := public.tem_permissao(v_flavio, 'folha_pagamento', 'fechar', v_joinville);
    RAISE NOTICE '[Teste] Flavio (super_admin) pode fechar folha em Joinville? %', v_resultado;
    v_resultado := public.tem_permissao(v_flavio, 'folha_pagamento', 'fechar', v_matriz);
    RAISE NOTICE '[Teste] Flavio (super_admin) pode fechar folha em Matriz? %', v_resultado;
  END IF;

  IF v_joseph IS NOT NULL THEN
    v_resultado := public.tem_permissao(v_joseph, 'colaboradores', 'view', NULL);
    RAISE NOTICE '[Teste] Joseph (diretoria) pode ver colaboradores? %', v_resultado;
    v_resultado := public.tem_permissao(v_joseph, 'colaboradores', 'edit', NULL);
    RAISE NOTICE '[Teste] Joseph (diretoria) pode editar colaboradores? % (esperado: false)', v_resultado;
  END IF;

  IF v_isabella IS NOT NULL THEN
    v_resultado := public.tem_permissao(v_isabella, 'dashboard', 'view', NULL);
    RAISE NOTICE '[Teste] Isabella (colab) pode ver dashboard? %', v_resultado;
    v_resultado := public.tem_permissao(v_isabella, 'notas_fiscais', 'view', NULL);
    RAISE NOTICE '[Teste] Isabella (colab+admin assistente) pode ver NFs? % (esperado: false)', v_resultado;
  END IF;
END $$;