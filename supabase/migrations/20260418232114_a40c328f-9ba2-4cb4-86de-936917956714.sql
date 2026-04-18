-- 1.1 FKs nullable em convites_cadastro
ALTER TABLE public.convites_cadastro
  ADD COLUMN IF NOT EXISTS cargo_id UUID REFERENCES public.cargos(id),
  ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES public.parametros(id),
  ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES public.unidades(id);

CREATE INDEX IF NOT EXISTS idx_convites_cargo ON public.convites_cadastro(cargo_id);
CREATE INDEX IF NOT EXISTS idx_convites_departamento ON public.convites_cadastro(departamento_id);
CREATE INDEX IF NOT EXISTS idx_convites_unidade ON public.convites_cadastro(unidade_id);

-- 1.2 Popular FKs nos convites existentes (best-effort)
UPDATE public.convites_cadastro c
SET cargo_id = cg.id
FROM public.cargos cg
WHERE c.cargo_id IS NULL
  AND c.cargo IS NOT NULL
  AND lower(trim(c.cargo)) = lower(cg.nome);

UPDATE public.convites_cadastro c
SET departamento_id = p.id
FROM public.parametros p
WHERE p.categoria = 'departamento'
  AND c.departamento_id IS NULL
  AND c.departamento IS NOT NULL
  AND lower(trim(c.departamento)) = lower(p.label);

UPDATE public.convites_cadastro
SET unidade_id = (SELECT id FROM public.unidades WHERE codigo = 'matriz_sp')
WHERE unidade_id IS NULL;

-- 1.3 Função de prontidão do sistema
CREATE OR REPLACE FUNCTION public.validar_prontidao_sistema()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_qtd_cargos INT;
  v_qtd_departamentos INT;
  v_qtd_unidades INT;
  v_deptos_sem_perfil INT;
  v_cargos_sem_depto INT;
  v_tem_template_analista BOOLEAN;
  v_problemas jsonb := '[]'::jsonb;
  v_tem_critico BOOLEAN := false;
BEGIN
  SELECT COUNT(*) INTO v_qtd_cargos FROM public.cargos WHERE ativo = true;
  SELECT COUNT(*) INTO v_qtd_departamentos FROM public.parametros WHERE categoria = 'departamento' AND ativo = true;
  SELECT COUNT(*) INTO v_qtd_unidades FROM public.unidades WHERE ativa = true;

  SELECT COUNT(*) INTO v_deptos_sem_perfil
  FROM public.parametros
  WHERE categoria = 'departamento' AND ativo = true AND perfil_area_codigo IS NULL;

  SELECT COUNT(*) INTO v_cargos_sem_depto
  FROM public.cargos
  WHERE ativo = true AND departamento_id IS NULL;

  SELECT EXISTS(
    SELECT 1 FROM public.cargo_template WHERE codigo = 'analista' AND is_sistema = true AND ativo = true
  ) INTO v_tem_template_analista;

  IF v_qtd_cargos = 0 THEN
    v_problemas := v_problemas || jsonb_build_object(
      'codigo', 'sem_cargos',
      'severidade', 'critico',
      'mensagem', 'Nenhum cargo cadastrado. Cadastre pelo menos 1 em /cargos.',
      'link', '/cargos'
    );
    v_tem_critico := true;
  END IF;

  IF v_qtd_departamentos = 0 THEN
    v_problemas := v_problemas || jsonb_build_object(
      'codigo', 'sem_departamentos',
      'severidade', 'critico',
      'mensagem', 'Nenhum departamento cadastrado. Cadastre em /parametros → Áreas e Departamentos.',
      'link', '/parametros'
    );
    v_tem_critico := true;
  END IF;

  IF v_qtd_unidades = 0 THEN
    v_problemas := v_problemas || jsonb_build_object(
      'codigo', 'sem_unidades',
      'severidade', 'critico',
      'mensagem', 'Nenhuma unidade cadastrada.',
      'link', '/parametros'
    );
    v_tem_critico := true;
  END IF;

  IF v_deptos_sem_perfil > 0 THEN
    v_problemas := v_problemas || jsonb_build_object(
      'codigo', 'deptos_sem_perfil',
      'severidade', 'aviso',
      'mensagem', format('%s departamento(s) sem perfil de área mapeado. Automação de usuário pode ficar incompleta.', v_deptos_sem_perfil),
      'link', '/parametros'
    );
  END IF;

  IF v_cargos_sem_depto > 0 THEN
    v_problemas := v_problemas || jsonb_build_object(
      'codigo', 'cargos_sem_depto',
      'severidade', 'aviso',
      'mensagem', format('%s cargo(s) sem departamento vinculado.', v_cargos_sem_depto),
      'link', '/cargos'
    );
  END IF;

  IF NOT v_tem_template_analista THEN
    v_problemas := v_problemas || jsonb_build_object(
      'codigo', 'sem_template_fallback',
      'severidade', 'critico',
      'mensagem', 'Template "analista" de fallback não existe. Contate administrador.',
      'link', null
    );
    v_tem_critico := true;
  END IF;

  v_result := jsonb_build_object(
    'pronto', NOT v_tem_critico,
    'stats', jsonb_build_object(
      'cargos', v_qtd_cargos,
      'departamentos', v_qtd_departamentos,
      'unidades', v_qtd_unidades,
      'deptos_sem_perfil', v_deptos_sem_perfil,
      'cargos_sem_depto', v_cargos_sem_depto
    ),
    'problemas', v_problemas
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.validar_prontidao_sistema IS
  'Valida se o sistema tem os dados mestres mínimos para operar automação de usuários. Retorna status + lista de problemas.';

-- 1.4 Guardrails: impedir DELETE de cargo em uso
CREATE OR REPLACE FUNCTION public.impedir_delete_cargo_em_uso()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.colaboradores_clt WHERE cargo_id = OLD.id AND status = 'ativo') THEN
    RAISE EXCEPTION 'Cargo % está em uso por colaboradores CLT ativos. Inative o cargo em vez de excluir.', OLD.nome;
  END IF;
  IF EXISTS (SELECT 1 FROM public.contratos_pj WHERE cargo_id = OLD.id AND status = 'ativo') THEN
    RAISE EXCEPTION 'Cargo % está em uso por contratos PJ ativos. Inative o cargo em vez de excluir.', OLD.nome;
  END IF;
  IF EXISTS (SELECT 1 FROM public.convites_cadastro WHERE cargo_id = OLD.id AND status IN ('pendente','preenchido','email_enviado','devolvido')) THEN
    RAISE EXCEPTION 'Cargo % está vinculado a convites pendentes. Processe os convites primeiro.', OLD.nome;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_impedir_delete_cargo_em_uso ON public.cargos;
CREATE TRIGGER trg_impedir_delete_cargo_em_uso
  BEFORE DELETE ON public.cargos
  FOR EACH ROW EXECUTE FUNCTION public.impedir_delete_cargo_em_uso();

-- Guardrail: impedir DELETE de unidade em uso
CREATE OR REPLACE FUNCTION public.impedir_delete_unidade_em_uso()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.colaboradores_clt WHERE unidade_id = OLD.id AND status = 'ativo') THEN
    RAISE EXCEPTION 'Unidade % está em uso por colaboradores ativos.', OLD.nome;
  END IF;
  IF EXISTS (SELECT 1 FROM public.contratos_pj WHERE unidade_id = OLD.id AND status = 'ativo') THEN
    RAISE EXCEPTION 'Unidade % está em uso por contratos PJ ativos.', OLD.nome;
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_atribuicoes WHERE unidade_id = OLD.id) THEN
    RAISE EXCEPTION 'Unidade % está vinculada a atribuições de usuário. Desvincule antes de remover.', OLD.nome;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_impedir_delete_unidade_em_uso ON public.unidades;
CREATE TRIGGER trg_impedir_delete_unidade_em_uso
  BEFORE DELETE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.impedir_delete_unidade_em_uso();

-- Guardrail: impedir DELETE de parametro estrutural (área/departamento) em uso
CREATE OR REPLACE FUNCTION public.impedir_delete_parametro_estrutural_em_uso()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.categoria NOT IN ('area_negocio', 'departamento') THEN
    RETURN OLD;
  END IF;

  IF OLD.categoria = 'departamento' THEN
    IF EXISTS (SELECT 1 FROM public.colaboradores_clt WHERE departamento_id = OLD.id AND status = 'ativo') THEN
      RAISE EXCEPTION 'Departamento % está em uso por colaboradores ativos.', OLD.label;
    END IF;
    IF EXISTS (SELECT 1 FROM public.contratos_pj WHERE departamento_id = OLD.id AND status = 'ativo') THEN
      RAISE EXCEPTION 'Departamento % está em uso por contratos PJ ativos.', OLD.label;
    END IF;
    IF EXISTS (SELECT 1 FROM public.cargos WHERE departamento_id = OLD.id AND ativo = true) THEN
      RAISE EXCEPTION 'Departamento % está vinculado a cargos ativos.', OLD.label;
    END IF;
  END IF;

  IF OLD.categoria = 'area_negocio' THEN
    IF EXISTS (SELECT 1 FROM public.parametros WHERE categoria = 'departamento' AND pai_valor = OLD.valor AND ativo = true) THEN
      RAISE EXCEPTION 'Área % tem departamentos ativos vinculados. Remova/migre os departamentos primeiro.', OLD.label;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_impedir_delete_parametro_em_uso ON public.parametros;
CREATE TRIGGER trg_impedir_delete_parametro_em_uso
  BEFORE DELETE ON public.parametros
  FOR EACH ROW EXECUTE FUNCTION public.impedir_delete_parametro_estrutural_em_uso();