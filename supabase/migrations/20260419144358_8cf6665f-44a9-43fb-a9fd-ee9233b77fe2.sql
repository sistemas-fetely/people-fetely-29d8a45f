-- ============================================================
-- PF1 — Fundação Processos Fetely
-- ============================================================

-- 1.1 Parâmetros: natureza, status, módulo de origem
INSERT INTO public.parametros (categoria, valor, label, ordem, ativo) VALUES
  ('natureza_processo', 'lista_tarefas', 'Lista de Tarefas (workflow com RACI)', 1, true),
  ('natureza_processo', 'workflow', 'Workflow (fluxo com bifurcação)', 2, true),
  ('natureza_processo', 'guia', 'Guia/Norma (descritivo)', 3, true),
  ('natureza_processo', 'misto', 'Misto (narrativa + passos)', 4, true)
ON CONFLICT (categoria, valor) DO NOTHING;

INSERT INTO public.parametros (categoria, valor, label, ordem, ativo) VALUES
  ('status_processo', 'rascunho', 'Rascunho', 1, true),
  ('status_processo', 'em_revisao', 'Em revisão', 2, true),
  ('status_processo', 'vigente', 'Vigente', 3, true),
  ('status_processo', 'arquivado', 'Arquivado', 4, true)
ON CONFLICT (categoria, valor) DO NOTHING;

INSERT INTO public.parametros (categoria, valor, label, ordem, ativo) VALUES
  ('modulo_origem_processo', 'rh', 'RH', 1, true),
  ('modulo_origem_processo', 'people', 'People', 2, true),
  ('modulo_origem_processo', 'ti', 'TI', 3, true),
  ('modulo_origem_processo', 'compras', 'Compras', 4, true),
  ('modulo_origem_processo', 'financeiro', 'Financeiro', 5, true),
  ('modulo_origem_processo', 'comercial', 'Comercial', 6, true),
  ('modulo_origem_processo', 'operacional', 'Operacional', 7, true),
  ('modulo_origem_processo', 'estrategico', 'Estratégico', 8, true),
  ('modulo_origem_processo', 'outros', 'Outros', 9, true)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ============================================================
-- 1.2 Tabela central
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  narrativa TEXT,
  area_negocio_id UUID REFERENCES public.parametros(id),
  natureza_valor TEXT NOT NULL DEFAULT 'guia',
  status_valor TEXT NOT NULL DEFAULT 'rascunho',
  owner_user_id UUID REFERENCES auth.users(id),
  owner_perfil_codigo TEXT REFERENCES public.perfis(codigo) ON UPDATE CASCADE,
  versao_atual INTEGER NOT NULL DEFAULT 0,
  versao_vigente_em TIMESTAMPTZ,
  template_sncf_id UUID REFERENCES public.sncf_templates_processos(id),
  sensivel BOOLEAN NOT NULL DEFAULT false,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processos_area ON public.processos(area_negocio_id);
CREATE INDEX IF NOT EXISTS idx_processos_owner_user ON public.processos(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_processos_status ON public.processos(status_valor);
CREATE INDEX IF NOT EXISTS idx_processos_template_sncf ON public.processos(template_sncf_id);

COMMENT ON TABLE public.processos IS 'Fundação Processos Fetely. Compatível com sncf_templates_processos via FK template_sncf_id.';

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processos_read_authenticated" ON public.processos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "processos_write_super_admin" ON public.processos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "processos_update_owner" ON public.processos
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================
-- 1.3 Versões
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processos_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  nome_snapshot TEXT NOT NULL,
  descricao_snapshot TEXT,
  narrativa_snapshot TEXT,
  natureza_snapshot TEXT,
  tags_snapshot JSONB,
  passos_snapshot JSONB,
  publicado_por UUID REFERENCES auth.users(id),
  publicado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  motivo_alteracao TEXT,
  UNIQUE (processo_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_processos_versoes_processo ON public.processos_versoes(processo_id, numero DESC);

ALTER TABLE public.processos_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processos_versoes_read" ON public.processos_versoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "processos_versoes_write_super_admin" ON public.processos_versoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 1.4 Tags dimensionais
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processos_tags_areas (
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.parametros(id) ON DELETE CASCADE,
  PRIMARY KEY (processo_id, area_id)
);

CREATE TABLE IF NOT EXISTS public.processos_tags_departamentos (
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  departamento_id UUID NOT NULL REFERENCES public.parametros(id) ON DELETE CASCADE,
  PRIMARY KEY (processo_id, departamento_id)
);

CREATE TABLE IF NOT EXISTS public.processos_tags_unidades (
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  PRIMARY KEY (processo_id, unidade_id)
);

CREATE TABLE IF NOT EXISTS public.processos_tags_cargos (
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  PRIMARY KEY (processo_id, cargo_id)
);

CREATE TABLE IF NOT EXISTS public.processos_tags_sistemas (
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  sistema_id UUID NOT NULL REFERENCES public.sncf_sistemas(id) ON DELETE CASCADE,
  PRIMARY KEY (processo_id, sistema_id)
);

CREATE TABLE IF NOT EXISTS public.processos_tags_tipos_colaborador (
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('clt', 'pj')),
  PRIMARY KEY (processo_id, tipo)
);

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'processos_tags_areas', 'processos_tags_departamentos', 'processos_tags_unidades',
    'processos_tags_cargos', 'processos_tags_sistemas', 'processos_tags_tipos_colaborador'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_read" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_read" ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_write" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_write" ON public.%I FOR ALL TO authenticated USING (has_role(auth.uid(), ''super_admin'')) WITH CHECK (has_role(auth.uid(), ''super_admin''))', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- 1.5 Log + Sugestões
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processos_log_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  consultado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processos_log_processo ON public.processos_log_consultas(processo_id, consultado_em DESC);

ALTER TABLE public.processos_log_consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processos_log_read" ON public.processos_log_consultas
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "processos_log_insert" ON public.processos_log_consultas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.processos_sugestoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID REFERENCES public.processos(id) ON DELETE SET NULL,
  titulo_sugerido TEXT,
  descricao TEXT NOT NULL,
  sugerido_por UUID REFERENCES auth.users(id),
  sugerido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  origem TEXT DEFAULT 'fala_fetely',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceita', 'rejeitada', 'aplicada')),
  avaliado_por UUID REFERENCES auth.users(id),
  avaliado_em TIMESTAMPTZ,
  motivo_decisao TEXT
);

CREATE INDEX IF NOT EXISTS idx_processos_sugestoes_status ON public.processos_sugestoes(status, sugerido_em DESC);
CREATE INDEX IF NOT EXISTS idx_processos_sugestoes_processo ON public.processos_sugestoes(processo_id);

ALTER TABLE public.processos_sugestoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processos_sugestoes_read" ON public.processos_sugestoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "processos_sugestoes_insert" ON public.processos_sugestoes
  FOR INSERT TO authenticated WITH CHECK (sugerido_por = auth.uid());

CREATE POLICY "processos_sugestoes_update_owner" ON public.processos_sugestoes
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.processos p WHERE p.id = processo_id AND p.owner_user_id = auth.uid())
  )
  WITH CHECK (true);

-- ============================================================
-- 1.6 FK cruzada Modelo C
-- ============================================================
ALTER TABLE public.sncf_templates_processos
  ADD COLUMN IF NOT EXISTS processos_id UUID REFERENCES public.processos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sncf_templates_processos_processos_id ON public.sncf_templates_processos(processos_id);

-- ============================================================
-- 1.7 Backfill
-- ============================================================
DO $$
DECLARE
  tmpl RECORD;
  novo_processo_id UUID;
  v_area_id UUID;
  v_codigo TEXT;
BEGIN
  SELECT id INTO v_area_id
  FROM public.parametros
  WHERE categoria = 'area_negocio' AND valor = 'administrativo' AND ativo = true
  LIMIT 1;

  FOR tmpl IN
    SELECT t.id, t.nome, t.descricao, t.tipo_processo, t.tipo_colaborador
    FROM public.sncf_templates_processos t
    WHERE t.processos_id IS NULL
  LOOP
    v_codigo := 'auto_' || regexp_replace(lower(coalesce(tmpl.nome, 'sem_nome')), '[^a-z0-9]+', '_', 'g') || '_' || substr(tmpl.id::text, 1, 8);

    INSERT INTO public.processos (
      codigo, nome, descricao, narrativa,
      area_negocio_id, natureza_valor, status_valor,
      template_sncf_id, sensivel
    ) VALUES (
      v_codigo,
      tmpl.nome,
      tmpl.descricao,
      '_Este processo foi importado automaticamente do workflow de RH legado. Edite pra enriquecer com narrativa, diretrizes e histórico._',
      v_area_id,
      'lista_tarefas',
      'vigente',
      tmpl.id,
      (tmpl.tipo_processo = 'offboarding')
    )
    RETURNING id INTO novo_processo_id;

    UPDATE public.sncf_templates_processos SET processos_id = novo_processo_id WHERE id = tmpl.id;

    INSERT INTO public.processos_versoes (processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot, natureza_snapshot, motivo_alteracao)
    VALUES (novo_processo_id, 1, tmpl.nome, tmpl.descricao, 'Importado do workflow legado', 'lista_tarefas', 'Backfill inicial da fundação Processos Fetely');

    UPDATE public.processos
    SET versao_atual = 1, versao_vigente_em = now()
    WHERE id = novo_processo_id;

    IF tmpl.tipo_colaborador IN ('clt', 'ambos') THEN
      INSERT INTO public.processos_tags_tipos_colaborador (processo_id, tipo) VALUES (novo_processo_id, 'clt')
      ON CONFLICT DO NOTHING;
    END IF;
    IF tmpl.tipo_colaborador IN ('pj', 'ambos') THEN
      INSERT INTO public.processos_tags_tipos_colaborador (processo_id, tipo) VALUES (novo_processo_id, 'pj')
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_area_id IS NOT NULL THEN
      INSERT INTO public.processos_tags_areas (processo_id, area_id) VALUES (novo_processo_id, v_area_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 1.8 Triggers de sincronização bidirecional + updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_sncf_template_to_processo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.processos_id IS NOT NULL THEN
    UPDATE public.processos
    SET nome = NEW.nome,
        descricao = NEW.descricao,
        updated_at = now()
    WHERE id = NEW.processos_id
      AND (nome IS DISTINCT FROM NEW.nome OR descricao IS DISTINCT FROM NEW.descricao);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_sncf_to_processo ON public.sncf_templates_processos;
CREATE TRIGGER trg_sync_sncf_to_processo
  AFTER UPDATE OF nome, descricao ON public.sncf_templates_processos
  FOR EACH ROW EXECUTE FUNCTION public.sync_sncf_template_to_processo();

CREATE OR REPLACE FUNCTION public.sync_processo_to_sncf_template()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.template_sncf_id IS NOT NULL
     AND (NEW.nome IS DISTINCT FROM OLD.nome OR NEW.descricao IS DISTINCT FROM OLD.descricao) THEN
    UPDATE public.sncf_templates_processos
    SET nome = NEW.nome,
        descricao = NEW.descricao,
        updated_at = now()
    WHERE id = NEW.template_sncf_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_processo_to_sncf ON public.processos;
CREATE TRIGGER trg_sync_processo_to_sncf
  AFTER UPDATE OF nome, descricao ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.sync_processo_to_sncf_template();

DROP TRIGGER IF EXISTS trg_processos_updated_at ON public.processos;
CREATE TRIGGER trg_processos_updated_at
  BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 1.9 Função publicar versão
-- ============================================================
CREATE OR REPLACE FUNCTION public.processos_publicar_versao(
  _processo_id UUID,
  _motivo TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  p RECORD;
  nova_versao INTEGER;
  v_tags_snapshot JSONB;
BEGIN
  SELECT * INTO p FROM public.processos WHERE id = _processo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Processo não encontrado: %', _processo_id;
  END IF;

  IF NOT (has_role(auth.uid(), 'super_admin') OR p.owner_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para publicar versão deste processo';
  END IF;

  nova_versao := p.versao_atual + 1;

  v_tags_snapshot := jsonb_build_object(
    'areas', (SELECT coalesce(jsonb_agg(area_id), '[]'::jsonb) FROM public.processos_tags_areas WHERE processo_id = _processo_id),
    'departamentos', (SELECT coalesce(jsonb_agg(departamento_id), '[]'::jsonb) FROM public.processos_tags_departamentos WHERE processo_id = _processo_id),
    'unidades', (SELECT coalesce(jsonb_agg(unidade_id), '[]'::jsonb) FROM public.processos_tags_unidades WHERE processo_id = _processo_id),
    'cargos', (SELECT coalesce(jsonb_agg(cargo_id), '[]'::jsonb) FROM public.processos_tags_cargos WHERE processo_id = _processo_id),
    'sistemas', (SELECT coalesce(jsonb_agg(sistema_id), '[]'::jsonb) FROM public.processos_tags_sistemas WHERE processo_id = _processo_id),
    'tipos_colaborador', (SELECT coalesce(jsonb_agg(tipo), '[]'::jsonb) FROM public.processos_tags_tipos_colaborador WHERE processo_id = _processo_id)
  );

  INSERT INTO public.processos_versoes (
    processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot,
    natureza_snapshot, tags_snapshot, publicado_por, motivo_alteracao
  ) VALUES (
    _processo_id, nova_versao, p.nome, p.descricao, p.narrativa,
    p.natureza_valor, v_tags_snapshot, auth.uid(), _motivo
  );

  UPDATE public.processos
  SET versao_atual = nova_versao,
      versao_vigente_em = now(),
      status_valor = 'vigente',
      updated_at = now()
  WHERE id = _processo_id;

  RETURN nova_versao;
END;
$$;

GRANT EXECUTE ON FUNCTION public.processos_publicar_versao TO authenticated;

-- ============================================================
-- 1.10 View unificada
-- ============================================================
CREATE OR REPLACE VIEW public.processos_unificados AS
SELECT
  p.id,
  p.codigo,
  p.nome,
  p.descricao,
  p.narrativa,
  p.natureza_valor,
  p.status_valor,
  p.versao_atual,
  p.versao_vigente_em,
  p.owner_user_id,
  p.owner_perfil_codigo,
  pr.full_name AS owner_nome,
  p.area_negocio_id,
  ap.label AS area_nome,
  p.template_sncf_id,
  p.sensivel,
  p.updated_at,
  p.created_at,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.area_id, 'label', pr2.label)), '[]'::jsonb)
   FROM public.processos_tags_areas a
   JOIN public.parametros pr2 ON pr2.id = a.area_id
   WHERE a.processo_id = p.id) AS tags_areas,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', d.departamento_id, 'label', pr3.label)), '[]'::jsonb)
   FROM public.processos_tags_departamentos d
   JOIN public.parametros pr3 ON pr3.id = d.departamento_id
   WHERE d.processo_id = p.id) AS tags_departamentos,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', u.unidade_id, 'label', un.nome)), '[]'::jsonb)
   FROM public.processos_tags_unidades u
   JOIN public.unidades un ON un.id = u.unidade_id
   WHERE u.processo_id = p.id) AS tags_unidades,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', c.cargo_id, 'label', cg.nome)), '[]'::jsonb)
   FROM public.processos_tags_cargos c
   JOIN public.cargos cg ON cg.id = c.cargo_id
   WHERE c.processo_id = p.id) AS tags_cargos,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.sistema_id, 'label', ss.nome)), '[]'::jsonb)
   FROM public.processos_tags_sistemas s
   JOIN public.sncf_sistemas ss ON ss.id = s.sistema_id
   WHERE s.processo_id = p.id) AS tags_sistemas,
  (SELECT coalesce(jsonb_agg(tc.tipo), '[]'::jsonb)
   FROM public.processos_tags_tipos_colaborador tc
   WHERE tc.processo_id = p.id) AS tags_tipos_colaborador,
  (SELECT COUNT(*) FROM public.processos_log_consultas WHERE processo_id = p.id) AS total_consultas,
  (SELECT COUNT(*) FROM public.processos_log_consultas WHERE processo_id = p.id AND consultado_em > now() - interval '30 days') AS consultas_30d,
  (SELECT COUNT(*) FROM public.processos_sugestoes WHERE processo_id = p.id AND status = 'pendente') AS sugestoes_pendentes
FROM public.processos p
LEFT JOIN public.profiles pr ON pr.user_id = p.owner_user_id
LEFT JOIN public.parametros ap ON ap.id = p.area_negocio_id;

GRANT SELECT ON public.processos_unificados TO authenticated;

COMMENT ON VIEW public.processos_unificados IS 'View consolidada de processos com tags e indicadores. Use para a tela /processos.';

-- ============================================================
-- 1.11 Função registrar consulta
-- ============================================================
CREATE OR REPLACE FUNCTION public.registrar_consulta_processo(_processo_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.processos_log_consultas (processo_id, user_id)
  VALUES (_processo_id, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_consulta_processo TO authenticated;