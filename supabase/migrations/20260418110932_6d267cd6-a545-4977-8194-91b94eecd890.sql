-- ═══ Cadastrar diretoria_executiva em custom_roles ═══
INSERT INTO public.custom_roles (name, description, is_system) VALUES
  ('diretoria_executiva', 'Visibilidade executiva total sem poder de configuração — para sócios e board', true)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, is_system = true;

-- Função temporária pra facilitar o seed
CREATE OR REPLACE FUNCTION public.seed_perm_temp(
  _role TEXT, _module TEXT, _perm TEXT, _granted BOOLEAN DEFAULT true, _nivel_min TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.role_permissions (role_name, module, permission, granted, colaborador_tipo, nivel_minimo)
  VALUES (_role::app_role, _module, _perm, _granted, 'all',
          CASE WHEN _nivel_min IS NULL THEN NULL ELSE _nivel_min::nivel_cargo END)
  ON CONFLICT (role_name, module, permission, colaborador_tipo)
  DO UPDATE SET granted = EXCLUDED.granted, nivel_minimo = EXCLUDED.nivel_minimo;
END;
$$;

-- Seed permissões diretoria_executiva
DO $$
DECLARE
  m TEXT;
  p TEXT;
BEGIN
  FOREACH m IN ARRAY ARRAY[
    'dashboard','tarefas','tarefas_time','fala_fetely','conhecimento_fetely',
    'pessoas','colaboradores','contratos_pj','organograma','onboarding',
    'ferias','beneficios','movimentacoes','recrutamento','avaliacoes','treinamentos',
    'folha_pagamento','notas_fiscais','pagamentos_pj','cargos',
    'ti_ativos','documentacao','processos','relatorios'
  ] LOOP
    PERFORM public.seed_perm_temp('diretoria_executiva', m, 'view', true);
  END LOOP;

  FOREACH m IN ARRAY ARRAY['usuarios','parametros','convites','importacao_pdf','sugestoes_conhecimento'] LOOP
    PERFORM public.seed_perm_temp('diretoria_executiva', m, 'view', false);
  END LOOP;

  FOREACH m IN ARRAY ARRAY[
    'dashboard','tarefas','tarefas_time','fala_fetely','conhecimento_fetely',
    'pessoas','colaboradores','contratos_pj','organograma','onboarding',
    'ferias','beneficios','movimentacoes','recrutamento','avaliacoes','treinamentos',
    'folha_pagamento','notas_fiscais','pagamentos_pj','cargos',
    'ti_ativos','documentacao','processos','relatorios','usuarios','parametros',
    'convites','importacao_pdf','sugestoes_conhecimento'
  ] LOOP
    FOREACH p IN ARRAY ARRAY['create','edit','delete'] LOOP
      PERFORM public.seed_perm_temp('diretoria_executiva', m, p, false);
    END LOOP;
  END LOOP;

  FOREACH p IN ARRAY ARRAY['view','create','edit','delete'] LOOP
    PERFORM public.seed_perm_temp('diretoria_executiva', 'memorias_fetely', p, true);
  END LOOP;
END $$;

-- ═══ Policy RLS para diretoria_executiva ver todas as remunerações ═══
DROP POLICY IF EXISTS "diretoria_executiva_ve_todas_remuneracoes" ON public.remuneracoes;
CREATE POLICY "diretoria_executiva_ve_todas_remuneracoes" ON public.remuneracoes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria_executiva'));

COMMENT ON POLICY "diretoria_executiva_ve_todas_remuneracoes" ON public.remuneracoes IS
  'Diretoria executiva vê TODAS as remunerações (inclusive pró-labore outros sócios) mas NÃO pode editar. Acordado entre sócios Fetely.';

-- ═══ Migração dos usuários atuais (busca via auth.users) ═══

-- Joseph Soued
DO $$
DECLARE v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'joseph@fetely.com.br' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_uid;
    INSERT INTO public.user_roles (user_id, role, nivel) VALUES (v_uid, 'diretoria_executiva', NULL);
  END IF;
END $$;

-- Flavio (flavio@fetely.com.br)
DO $$
DECLARE v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'flavio@fetely.com.br' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_uid;
    INSERT INTO public.user_roles (user_id, role, nivel) VALUES (v_uid, 'super_admin', NULL);
    INSERT INTO public.user_roles (user_id, role, nivel) VALUES (v_uid, 'rh', 'diretor');
  END IF;
END $$;

-- Isabella
DO $$
DECLARE v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'isabella.vieira@fetely.com.br' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_uid;
    INSERT INTO public.user_roles (user_id, role, nivel) VALUES (v_uid, 'colaborador', NULL);
  END IF;
END $$;

-- ═══ Limpar role_permissions das roles legadas ═══
DELETE FROM public.role_permissions
WHERE role_name::text IN ('admin_rh','gestor_rh','gestor_direto','admin_ti','recrutador');

-- ═══ Marcar legadas como desativadas em custom_roles ═══
UPDATE public.custom_roles
SET description = COALESCE(description, '') || ' [DESATIVADA - use equivalente nova]',
    is_system = false
WHERE name IN ('admin_rh','gestor_rh','gestor_direto','admin_ti','recrutador')
  AND description NOT LIKE '%[DESATIVADA%';

DROP FUNCTION IF EXISTS public.seed_perm_temp(TEXT, TEXT, TEXT, BOOLEAN, TEXT);
