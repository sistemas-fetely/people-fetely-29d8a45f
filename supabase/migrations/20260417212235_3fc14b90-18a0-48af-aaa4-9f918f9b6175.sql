-- 1. Adicionar coluna somente_clt em sncf_templates_tarefas
ALTER TABLE public.sncf_templates_tarefas
ADD COLUMN IF NOT EXISTS somente_clt BOOLEAN NOT NULL DEFAULT false;

-- 2. Popular template_base do processo Onboarding com as 9 tarefas padrão
DO $$
DECLARE
  v_categoria_id UUID;
  v_template_id UUID;
BEGIN
  SELECT id INTO v_categoria_id FROM public.sncf_processos_categorias WHERE slug = 'onboarding';

  IF v_categoria_id IS NULL THEN
    RAISE EXCEPTION 'Categoria onboarding não encontrada. Cadastre-a primeiro.';
  END IF;

  SELECT id INTO v_template_id
  FROM public.sncf_templates_processos
  WHERE categoria_id = v_categoria_id
  ORDER BY created_at
  LIMIT 1;

  IF v_template_id IS NULL THEN
    INSERT INTO public.sncf_templates_processos (categoria_id, tipo_processo, nome, tipo_colaborador, ativo, descricao)
    VALUES (v_categoria_id, 'onboarding', 'Onboarding Padrão', 'ambos', true, 'Tarefas padrão geradas para todo novo colaborador (CLT e PJ)')
    RETURNING id INTO v_template_id;
  END IF;

  -- Idempotência
  DELETE FROM public.sncf_templates_tarefas WHERE template_id = v_template_id;

  INSERT INTO public.sncf_templates_tarefas
    (template_id, ordem, titulo, descricao, area_destino, sistema_origem, responsavel_role, accountable_role, prazo_dias, prioridade, bloqueante, motivo_bloqueio, somente_clt)
  VALUES
    (v_template_id, 1, 'Registrar admissão no eSocial', 'Incluir o registro de admissão no sistema eSocial antes do primeiro dia de trabalho.', 'RH', 'people', 'admin_rh', 'admin_rh', -1, 'normal', true, 'Obrigação legal — eSocial deve ser registrado antes do primeiro dia', true),
    (v_template_id, 2, 'Criar acessos nos sistemas', 'Provisionar acessos a todos os sistemas corporativos necessários.', 'TI', 'ti', 'admin_rh', 'admin_rh', 1, 'normal', false, NULL, false),
    (v_template_id, 3, 'Entregar equipamentos', 'Preparar e entregar notebook, monitor e demais equipamentos definidos.', 'TI', 'ti', 'admin_rh', 'admin_rh', 1, 'normal', false, NULL, false),
    (v_template_id, 4, 'Agendar reunião de integração com RH', 'Agenda de boas-vindas, cultura, benefícios e políticas internas.', 'RH', 'people', 'gestor_rh', 'admin_rh', 1, 'normal', false, NULL, false),
    (v_template_id, 5, 'Entregar crachá e uniforme (se aplicável)', 'Providenciar crachá de acesso e uniformes quando necessário.', 'RH', 'people', 'admin_rh', 'admin_rh', 1, 'normal', false, NULL, true),
    (v_template_id, 6, 'Apresentar colaborador ao time', 'Apresentação formal ao time e tour pelo escritório/ambiente de trabalho.', 'Gestão', 'people', 'gestor_direto', 'admin_rh', 1, 'normal', false, NULL, false),
    (v_template_id, 7, 'Assinar contrato (digital ou físico)', 'Assinatura do contrato de trabalho e documentos complementares.', 'RH', 'people', 'colaborador', 'admin_rh', 1, 'normal', true, 'Obrigatório antes do primeiro dia de trabalho', false),
    (v_template_id, 8, 'Confirmar recebimento de equipamentos', 'Confirmar que todos os equipamentos foram recebidos e estão funcionando.', 'Colaborador', 'people', 'colaborador', 'admin_rh', 3, 'normal', false, NULL, false),
    (v_template_id, 9, 'Realizar reunião 1:1 de onboarding', 'Primeira reunião individual com gestor direto para alinhamento de expectativas.', 'Gestão', 'people', 'gestor_direto', 'admin_rh', 7, 'normal', false, NULL, false);
END $$;

-- 3. Criar personalizações por sistema (uma para cada sistema cadastrado)
DO $$
DECLARE
  v_categoria_id UUID;
  v_sistema RECORD;
  v_extensao_id UUID;
BEGIN
  SELECT id INTO v_categoria_id FROM public.sncf_processos_categorias WHERE slug = 'onboarding';

  FOR v_sistema IN
    SELECT id, label FROM public.parametros
    WHERE categoria = 'sistema' AND ativo = true
  LOOP
    INSERT INTO public.sncf_template_extensoes
      (categoria_id, dimensao, referencia_id, referencia_label, nome, descricao, ativo)
    VALUES
      (v_categoria_id, 'sistema', v_sistema.id, v_sistema.label,
       'Acesso ao sistema ' || v_sistema.label,
       'Tarefa adicional quando o colaborador tem acesso ao sistema ' || v_sistema.label,
       true)
    ON CONFLICT (categoria_id, dimensao, referencia_id) DO UPDATE SET ativo = true
    RETURNING id INTO v_extensao_id;

    DELETE FROM public.sncf_template_extensoes_tarefas WHERE extensao_id = v_extensao_id;

    INSERT INTO public.sncf_template_extensoes_tarefas
      (extensao_id, ordem, titulo, descricao, area_destino, sistema_origem, responsavel_role, accountable_role, prazo_dias, prioridade)
    VALUES
      (v_extensao_id, 1,
       'Cadastrar acesso: ' || v_sistema.label,
       'Criar usuário e configurar permissões no sistema ' || v_sistema.label || '.',
       'TI', 'ti', 'admin_rh', 'admin_rh', -1, 'normal');
  END LOOP;
END $$;