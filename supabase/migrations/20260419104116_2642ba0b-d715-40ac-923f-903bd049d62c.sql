-- Parte 1.1: Enum de contextos
DO $$ BEGIN
  CREATE TYPE public.contexto_acesso_salario AS ENUM (
    'proprio', 'folha', 'holerite', 'admissao', 'convite',
    'revisao_salarial', 'recrutamento', 'dashboard_custos',
    'organograma', 'relatorio_pj', 'auditoria'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Parte 1.2: Tabela de política
CREATE TABLE IF NOT EXISTS public.politica_visibilidade_salario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contexto public.contexto_acesso_salario NOT NULL,
  perfil_codigo TEXT NOT NULL REFERENCES public.perfis(codigo) ON UPDATE CASCADE,
  modo TEXT NOT NULL CHECK (modo IN ('direto', 'revelar_com_log', 'oculto')),
  observacao TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contexto, perfil_codigo)
);

COMMENT ON TABLE public.politica_visibilidade_salario IS
  'Politica formal de visibilidade salarial. Chave: (contexto, perfil_codigo). Modo: direto=sem mascara, revelar_com_log=clique registra log, oculto=nunca aparece.';

ALTER TABLE public.politica_visibilidade_salario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "politica_salario_leitura_authenticated" ON public.politica_visibilidade_salario;
CREATE POLICY "politica_salario_leitura_authenticated" ON public.politica_visibilidade_salario
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "politica_salario_escrita_super_admin" ON public.politica_visibilidade_salario;
CREATE POLICY "politica_salario_escrita_super_admin" ON public.politica_visibilidade_salario
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Parte 1.3: Seed da matriz
INSERT INTO public.politica_visibilidade_salario (contexto, perfil_codigo, modo, observacao) VALUES
  ('proprio', 'super_admin', 'direto', 'Super Admin sempre ve'),
  ('folha', 'super_admin', 'direto', NULL),
  ('holerite', 'super_admin', 'direto', NULL),
  ('admissao', 'super_admin', 'direto', NULL),
  ('convite', 'super_admin', 'direto', NULL),
  ('revisao_salarial', 'super_admin', 'direto', NULL),
  ('recrutamento', 'super_admin', 'direto', NULL),
  ('dashboard_custos', 'super_admin', 'direto', NULL),
  ('organograma', 'super_admin', 'revelar_com_log', 'Log agregado'),
  ('relatorio_pj', 'super_admin', 'direto', NULL),
  ('auditoria', 'super_admin', 'direto', NULL),

  ('folha', 'diretoria_executiva', 'direto', NULL),
  ('holerite', 'diretoria_executiva', 'direto', NULL),
  ('admissao', 'diretoria_executiva', 'revelar_com_log', NULL),
  ('convite', 'diretoria_executiva', 'revelar_com_log', NULL),
  ('revisao_salarial', 'diretoria_executiva', 'direto', NULL),
  ('recrutamento', 'diretoria_executiva', 'direto', NULL),
  ('dashboard_custos', 'diretoria_executiva', 'direto', NULL),
  ('organograma', 'diretoria_executiva', 'revelar_com_log', NULL),
  ('relatorio_pj', 'diretoria_executiva', 'direto', NULL),
  ('auditoria', 'diretoria_executiva', 'direto', NULL),

  ('folha', 'rh', 'direto', 'Processamento de folha'),
  ('holerite', 'rh', 'direto', NULL),
  ('admissao', 'rh', 'direto', 'Lancamento de novo colaborador'),
  ('convite', 'rh', 'direto', NULL),
  ('revisao_salarial', 'rh', 'direto', NULL),
  ('recrutamento', 'rh', 'direto', NULL),
  ('dashboard_custos', 'rh', 'revelar_com_log', NULL),
  ('organograma', 'rh', 'revelar_com_log', NULL),
  ('relatorio_pj', 'rh', 'direto', NULL),
  ('auditoria', 'rh', 'direto', NULL),

  ('folha', 'financeiro', 'direto', NULL),
  ('holerite', 'financeiro', 'direto', NULL),
  ('relatorio_pj', 'financeiro', 'direto', NULL),
  ('dashboard_custos', 'financeiro', 'direto', NULL),
  ('admissao', 'financeiro', 'revelar_com_log', NULL),
  ('revisao_salarial', 'financeiro', 'direto', NULL),
  ('convite', 'financeiro', 'revelar_com_log', NULL),
  ('recrutamento', 'financeiro', 'revelar_com_log', NULL),
  ('organograma', 'financeiro', 'oculto', NULL),
  ('auditoria', 'financeiro', 'direto', NULL),

  ('admissao', 'gestao_direta', 'revelar_com_log', 'Apenas no time direto'),
  ('revisao_salarial', 'gestao_direta', 'revelar_com_log', NULL),
  ('recrutamento', 'gestao_direta', 'revelar_com_log', NULL),
  ('organograma', 'gestao_direta', 'revelar_com_log', NULL),
  ('dashboard_custos', 'gestao_direta', 'oculto', 'Dashboard agregado'),
  ('folha', 'gestao_direta', 'oculto', NULL),
  ('holerite', 'gestao_direta', 'oculto', NULL),
  ('relatorio_pj', 'gestao_direta', 'oculto', NULL),
  ('convite', 'gestao_direta', 'oculto', NULL),

  ('recrutamento', 'recrutamento', 'direto', NULL),
  ('convite', 'recrutamento', 'revelar_com_log', NULL),
  ('admissao', 'recrutamento', 'revelar_com_log', NULL),

  ('folha', 'fiscal', 'direto', NULL),
  ('holerite', 'fiscal', 'direto', NULL),
  ('relatorio_pj', 'fiscal', 'direto', NULL),

  ('organograma', 'colaborador', 'oculto', NULL)
ON CONFLICT (contexto, perfil_codigo) DO NOTHING;

-- Parte 1.4: Função de decisão centralizada
CREATE OR REPLACE FUNCTION public.decisao_salario(
  _viewer_id UUID,
  _alvo_user_id UUID,
  _contexto public.contexto_acesso_salario
)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_modo_mais_permissivo TEXT := 'oculto';
  v_modo TEXT;
  v_perfil RECORD;
  v_eh_gestor_do_alvo BOOLEAN := false;
BEGIN
  IF _alvo_user_id IS NOT NULL AND _alvo_user_id = _viewer_id THEN
    RETURN 'direto';
  END IF;

  IF public.has_role(_viewer_id, 'super_admin') THEN
    RETURN 'direto';
  END IF;

  IF _alvo_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1
      FROM public.colaboradores_clt c
      JOIN public.profiles p_gestor ON p_gestor.id = c.gestor_direto_id
      WHERE c.user_id = _alvo_user_id AND p_gestor.user_id = _viewer_id
      UNION
      SELECT 1
      FROM public.contratos_pj cpj
      JOIN public.profiles p_gestor ON p_gestor.id = cpj.gestor_direto_id
      WHERE cpj.user_id = _alvo_user_id AND p_gestor.user_id = _viewer_id
    ) INTO v_eh_gestor_do_alvo;
  END IF;

  FOR v_perfil IN
    SELECT DISTINCT p.codigo
    FROM public.user_atribuicoes ua
    JOIN public.perfis p ON p.id = ua.perfil_id
    WHERE ua.user_id = _viewer_id AND p.ativo = true
      AND (ua.valido_ate IS NULL OR ua.valido_ate >= CURRENT_DATE)
  LOOP
    SELECT modo INTO v_modo
    FROM public.politica_visibilidade_salario
    WHERE contexto = _contexto AND perfil_codigo = v_perfil.codigo;

    IF v_modo IS NULL THEN CONTINUE; END IF;

    IF v_perfil.codigo = 'gestao_direta' AND NOT v_eh_gestor_do_alvo THEN
      CONTINUE;
    END IF;

    IF v_modo = 'direto' THEN RETURN 'direto'; END IF;
    IF v_modo = 'revelar_com_log' AND v_modo_mais_permissivo = 'oculto' THEN
      v_modo_mais_permissivo := 'revelar_com_log';
    END IF;
  END LOOP;

  RETURN v_modo_mais_permissivo;
END;
$$;

COMMENT ON FUNCTION public.decisao_salario IS
  'Consulta a politica_visibilidade_salario e retorna o modo aplicavel: direto, revelar_com_log ou oculto.';

-- Parte 1.4b: RPC bulk para listas grandes
CREATE OR REPLACE FUNCTION public.decisao_salario_lote(
  _alvo_user_ids UUID[],
  _contexto public.contexto_acesso_salario
)
RETURNS TABLE(alvo_user_id UUID, modo TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_alvo UUID;
  v_viewer UUID := auth.uid();
BEGIN
  IF _alvo_user_ids IS NULL OR array_length(_alvo_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  FOREACH v_alvo IN ARRAY _alvo_user_ids LOOP
    alvo_user_id := v_alvo;
    modo := public.decisao_salario(v_viewer, v_alvo, _contexto);
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$;

-- Parte 1.5: Enriquecer log (adaptado ao schema atual: user_id, created_at)
ALTER TABLE public.acesso_dados_log ADD COLUMN IF NOT EXISTS em_lote BOOLEAN DEFAULT false;
ALTER TABLE public.acesso_dados_log ADD COLUMN IF NOT EXISTS justificativa TEXT;
ALTER TABLE public.acesso_dados_log ADD COLUMN IF NOT EXISTS quantidade_alvos INT DEFAULT 1;

CREATE OR REPLACE FUNCTION public.registrar_acesso_salario_lote(
  _alvo_user_ids UUID[],
  _contexto public.contexto_acesso_salario,
  _justificativa TEXT
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_alvo UUID;
  v_viewer UUID := auth.uid();
  v_count INT := 0;
  v_user_nome TEXT;
  v_alvo_nome TEXT;
  v_total INT := array_length(_alvo_user_ids, 1);
BEGIN
  IF v_total IS NULL OR v_total = 0 THEN RETURN 0; END IF;

  SELECT full_name INTO v_user_nome FROM public.profiles WHERE user_id = v_viewer;

  FOREACH v_alvo IN ARRAY _alvo_user_ids LOOP
    IF v_alvo IS NULL OR v_alvo = v_viewer THEN CONTINUE; END IF;

    SELECT full_name INTO v_alvo_nome FROM public.profiles WHERE user_id = v_alvo;

    INSERT INTO public.acesso_dados_log (
      user_id, user_nome, alvo_user_id, alvo_nome,
      tipo_dado, tabela_origem, contexto,
      em_lote, justificativa, quantidade_alvos
    ) VALUES (
      v_viewer, v_user_nome, v_alvo, v_alvo_nome,
      'salario', 'politica', _contexto::TEXT,
      true, _justificativa, v_total
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Parte 1.6: View para portal do colaborador (adaptada: user_id, created_at)
CREATE OR REPLACE VIEW public.meus_acessos_salario AS
SELECT
  l.id,
  l.user_id AS ator_user_id,
  COALESCE(l.user_nome, p_ator.full_name) AS ator_nome,
  l.contexto,
  l.justificativa,
  COALESCE(l.em_lote, false) AS em_lote,
  COALESCE(l.quantidade_alvos, 1) AS quantidade_alvos,
  l.created_at AS criado_em
FROM public.acesso_dados_log l
LEFT JOIN public.profiles p_ator ON p_ator.user_id = l.user_id
WHERE l.tipo_dado = 'salario'
  AND l.alvo_user_id = auth.uid()
ORDER BY l.created_at DESC;

GRANT SELECT ON public.meus_acessos_salario TO authenticated;