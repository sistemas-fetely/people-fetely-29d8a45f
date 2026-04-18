-- ═══════════════════════════════════════════════════════════════
-- FASE A — Modelo de permissões v2 (em paralelo ao antigo)
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- MIGRATION 1 — Tabelas novas
-- ───────────────────────────────────────────────────────────────

-- Unidades da Fetely
CREATE TABLE IF NOT EXISTS public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('matriz','filial','fabrica','ecommerce','externa')),
  cnpj TEXT,
  cidade TEXT,
  estado TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unidades_leitura_authenticated" ON public.unidades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "unidades_escrita_super_admin" ON public.unidades
  FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Seed das 4 unidades reais
INSERT INTO public.unidades (codigo, nome, tipo, cidade, estado) VALUES
  ('matriz_sp', 'Fetely Matriz SP', 'matriz', 'São Paulo', 'SP'),
  ('joinville', 'Fetely Joinville', 'filial', 'Joinville', 'SC'),
  ('fabrica_sp', 'Fábrica SP', 'fabrica', 'São Paulo', 'SP'),
  ('ecommerce', 'Fetely Ecommerce', 'ecommerce', 'São Paulo', 'SP')
ON CONFLICT (codigo) DO NOTHING;

-- Perfis
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('area','transversal')),
  area TEXT,
  nivel_sugerido TEXT CHECK (nivel_sugerido IN ('estagio','assistente','analista','coordenador','gerente','diretor')),
  descricao TEXT,
  is_sistema BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((tipo = 'area' AND area IS NOT NULL) OR (tipo = 'transversal' AND area IS NULL))
);

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfis_leitura_authenticated" ON public.perfis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "perfis_escrita_super_admin" ON public.perfis
  FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Seed dos perfis (transversais primeiro, depois áreas)
INSERT INTO public.perfis (codigo, nome, tipo, area, descricao, is_sistema) VALUES
  ('super_admin',         'Super Admin',         'transversal', NULL, 'Acesso total ao sistema — só sócios/condutores do projeto', true),
  ('diretoria_executiva', 'Diretoria Executiva', 'transversal', NULL, 'Visibilidade executiva total sem poder de configuração', true),
  ('gestao_direta',       'Gestão Direta',       'transversal', NULL, 'Líder de time em qualquer área', true),
  ('colaborador',         'Colaborador',         'transversal', NULL, 'Papel base de todo colaborador — dá acesso às próprias coisas', true),
  ('rh',                  'RH',                  'area', 'rh',             'Recursos Humanos', true),
  ('financeiro',          'Financeiro',          'area', 'financeiro',     'Financeiro e contábil', true),
  ('administrativo',      'Administrativo',      'area', 'administrativo', 'Administrativo, compras, facilities', true),
  ('operacional',         'Operacional',         'area', 'operacional',    'Operações (fábrica, produção)', true),
  ('ti',                  'TI',                  'area', 'ti',             'Tecnologia da Informação', true),
  ('recrutamento',        'Recrutamento',        'area', 'recrutamento',   'Recrutamento e seleção', true),
  ('fiscal',              'Fiscal',              'area', 'fiscal',         'Fiscal e contábil externo', true)
ON CONFLICT (codigo) DO NOTHING;

-- Pacotes de permissão
CREATE TABLE IF NOT EXISTS public.permission_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  is_sistema BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packs_leitura_authenticated" ON public.permission_packs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "packs_escrita_super_admin" ON public.permission_packs
  FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Itens de cada pacote (o que ele concede)
CREATE TABLE IF NOT EXISTS public.permission_pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.permission_packs(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  nivel_minimo TEXT CHECK (nivel_minimo IN ('estagio','assistente','analista','coordenador','gerente','diretor')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pack_id, modulo, acao)
);

ALTER TABLE public.permission_pack_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pack_items_leitura" ON public.permission_pack_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pack_items_escrita_super_admin" ON public.permission_pack_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Quais pacotes cada perfil inclui
CREATE TABLE IF NOT EXISTS public.perfil_packs (
  perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.permission_packs(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (perfil_id, pack_id)
);

ALTER TABLE public.perfil_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfil_packs_leitura" ON public.perfil_packs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "perfil_packs_escrita_super_admin" ON public.perfil_packs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Atribuições de usuário (SUBSTITUI user_roles na fase v2)
CREATE TABLE IF NOT EXISTS public.user_atribuicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES public.perfis(id),
  unidade_id UUID REFERENCES public.unidades(id),
  nivel TEXT CHECK (nivel IN ('estagio','assistente','analista','coordenador','gerente','diretor')),
  valido_ate DATE,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, perfil_id, unidade_id)
);

CREATE INDEX IF NOT EXISTS idx_user_atribuicoes_user ON public.user_atribuicoes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_atribuicoes_perfil ON public.user_atribuicoes(perfil_id);
CREATE INDEX IF NOT EXISTS idx_user_atribuicoes_unidade ON public.user_atribuicoes(unidade_id);

ALTER TABLE public.user_atribuicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_atribuicoes_self" ON public.user_atribuicoes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_atribuicoes_super_admin" ON public.user_atribuicoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "user_atribuicoes_rh" ON public.user_atribuicoes
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin_rh') OR has_role_with_level(auth.uid(), 'rh', 'coordenador'))
    AND NOT EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.id = user_atribuicoes.perfil_id AND p.codigo = 'super_admin'
    )
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin_rh') OR has_role_with_level(auth.uid(), 'rh', 'coordenador'))
    AND NOT EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.id = user_atribuicoes.perfil_id AND p.codigo = 'super_admin'
    )
  );

-- ───────────────────────────────────────────────────────────────
-- MIGRATION 2 — Trigger Regra 19: escopo sempre explícito
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validar_escopo_atribuicao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tipo TEXT;
BEGIN
  SELECT tipo INTO v_tipo FROM public.perfis WHERE id = NEW.perfil_id;

  IF v_tipo = 'area' AND NEW.unidade_id IS NULL THEN
    RAISE EXCEPTION 'Escopo obrigatório para perfil de área (Regra 19 na Pedra). Escolha uma unidade específica.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_tipo = 'transversal' AND NEW.unidade_id IS NOT NULL THEN
    RAISE EXCEPTION 'Perfis transversais (como Super Admin, Diretoria, Colaborador) não têm escopo de unidade.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_tipo = 'area' AND NEW.nivel IS NULL THEN
    RAISE EXCEPTION 'Perfil de área exige um nível (Estágio/Assistente/Analista/Coordenador/Gerente/Diretor).'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_escopo ON public.user_atribuicoes;
CREATE TRIGGER trg_validar_escopo
  BEFORE INSERT OR UPDATE ON public.user_atribuicoes
  FOR EACH ROW EXECUTE FUNCTION public.validar_escopo_atribuicao();

-- ───────────────────────────────────────────────────────────────
-- MIGRATION 3 — Trigger audit em user_atribuicoes
-- ───────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_audit_user_atribuicoes ON public.user_atribuicoes;
CREATE TRIGGER trg_audit_user_atribuicoes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_atribuicoes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

-- ───────────────────────────────────────────────────────────────
-- MIGRATION 4 — Proteção super_admin v2 (Regra 2)
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.proteger_super_admin_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT codigo INTO v_codigo FROM public.perfis WHERE id = OLD.perfil_id;
  ELSE
    SELECT codigo INTO v_codigo FROM public.perfis WHERE id = NEW.perfil_id;
  END IF;

  IF v_codigo = 'super_admin' AND auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Apenas Super Admin pode atribuir/remover o perfil Super Admin (Regra 2 na Pedra)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_super_admin_v2 ON public.user_atribuicoes;
CREATE TRIGGER trg_proteger_super_admin_v2
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_atribuicoes
  FOR EACH ROW EXECUTE FUNCTION public.proteger_super_admin_v2();

-- ───────────────────────────────────────────────────────────────
-- MIGRATION 5 — Seed dos Pacotes de Permissão
-- ───────────────────────────────────────────────────────────────

INSERT INTO public.permission_packs (codigo, nome, descricao, is_sistema) VALUES
  ('basico_autogestao',     'Básico — Autogestão',           'Dashboard, Tarefas, Fala Fetely, Memórias próprias', true),
  ('pessoas_leitura',       'Pessoas — Leitura',              'Ver Pessoas, Organograma, Colaboradores, Contratos PJ', true),
  ('pessoas_gestao',        'Pessoas — Gestão',               'Gestão completa de pessoas (cadastro, edição, movimentações)', true),
  ('folha_operacional',     'Folha — Operacional',            'Lançar holerites, editar competência', true),
  ('folha_fechamento',      'Folha — Fechamento',             'Fechar competência + exportar', true),
  ('financeiro_nf_pj',      'Financeiro — NFs e PJ',          'Lançar e aprovar NFs, pagamentos PJ', true),
  ('configuracao_sistema',  'Configuração do Sistema',        'Parâmetros, Usuários, Matriz', true),
  ('ti_operacao',           'TI — Operação',                  'Ativos, Documentação Viva, Convites', true),
  ('fala_fetely_curadoria', 'Fala Fetely — Curadoria',        'Base de Conhecimento, Importar PDF, Aprovar sugestões', true),
  ('aprovacoes_time',       'Aprovações do Time',             'Aprovar férias, movimentações, solicitações do time', true),
  ('relatorios_visualizar', 'Relatórios — Visualizar',        'Ver relatórios agregados', true),
  ('relatorios_exportar',   'Relatórios — Exportar',          'Exportar relatórios', true)
ON CONFLICT (codigo) DO NOTHING;

WITH p AS (SELECT id, codigo FROM public.permission_packs)
INSERT INTO public.permission_pack_items (pack_id, modulo, acao, nivel_minimo) VALUES
  ((SELECT id FROM p WHERE codigo='basico_autogestao'), 'dashboard', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='basico_autogestao'), 'tarefas', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='basico_autogestao'), 'tarefas', 'create', NULL),
  ((SELECT id FROM p WHERE codigo='basico_autogestao'), 'tarefas', 'edit', NULL),
  ((SELECT id FROM p WHERE codigo='basico_autogestao'), 'fala_fetely', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='basico_autogestao'), 'conhecimento_fetely', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='basico_autogestao'), 'memorias_fetely', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='basico_autogestao'), 'memorias_fetely', 'create', NULL),
  ((SELECT id FROM p WHERE codigo='basico_autogestao'), 'memorias_fetely', 'edit', NULL),
  ((SELECT id FROM p WHERE codigo='basico_autogestao'), 'memorias_fetely', 'delete', NULL),

  ((SELECT id FROM p WHERE codigo='pessoas_leitura'), 'pessoas', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='pessoas_leitura'), 'organograma', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='pessoas_leitura'), 'colaboradores', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='pessoas_leitura'), 'contratos_pj', 'view', NULL),

  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'pessoas', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'pessoas', 'create', 'assistente'),
  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'pessoas', 'edit', 'assistente'),
  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'colaboradores', 'create', 'assistente'),
  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'colaboradores', 'edit', 'assistente'),
  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'colaboradores', 'delete', 'coordenador'),
  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'movimentacoes', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'movimentacoes', 'create', 'analista'),
  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'onboarding', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'onboarding', 'create', 'assistente'),
  ((SELECT id FROM p WHERE codigo='pessoas_gestao'), 'onboarding', 'edit', 'assistente'),

  ((SELECT id FROM p WHERE codigo='folha_operacional'), 'folha_pagamento', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='folha_operacional'), 'folha_pagamento', 'create', 'assistente'),
  ((SELECT id FROM p WHERE codigo='folha_operacional'), 'folha_pagamento', 'edit', 'assistente'),

  ((SELECT id FROM p WHERE codigo='folha_fechamento'), 'folha_pagamento', 'fechar', 'coordenador'),
  ((SELECT id FROM p WHERE codigo='folha_fechamento'), 'folha_pagamento', 'exportar', 'analista'),

  ((SELECT id FROM p WHERE codigo='financeiro_nf_pj'), 'notas_fiscais', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='financeiro_nf_pj'), 'notas_fiscais', 'create', 'assistente'),
  ((SELECT id FROM p WHERE codigo='financeiro_nf_pj'), 'notas_fiscais', 'edit', 'assistente'),
  ((SELECT id FROM p WHERE codigo='financeiro_nf_pj'), 'notas_fiscais', 'aprovar', 'analista'),
  ((SELECT id FROM p WHERE codigo='financeiro_nf_pj'), 'notas_fiscais', 'enviar_email', 'analista'),
  ((SELECT id FROM p WHERE codigo='financeiro_nf_pj'), 'pagamentos_pj', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='financeiro_nf_pj'), 'pagamentos_pj', 'create', 'assistente'),
  ((SELECT id FROM p WHERE codigo='financeiro_nf_pj'), 'pagamentos_pj', 'aprovar', 'analista'),

  ((SELECT id FROM p WHERE codigo='configuracao_sistema'), 'usuarios', 'view', 'coordenador'),
  ((SELECT id FROM p WHERE codigo='configuracao_sistema'), 'usuarios', 'create', 'coordenador'),
  ((SELECT id FROM p WHERE codigo='configuracao_sistema'), 'usuarios', 'edit', 'coordenador'),
  ((SELECT id FROM p WHERE codigo='configuracao_sistema'), 'parametros', 'view', 'coordenador'),
  ((SELECT id FROM p WHERE codigo='configuracao_sistema'), 'parametros', 'edit', 'gerente'),

  ((SELECT id FROM p WHERE codigo='ti_operacao'), 'ti_ativos', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='ti_operacao'), 'ti_ativos', 'create', 'assistente'),
  ((SELECT id FROM p WHERE codigo='ti_operacao'), 'ti_ativos', 'edit', 'assistente'),
  ((SELECT id FROM p WHERE codigo='ti_operacao'), 'ti_ativos', 'delete', 'coordenador'),
  ((SELECT id FROM p WHERE codigo='ti_operacao'), 'documentacao', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='ti_operacao'), 'documentacao', 'edit', 'analista'),
  ((SELECT id FROM p WHERE codigo='ti_operacao'), 'convites', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='ti_operacao'), 'convites', 'create', 'assistente'),
  ((SELECT id FROM p WHERE codigo='ti_operacao'), 'convites', 'enviar', 'assistente'),

  ((SELECT id FROM p WHERE codigo='fala_fetely_curadoria'), 'conhecimento_fetely', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='fala_fetely_curadoria'), 'conhecimento_fetely', 'create', 'analista'),
  ((SELECT id FROM p WHERE codigo='fala_fetely_curadoria'), 'conhecimento_fetely', 'edit', 'analista'),
  ((SELECT id FROM p WHERE codigo='fala_fetely_curadoria'), 'conhecimento_fetely', 'delete', 'coordenador'),
  ((SELECT id FROM p WHERE codigo='fala_fetely_curadoria'), 'importacao_pdf', 'view', 'analista'),
  ((SELECT id FROM p WHERE codigo='fala_fetely_curadoria'), 'importacao_pdf', 'create', 'analista'),
  ((SELECT id FROM p WHERE codigo='fala_fetely_curadoria'), 'sugestoes_conhecimento', 'view', 'analista'),
  ((SELECT id FROM p WHERE codigo='fala_fetely_curadoria'), 'sugestoes_conhecimento', 'edit', 'analista'),

  ((SELECT id FROM p WHERE codigo='aprovacoes_time'), 'ferias', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='aprovacoes_time'), 'ferias', 'aprovar', 'coordenador'),
  ((SELECT id FROM p WHERE codigo='aprovacoes_time'), 'movimentacoes', 'aprovar', 'coordenador'),

  ((SELECT id FROM p WHERE codigo='relatorios_visualizar'), 'relatorios', 'view', NULL),
  ((SELECT id FROM p WHERE codigo='relatorios_exportar'), 'relatorios', 'exportar', 'analista')
ON CONFLICT (pack_id, modulo, acao) DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- MIGRATION 6 — Amarração inicial: Perfis ↔ Pacotes
-- ───────────────────────────────────────────────────────────────

WITH pf AS (SELECT id, codigo FROM public.perfis),
     pk AS (SELECT id, codigo FROM public.permission_packs)
INSERT INTO public.perfil_packs (perfil_id, pack_id) VALUES
  -- Super Admin
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='pessoas_gestao')),
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='folha_operacional')),
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='folha_fechamento')),
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='financeiro_nf_pj')),
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='configuracao_sistema')),
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='ti_operacao')),
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='fala_fetely_curadoria')),
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='aprovacoes_time')),
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='relatorios_visualizar')),
  ((SELECT id FROM pf WHERE codigo='super_admin'), (SELECT id FROM pk WHERE codigo='relatorios_exportar')),

  -- Diretoria Executiva
  ((SELECT id FROM pf WHERE codigo='diretoria_executiva'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='diretoria_executiva'), (SELECT id FROM pk WHERE codigo='pessoas_leitura')),
  ((SELECT id FROM pf WHERE codigo='diretoria_executiva'), (SELECT id FROM pk WHERE codigo='relatorios_visualizar')),

  -- Colaborador
  ((SELECT id FROM pf WHERE codigo='colaborador'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),

  -- Gestão Direta
  ((SELECT id FROM pf WHERE codigo='gestao_direta'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='gestao_direta'), (SELECT id FROM pk WHERE codigo='pessoas_leitura')),
  ((SELECT id FROM pf WHERE codigo='gestao_direta'), (SELECT id FROM pk WHERE codigo='aprovacoes_time')),

  -- RH
  ((SELECT id FROM pf WHERE codigo='rh'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='rh'), (SELECT id FROM pk WHERE codigo='pessoas_gestao')),
  ((SELECT id FROM pf WHERE codigo='rh'), (SELECT id FROM pk WHERE codigo='aprovacoes_time')),
  ((SELECT id FROM pf WHERE codigo='rh'), (SELECT id FROM pk WHERE codigo='fala_fetely_curadoria')),
  ((SELECT id FROM pf WHERE codigo='rh'), (SELECT id FROM pk WHERE codigo='relatorios_visualizar')),

  -- Financeiro
  ((SELECT id FROM pf WHERE codigo='financeiro'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='financeiro'), (SELECT id FROM pk WHERE codigo='pessoas_leitura')),
  ((SELECT id FROM pf WHERE codigo='financeiro'), (SELECT id FROM pk WHERE codigo='folha_operacional')),
  ((SELECT id FROM pf WHERE codigo='financeiro'), (SELECT id FROM pk WHERE codigo='folha_fechamento')),
  ((SELECT id FROM pf WHERE codigo='financeiro'), (SELECT id FROM pk WHERE codigo='financeiro_nf_pj')),
  ((SELECT id FROM pf WHERE codigo='financeiro'), (SELECT id FROM pk WHERE codigo='relatorios_visualizar')),
  ((SELECT id FROM pf WHERE codigo='financeiro'), (SELECT id FROM pk WHERE codigo='relatorios_exportar')),

  -- Administrativo
  ((SELECT id FROM pf WHERE codigo='administrativo'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='administrativo'), (SELECT id FROM pk WHERE codigo='pessoas_leitura')),

  -- Operacional
  ((SELECT id FROM pf WHERE codigo='operacional'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='operacional'), (SELECT id FROM pk WHERE codigo='pessoas_leitura')),
  ((SELECT id FROM pf WHERE codigo='operacional'), (SELECT id FROM pk WHERE codigo='aprovacoes_time')),

  -- TI
  ((SELECT id FROM pf WHERE codigo='ti'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='ti'), (SELECT id FROM pk WHERE codigo='pessoas_leitura')),
  ((SELECT id FROM pf WHERE codigo='ti'), (SELECT id FROM pk WHERE codigo='ti_operacao')),
  ((SELECT id FROM pf WHERE codigo='ti'), (SELECT id FROM pk WHERE codigo='configuracao_sistema')),

  -- Recrutamento
  ((SELECT id FROM pf WHERE codigo='recrutamento'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='recrutamento'), (SELECT id FROM pk WHERE codigo='pessoas_leitura')),

  -- Fiscal
  ((SELECT id FROM pf WHERE codigo='fiscal'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='fiscal'), (SELECT id FROM pk WHERE codigo='pessoas_leitura')),
  ((SELECT id FROM pf WHERE codigo='fiscal'), (SELECT id FROM pk WHERE codigo='relatorios_visualizar')),
  ((SELECT id FROM pf WHERE codigo='fiscal'), (SELECT id FROM pk WHERE codigo='relatorios_exportar'))
ON CONFLICT DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- MIGRATION 7 — Migrar os 4 usuários atuais para user_atribuicoes
-- ───────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_matriz_sp UUID;
  v_joseph UUID;
  v_flavio UUID;
  v_flavio_sim UUID;
  v_isabella UUID;
BEGIN
  SELECT id INTO v_matriz_sp FROM public.unidades WHERE codigo = 'matriz_sp';

  SELECT p.user_id INTO v_joseph
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE u.email = 'joseph@fetely.com.br' LIMIT 1;

  SELECT p.user_id INTO v_flavio
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE u.email = 'flavio@fetely.com.br' LIMIT 1;

  SELECT p.user_id INTO v_flavio_sim
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE u.email = 'sistemas@fetely.com.br' LIMIT 1;

  SELECT p.user_id INTO v_isabella
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE u.email = 'isabella.vieira@fetely.com.br' LIMIT 1;

  -- Joseph: Diretoria Executiva
  IF v_joseph IS NOT NULL THEN
    INSERT INTO public.user_atribuicoes (user_id, perfil_id, unidade_id, nivel)
    SELECT v_joseph, id, NULL, NULL FROM public.perfis WHERE codigo = 'diretoria_executiva'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Flavio: Super Admin + RH Diretor em Matriz SP
  IF v_flavio IS NOT NULL THEN
    INSERT INTO public.user_atribuicoes (user_id, perfil_id, unidade_id, nivel)
    SELECT v_flavio, id, NULL, NULL FROM public.perfis WHERE codigo = 'super_admin'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_atribuicoes (user_id, perfil_id, unidade_id, nivel)
    SELECT v_flavio, id, v_matriz_sp, 'diretor' FROM public.perfis WHERE codigo = 'rh'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Flavio Sistemas: Super Admin
  IF v_flavio_sim IS NOT NULL THEN
    INSERT INTO public.user_atribuicoes (user_id, perfil_id, unidade_id, nivel)
    SELECT v_flavio_sim, id, NULL, NULL FROM public.perfis WHERE codigo = 'super_admin'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Isabella: Colaborador + Administrativo Assistente em Matriz SP
  IF v_isabella IS NOT NULL THEN
    INSERT INTO public.user_atribuicoes (user_id, perfil_id, unidade_id, nivel)
    SELECT v_isabella, id, NULL, NULL FROM public.perfis WHERE codigo = 'colaborador'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_atribuicoes (user_id, perfil_id, unidade_id, nivel)
    SELECT v_isabella, id, v_matriz_sp, 'assistente' FROM public.perfis WHERE codigo = 'administrativo'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;