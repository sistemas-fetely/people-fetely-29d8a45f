-- Garantir que todas as roles existam em custom_roles (FK requirement)
INSERT INTO public.custom_roles (name, description, is_system) VALUES
  ('super_admin', 'Acesso total ao sistema, bypass de todas as permissões', true),
  ('admin_rh', 'Administrador de RH (legado)', true),
  ('gestor_rh', 'Gestor de RH (legado)', true),
  ('gestor_direto', 'Gestor direto de equipe (legado)', true),
  ('recrutador', 'Recrutador (legado)', true),
  ('admin_ti', 'Administrador de TI (legado)', true),
  ('rh', 'Recursos Humanos - área completa com granularidade por nível', true),
  ('gestao_direta', 'Gestão direta de equipe', true),
  ('financeiro', 'Área financeira - folha, NFs e pagamentos', true),
  ('administrativo', 'Área administrativa - processos e parâmetros', true),
  ('ti', 'Tecnologia da Informação - ativos e documentação', true),
  ('operacional', 'Área operacional - tarefas e movimentações', true),
  ('fiscal', 'Auditoria fiscal - leitura e exportação', true),
  ('recrutamento', 'Recrutamento e seleção', true),
  ('estagiario', 'Estagiário - escopo limitado', true),
  ('colaborador', 'Colaborador padrão - acesso pessoal', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system;

-- Limpar seeds antigos
DELETE FROM public.role_permissions
WHERE role_name IN (
  'admin_rh','gestor_rh','gestor_direto','financeiro','colaborador',
  'rh','ti','administrativo','operacional','fiscal','recrutamento',
  'gestao_direta','estagiario','admin_ti','recrutador','super_admin'
);

-- Função auxiliar temporária
CREATE OR REPLACE FUNCTION public.seed_perm_temp(
  _role TEXT,
  _module TEXT,
  _perm TEXT,
  _granted BOOLEAN DEFAULT true,
  _nivel_min TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.role_permissions (role_name, module, permission, granted, colaborador_tipo, nivel_minimo)
  VALUES (
    _role::app_role,
    _module,
    _perm,
    _granted,
    'all',
    CASE WHEN _nivel_min IS NULL THEN NULL ELSE _nivel_min::nivel_cargo END
  )
  ON CONFLICT (role_name, module, permission, colaborador_tipo)
  DO UPDATE SET granted = EXCLUDED.granted, nivel_minimo = EXCLUDED.nivel_minimo;
END;
$$;

-- ============ ROLES LEGADOS ============

-- ADMIN_RH
DO $$ BEGIN
  PERFORM public.seed_perm_temp('admin_rh', m, p)
  FROM unnest(ARRAY[
    'dashboard','tarefas','tarefas_time','fala_fetely',
    'conhecimento_fetely','memorias_fetely','importacao_pdf','sugestoes_conhecimento',
    'pessoas','colaboradores','contratos_pj','organograma','onboarding',
    'ferias','beneficios','movimentacoes','recrutamento','avaliacoes','treinamentos',
    'processos','convites','parametros','usuarios','relatorios'
  ]) m CROSS JOIN unnest(ARRAY['view','create','edit','delete']) p;
  PERFORM public.seed_perm_temp('admin_rh', m, p) FROM unnest(ARRAY['folha_pagamento','notas_fiscais','pagamentos_pj','cargos']) m CROSS JOIN unnest(ARRAY['view','create','edit']) p;
  PERFORM public.seed_perm_temp('admin_rh', m, 'view') FROM unnest(ARRAY['ti_ativos','documentacao']) m;
END $$;

-- GESTOR_RH
DO $$ BEGIN
  PERFORM public.seed_perm_temp('gestor_rh', m, p)
  FROM unnest(ARRAY['dashboard','tarefas','tarefas_time','fala_fetely','conhecimento_fetely','importacao_pdf','sugestoes_conhecimento','pessoas','colaboradores','contratos_pj','organograma','onboarding','ferias','beneficios','movimentacoes','recrutamento','convites','processos']) m
  CROSS JOIN unnest(ARRAY['view','create','edit']) p;
  PERFORM public.seed_perm_temp('gestor_rh', m, 'view') FROM unnest(ARRAY['avaliacoes','treinamentos','relatorios','notas_fiscais','pagamentos_pj']) m;
END $$;

-- GESTOR_DIRETO
DO $$ BEGIN
  PERFORM public.seed_perm_temp('gestor_direto', m, 'view')
  FROM unnest(ARRAY['dashboard','tarefas','tarefas_time','fala_fetely','conhecimento_fetely','pessoas','organograma','onboarding','ferias','avaliacoes','treinamentos']) m;
  PERFORM public.seed_perm_temp('gestor_direto', 'ferias', 'aprovar');
  PERFORM public.seed_perm_temp('gestor_direto', 'conhecimento_fetely', 'create');
  PERFORM public.seed_perm_temp('gestor_direto', 'tarefas', p) FROM unnest(ARRAY['create','edit']) p;
END $$;

-- RECRUTADOR
DO $$ BEGIN
  PERFORM public.seed_perm_temp('recrutador', m, 'view') FROM unnest(ARRAY['dashboard','tarefas','fala_fetely','conhecimento_fetely','pessoas','organograma','recrutamento']) m;
  PERFORM public.seed_perm_temp('recrutador', 'recrutamento', p) FROM unnest(ARRAY['create','edit']) p;
END $$;

-- ADMIN_TI
DO $$ BEGIN
  PERFORM public.seed_perm_temp('admin_ti', m, p)
  FROM unnest(ARRAY['dashboard','tarefas','fala_fetely','conhecimento_fetely','ti_ativos','documentacao']) m
  CROSS JOIN unnest(ARRAY['view','create','edit']) p;
  PERFORM public.seed_perm_temp('admin_ti', m, 'view') FROM unnest(ARRAY['usuarios','parametros','processos','pessoas','organograma']) m;
END $$;

-- ============ ROLES NOVAS ============

-- RH
DO $$ BEGIN
  PERFORM public.seed_perm_temp('rh', m, 'view')
  FROM unnest(ARRAY[
    'dashboard','tarefas','tarefas_time','fala_fetely',
    'conhecimento_fetely','importacao_pdf','sugestoes_conhecimento',
    'pessoas','colaboradores','contratos_pj','organograma','onboarding',
    'ferias','beneficios','movimentacoes','recrutamento','avaliacoes','treinamentos',
    'processos','convites','relatorios'
  ]) m;
  PERFORM public.seed_perm_temp('rh', m, p, true, 'assistente')
  FROM unnest(ARRAY['pessoas','colaboradores','contratos_pj','ferias','beneficios','movimentacoes','convites','onboarding']) m
  CROSS JOIN unnest(ARRAY['create','edit']) p;
  PERFORM public.seed_perm_temp('rh', m, p, true, 'analista')
  FROM unnest(ARRAY['conhecimento_fetely','processos','recrutamento','avaliacoes','treinamentos']) m
  CROSS JOIN unnest(ARRAY['create','edit']) p;
  PERFORM public.seed_perm_temp('rh', m, 'delete', true, 'coordenador')
  FROM unnest(ARRAY['pessoas','colaboradores','contratos_pj','conhecimento_fetely','processos']) m;
  PERFORM public.seed_perm_temp('rh', 'parametros', 'view', true, 'coordenador');
  PERFORM public.seed_perm_temp('rh', 'parametros', 'edit', true, 'gerente');
  PERFORM public.seed_perm_temp('rh', 'usuarios', 'view', true, 'coordenador');
  PERFORM public.seed_perm_temp('rh', 'usuarios', 'edit', true, 'gerente');
  PERFORM public.seed_perm_temp('rh', 'ferias', 'aprovar', true, 'analista');
END $$;

-- GESTAO_DIRETA
DO $$ BEGIN
  PERFORM public.seed_perm_temp('gestao_direta', m, 'view')
  FROM unnest(ARRAY['dashboard','tarefas','tarefas_time','fala_fetely','conhecimento_fetely','pessoas','organograma','onboarding','ferias','avaliacoes','treinamentos']) m;
  PERFORM public.seed_perm_temp('gestao_direta', 'ferias', 'aprovar', true, 'coordenador');
  PERFORM public.seed_perm_temp('gestao_direta', 'conhecimento_fetely', 'create');
  PERFORM public.seed_perm_temp('gestao_direta', m, 'edit', true, 'coordenador') FROM unnest(ARRAY['tarefas','onboarding']) m;
END $$;

-- FINANCEIRO
DO $$ BEGIN
  PERFORM public.seed_perm_temp('financeiro', m, 'view')
  FROM unnest(ARRAY['dashboard','tarefas','fala_fetely','conhecimento_fetely','pessoas','colaboradores','contratos_pj','folha_pagamento','notas_fiscais','pagamentos_pj','relatorios']) m;
  PERFORM public.seed_perm_temp('financeiro', m, p, true, 'assistente')
  FROM unnest(ARRAY['folha_pagamento','notas_fiscais','pagamentos_pj']) m
  CROSS JOIN unnest(ARRAY['create','edit']) p;
  PERFORM public.seed_perm_temp('financeiro', 'notas_fiscais', 'aprovar', true, 'analista');
  PERFORM public.seed_perm_temp('financeiro', 'notas_fiscais', 'enviar_email', true, 'analista');
  PERFORM public.seed_perm_temp('financeiro', 'folha_pagamento', 'fechar', true, 'coordenador');
  PERFORM public.seed_perm_temp('financeiro', 'folha_pagamento', 'exportar', true, 'analista');
  PERFORM public.seed_perm_temp('financeiro', 'pagamentos_pj', 'exportar', true, 'analista');
  PERFORM public.seed_perm_temp('financeiro', 'notas_fiscais', 'exportar', true, 'analista');
  PERFORM public.seed_perm_temp('financeiro', 'cargos', 'view', true, 'gerente');
END $$;

-- ADMINISTRATIVO
DO $$ BEGIN
  PERFORM public.seed_perm_temp('administrativo', m, 'view')
  FROM unnest(ARRAY['dashboard','tarefas','fala_fetely','conhecimento_fetely','pessoas','organograma','processos','parametros']) m;
  PERFORM public.seed_perm_temp('administrativo', m, p, true, 'assistente')
  FROM unnest(ARRAY['tarefas','processos']) m
  CROSS JOIN unnest(ARRAY['create','edit']) p;
  PERFORM public.seed_perm_temp('administrativo', 'processos', 'delete', true, 'coordenador');
  PERFORM public.seed_perm_temp('administrativo', 'parametros', 'edit', true, 'gerente');
END $$;

-- TI
DO $$ BEGIN
  PERFORM public.seed_perm_temp('ti', m, 'view')
  FROM unnest(ARRAY['dashboard','tarefas','fala_fetely','conhecimento_fetely','ti_ativos','documentacao','usuarios','parametros','processos']) m;
  PERFORM public.seed_perm_temp('ti', 'ti_ativos', p, true, 'assistente')
  FROM unnest(ARRAY['create','edit']) p;
  PERFORM public.seed_perm_temp('ti', 'documentacao', p, true, 'analista')
  FROM unnest(ARRAY['create','edit']) p;
  PERFORM public.seed_perm_temp('ti', 'usuarios', 'create', true, 'coordenador');
  PERFORM public.seed_perm_temp('ti', 'usuarios', 'edit', true, 'coordenador');
  PERFORM public.seed_perm_temp('ti', 'ti_ativos', 'delete', true, 'coordenador');
END $$;

-- OPERACIONAL
DO $$ BEGIN
  PERFORM public.seed_perm_temp('operacional', m, 'view')
  FROM unnest(ARRAY['dashboard','tarefas','tarefas_time','fala_fetely','conhecimento_fetely','pessoas','organograma','onboarding','ferias','movimentacoes','treinamentos','relatorios']) m;
  PERFORM public.seed_perm_temp('operacional', 'tarefas', p, true, 'assistente') FROM unnest(ARRAY['create','edit']) p;
  PERFORM public.seed_perm_temp('operacional', 'ferias', 'aprovar', true, 'coordenador');
  PERFORM public.seed_perm_temp('operacional', 'movimentacoes', p, true, 'coordenador') FROM unnest(ARRAY['create','edit']) p;
  PERFORM public.seed_perm_temp('operacional', 'relatorios', 'exportar', true, 'gerente');
END $$;

-- FISCAL
DO $$ BEGIN
  PERFORM public.seed_perm_temp('fiscal', m, 'view')
  FROM unnest(ARRAY['dashboard','tarefas','fala_fetely','conhecimento_fetely','folha_pagamento','notas_fiscais','pagamentos_pj','relatorios']) m;
  PERFORM public.seed_perm_temp('fiscal', m, 'exportar', true, 'analista')
  FROM unnest(ARRAY['folha_pagamento','notas_fiscais','relatorios']) m;
END $$;

-- RECRUTAMENTO
DO $$ BEGIN
  PERFORM public.seed_perm_temp('recrutamento', m, 'view')
  FROM unnest(ARRAY['dashboard','tarefas','fala_fetely','conhecimento_fetely','pessoas','organograma','recrutamento']) m;
  PERFORM public.seed_perm_temp('recrutamento', 'recrutamento', p, true, 'assistente') FROM unnest(ARRAY['create','edit']) p;
  PERFORM public.seed_perm_temp('recrutamento', 'recrutamento', 'delete', true, 'coordenador');
END $$;

-- ESTAGIARIO
DO $$ BEGIN
  PERFORM public.seed_perm_temp('estagiario', m, 'view')
  FROM unnest(ARRAY['dashboard','tarefas','fala_fetely','conhecimento_fetely','pessoas','organograma','onboarding']) m;
  PERFORM public.seed_perm_temp('estagiario', 'tarefas', p) FROM unnest(ARRAY['create','edit']) p;
END $$;

-- COLABORADOR
DO $$ BEGIN
  PERFORM public.seed_perm_temp('colaborador', m, 'view')
  FROM unnest(ARRAY['dashboard','tarefas','fala_fetely','conhecimento_fetely','memorias_fetely']) m;
  PERFORM public.seed_perm_temp('colaborador', 'tarefas', p) FROM unnest(ARRAY['create','edit']) p;
  PERFORM public.seed_perm_temp('colaborador', 'memorias_fetely', p) FROM unnest(ARRAY['create','edit','delete']) p;
END $$;

-- SUPER_ADMIN
DO $$
DECLARE
  v_module TEXT;
  v_perm TEXT;
BEGIN
  FOR v_module IN
    SELECT unnest(ARRAY[
      'dashboard','tarefas','tarefas_time','fala_fetely',
      'conhecimento_fetely','memorias_fetely','importacao_pdf','sugestoes_conhecimento',
      'pessoas','colaboradores','contratos_pj','organograma','onboarding',
      'ferias','beneficios','movimentacoes','recrutamento','avaliacoes','treinamentos',
      'folha_pagamento','notas_fiscais','pagamentos_pj','cargos',
      'ti_ativos','documentacao',
      'processos','convites','parametros','usuarios','relatorios'
    ])
  LOOP
    FOR v_perm IN SELECT unnest(ARRAY['view','create','edit','delete']) LOOP
      PERFORM public.seed_perm_temp('super_admin', v_module, v_perm);
    END LOOP;
  END LOOP;
  PERFORM public.seed_perm_temp('super_admin', 'notas_fiscais', 'enviar_email');
  PERFORM public.seed_perm_temp('super_admin', 'notas_fiscais', 'aprovar');
  PERFORM public.seed_perm_temp('super_admin', 'ferias', 'aprovar');
  PERFORM public.seed_perm_temp('super_admin', 'folha_pagamento', 'fechar');
  PERFORM public.seed_perm_temp('super_admin', 'folha_pagamento', 'exportar');
  PERFORM public.seed_perm_temp('super_admin', 'convites', 'enviar');
END $$;

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS public.seed_perm_temp(TEXT, TEXT, TEXT, BOOLEAN, TEXT);