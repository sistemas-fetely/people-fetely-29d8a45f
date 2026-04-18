-- ═══ MIGRATION 1: Tabelas de template ═══

CREATE TABLE IF NOT EXISTS public.cargo_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  nivel_sugerido TEXT CHECK (nivel_sugerido IN ('estagio','assistente','analista','coordenador','gerente','diretor')),
  cargo_id UUID REFERENCES public.cargos(id),
  area TEXT,
  is_sistema BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_cargo_template_cargo ON public.cargo_template(cargo_id);
CREATE INDEX IF NOT EXISTS idx_cargo_template_ativo ON public.cargo_template(ativo) WHERE ativo = true;

ALTER TABLE public.cargo_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cargo_template_leitura_authenticated" ON public.cargo_template
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cargo_template_escrita_super_admin" ON public.cargo_template
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE TABLE IF NOT EXISTS public.cargo_template_perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.cargo_template(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  escopo_unidade_id UUID REFERENCES public.unidades(id),
  nivel_override TEXT CHECK (nivel_override IN ('estagio','assistente','analista','coordenador','gerente','diretor')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, perfil_id, escopo_unidade_id)
);

CREATE INDEX IF NOT EXISTS idx_cargo_template_perfis_template ON public.cargo_template_perfis(template_id);

ALTER TABLE public.cargo_template_perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cargo_template_perfis_leitura_authenticated" ON public.cargo_template_perfis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cargo_template_perfis_escrita_super_admin" ON public.cargo_template_perfis
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ═══ MIGRATION 2: Origem de atribuição ═══

CREATE TABLE IF NOT EXISTS public.atribuicao_origem (
  atribuicao_id UUID PRIMARY KEY REFERENCES public.user_atribuicoes(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.cargo_template(id),
  origem TEXT NOT NULL CHECK (origem IN ('template','manual','reaplicacao_template','migracao_v1')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.atribuicao_origem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atribuicao_origem_leitura_authenticated" ON public.atribuicao_origem
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "atribuicao_origem_escrita_super_admin" ON public.atribuicao_origem
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ═══ MIGRATION 3: Seed dos 6 templates genéricos ═══

INSERT INTO public.cargo_template (codigo, nome, descricao, nivel_sugerido, is_sistema) VALUES
  ('estagio',     'Estágio',     'Template para estagiários — Colaborador + área escolhida no cadastro, nível Estágio', 'estagio', true),
  ('assistente',  'Assistente',  'Template para Assistentes — Colaborador + área escolhida no cadastro, nível Assistente', 'assistente', true),
  ('analista',    'Analista',    'Template para Analistas — Colaborador + área escolhida no cadastro, nível Analista', 'analista', true),
  ('coordenador', 'Coordenador', 'Template para Coordenadores — Colaborador + Gestão Direta + área escolhida, nível Coordenador', 'coordenador', true),
  ('gerente',     'Gerente',     'Template para Gerentes — Colaborador + Gestão Direta + área escolhida, nível Gerente', 'gerente', true),
  ('diretor',     'Diretor',     'Template para Diretores — Colaborador + Gestão Direta + Diretoria Executiva + área escolhida, nível Diretor', 'diretor', true)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.cargo_template_perfis (template_id, perfil_id)
SELECT t.id, p.id
FROM public.cargo_template t
CROSS JOIN public.perfis p
WHERE p.codigo = 'colaborador'
  AND t.is_sistema = true
ON CONFLICT DO NOTHING;

INSERT INTO public.cargo_template_perfis (template_id, perfil_id)
SELECT t.id, p.id
FROM public.cargo_template t
CROSS JOIN public.perfis p
WHERE p.codigo = 'gestao_direta'
  AND t.codigo IN ('coordenador','gerente','diretor')
ON CONFLICT DO NOTHING;

INSERT INTO public.cargo_template_perfis (template_id, perfil_id)
SELECT t.id, p.id
FROM public.cargo_template t
CROSS JOIN public.perfis p
WHERE p.codigo = 'diretoria_executiva'
  AND t.codigo = 'diretor'
ON CONFLICT DO NOTHING;

-- ═══ MIGRATION 4: aplicar_template_cargo ═══

CREATE OR REPLACE FUNCTION public.aplicar_template_cargo(
  _user_id UUID,
  _template_id UUID,
  _area_perfil_codigo TEXT,
  _unidade_id UUID,
  _atribuidor UUID DEFAULT NULL
)
RETURNS TABLE (atribuicao_id UUID, perfil_nome TEXT, nivel TEXT, unidade_nome TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_area_perfil_id UUID;
  v_atrib RECORD;
  v_nova_id UUID;
BEGIN
  SELECT * INTO v_template FROM public.cargo_template WHERE id = _template_id;
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template não encontrado';
  END IF;

  IF _area_perfil_codigo IS NOT NULL THEN
    SELECT id INTO v_area_perfil_id FROM public.perfis WHERE codigo = _area_perfil_codigo AND tipo = 'area';
    IF v_area_perfil_id IS NULL THEN
      RAISE EXCEPTION 'Área % não encontrada ou não é tipo=area', _area_perfil_codigo;
    END IF;
    IF _unidade_id IS NULL THEN
      RAISE EXCEPTION 'Unidade é obrigatória quando área é informada (Regra 19 na Pedra)';
    END IF;
  END IF;

  FOR v_atrib IN
    SELECT p.id AS perfil_id, p.nome AS perfil_nome, p.tipo, ctp.nivel_override, ctp.escopo_unidade_id
    FROM public.cargo_template_perfis ctp
    JOIN public.perfis p ON p.id = ctp.perfil_id
    WHERE ctp.template_id = _template_id
  LOOP
    INSERT INTO public.user_atribuicoes (user_id, perfil_id, unidade_id, nivel, criado_por)
    VALUES (
      _user_id,
      v_atrib.perfil_id,
      CASE
        WHEN v_atrib.tipo = 'transversal' THEN NULL
        WHEN v_atrib.escopo_unidade_id IS NOT NULL THEN v_atrib.escopo_unidade_id
        ELSE _unidade_id
      END,
      CASE
        WHEN v_atrib.tipo = 'transversal' THEN NULL
        WHEN v_atrib.nivel_override IS NOT NULL THEN v_atrib.nivel_override
        ELSE v_template.nivel_sugerido
      END,
      _atribuidor
    )
    ON CONFLICT (user_id, perfil_id, unidade_id) DO NOTHING
    RETURNING id INTO v_nova_id;

    IF v_nova_id IS NOT NULL THEN
      INSERT INTO public.atribuicao_origem (atribuicao_id, template_id, origem)
      VALUES (v_nova_id, _template_id, 'template')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  IF v_area_perfil_id IS NOT NULL THEN
    INSERT INTO public.user_atribuicoes (user_id, perfil_id, unidade_id, nivel, criado_por)
    VALUES (_user_id, v_area_perfil_id, _unidade_id, v_template.nivel_sugerido, _atribuidor)
    ON CONFLICT (user_id, perfil_id, unidade_id) DO NOTHING
    RETURNING id INTO v_nova_id;

    IF v_nova_id IS NOT NULL THEN
      INSERT INTO public.atribuicao_origem (atribuicao_id, template_id, origem)
      VALUES (v_nova_id, _template_id, 'template')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    ua.id,
    p.nome,
    ua.nivel,
    u.nome
  FROM public.user_atribuicoes ua
  JOIN public.perfis p ON p.id = ua.perfil_id
  LEFT JOIN public.unidades u ON u.id = ua.unidade_id
  JOIN public.atribuicao_origem ao ON ao.atribuicao_id = ua.id
  WHERE ua.user_id = _user_id
    AND ao.template_id = _template_id
  ORDER BY p.tipo, p.nome;
END;
$$;

-- ═══ MIGRATION 5: preview_template_cargo ═══

CREATE OR REPLACE FUNCTION public.preview_template_cargo(
  _template_id UUID,
  _area_perfil_codigo TEXT,
  _unidade_id UUID
)
RETURNS TABLE (perfil_nome TEXT, perfil_tipo TEXT, nivel TEXT, unidade_nome TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_area_nome TEXT;
  v_unidade_nome TEXT;
BEGIN
  SELECT * INTO v_template FROM public.cargo_template WHERE id = _template_id;
  IF v_template IS NULL THEN
    RETURN;
  END IF;

  SELECT nome INTO v_unidade_nome FROM public.unidades WHERE id = _unidade_id;

  RETURN QUERY
  SELECT
    p.nome,
    p.tipo,
    CASE
      WHEN p.tipo = 'transversal' THEN NULL
      WHEN ctp.nivel_override IS NOT NULL THEN ctp.nivel_override
      ELSE v_template.nivel_sugerido
    END,
    CASE
      WHEN p.tipo = 'transversal' THEN NULL
      WHEN ctp.escopo_unidade_id IS NOT NULL THEN (SELECT nome FROM public.unidades WHERE id = ctp.escopo_unidade_id)
      ELSE v_unidade_nome
    END
  FROM public.cargo_template_perfis ctp
  JOIN public.perfis p ON p.id = ctp.perfil_id
  WHERE ctp.template_id = _template_id;

  IF _area_perfil_codigo IS NOT NULL THEN
    SELECT nome INTO v_area_nome FROM public.perfis WHERE codigo = _area_perfil_codigo AND tipo = 'area';
    IF v_area_nome IS NOT NULL THEN
      RETURN QUERY SELECT v_area_nome, 'area'::TEXT, v_template.nivel_sugerido, v_unidade_nome;
    END IF;
  END IF;
END;
$$;