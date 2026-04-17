-- 1. Criar tabela sncf_tarefas
CREATE TABLE IF NOT EXISTS public.sncf_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contexto
  tipo_processo TEXT NOT NULL DEFAULT 'manual' CHECK (tipo_processo IN ('onboarding', 'offboarding', 'movimentacao', 'manutencao', 'manual')),
  sistema_origem TEXT NOT NULL DEFAULT 'people' CHECK (sistema_origem IN ('people', 'ti', 'global', 'manual')),
  
  -- Agrupamento (substitui checklist_id)
  processo_id UUID,
  processo_tipo TEXT,
  
  -- Sobre quem
  colaborador_id UUID,
  colaborador_tipo TEXT CHECK (colaborador_tipo IN ('clt', 'pj')),
  colaborador_nome TEXT,
  
  -- A tarefa
  titulo TEXT NOT NULL,
  descricao TEXT,
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('urgente', 'normal', 'baixa')),
  
  -- Responsável
  area_destino TEXT,
  responsavel_role TEXT,
  responsavel_user_id UUID,
  
  -- Prazos
  prazo_dias INTEGER DEFAULT 0,
  prazo_data DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada', 'cancelada')),
  concluida_em TIMESTAMPTZ,
  concluida_por UUID,
  
  -- Ação direta
  link_acao TEXT,
  
  -- Auditoria
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sncf_tarefas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "HR and admin can manage all tarefas"
  ON public.sncf_tarefas FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_rh'::app_role) OR
    has_role(auth.uid(), 'gestor_rh'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin_rh'::app_role) OR
    has_role(auth.uid(), 'gestor_rh'::app_role)
  );

CREATE POLICY "Gestor direto can view and update assigned tarefas"
  ON public.sncf_tarefas FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'gestor_direto'::app_role) OR
    responsavel_user_id = auth.uid()
  );

CREATE POLICY "Assigned users can update own tarefas"
  ON public.sncf_tarefas FOR UPDATE TO authenticated
  USING (responsavel_user_id = auth.uid())
  WITH CHECK (responsavel_user_id = auth.uid());

CREATE POLICY "TI users can manage TI tarefas"
  ON public.sncf_tarefas FOR ALL TO authenticated
  USING (
    sistema_origem = 'ti' AND
    EXISTS (
      SELECT 1 FROM sncf_user_systems us
      JOIN sncf_sistemas s ON s.id = us.sistema_id
      WHERE us.user_id = auth.uid() AND s.slug = 'ti' AND us.ativo = true
    )
  )
  WITH CHECK (
    sistema_origem = 'ti' AND
    EXISTS (
      SELECT 1 FROM sncf_user_systems us
      JOIN sncf_sistemas s ON s.id = us.sistema_id
      WHERE us.user_id = auth.uid() AND s.slug = 'ti' AND us.ativo = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sncf_tarefas_status ON public.sncf_tarefas(status);
CREATE INDEX IF NOT EXISTS idx_sncf_tarefas_responsavel ON public.sncf_tarefas(responsavel_user_id);
CREATE INDEX IF NOT EXISTS idx_sncf_tarefas_processo ON public.sncf_tarefas(processo_id);
CREATE INDEX IF NOT EXISTS idx_sncf_tarefas_colaborador ON public.sncf_tarefas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_sncf_tarefas_tipo_processo ON public.sncf_tarefas(tipo_processo);

-- Trigger updated_at
CREATE TRIGGER update_sncf_tarefas_updated_at
  BEFORE UPDATE ON public.sncf_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Migrar dados de onboarding_tarefas para sncf_tarefas
INSERT INTO public.sncf_tarefas (
  id, tipo_processo, sistema_origem, processo_id, 
  titulo, descricao, responsavel_role, responsavel_user_id,
  prazo_dias, prazo_data, status, concluida_em, concluida_por,
  created_at, updated_at
)
SELECT 
  ot.id,
  'onboarding',
  'people',
  ot.checklist_id,
  ot.titulo,
  ot.descricao,
  ot.responsavel_role::text,
  ot.responsavel_user_id,
  ot.prazo_dias,
  ot.prazo_data,
  ot.status,
  ot.concluida_em,
  ot.concluida_por,
  ot.created_at,
  ot.updated_at
FROM public.onboarding_tarefas ot
ON CONFLICT (id) DO NOTHING;

-- Preencher colaborador_id e colaborador_tipo a partir do checklist
UPDATE public.sncf_tarefas st
SET 
  colaborador_id = oc.colaborador_id,
  colaborador_tipo = oc.colaborador_tipo
FROM public.onboarding_checklists oc
WHERE st.processo_id = oc.id
  AND st.tipo_processo = 'onboarding'
  AND st.colaborador_id IS NULL;

-- Preencher colaborador_nome (CLT)
UPDATE public.sncf_tarefas st
SET colaborador_nome = cc.nome_completo
FROM public.colaboradores_clt cc
WHERE st.colaborador_id = cc.id
  AND st.colaborador_tipo = 'clt'
  AND st.colaborador_nome IS NULL;

-- Preencher colaborador_nome (PJ)
UPDATE public.sncf_tarefas st
SET colaborador_nome = cp.contato_nome
FROM public.contratos_pj cp
WHERE st.colaborador_id = cp.id
  AND st.colaborador_tipo = 'pj'
  AND st.colaborador_nome IS NULL;

-- 3. View compatível para frontend que ainda usa onboarding_tarefas
CREATE OR REPLACE VIEW public.onboarding_tarefas_view AS
SELECT 
  id,
  processo_id as checklist_id,
  titulo,
  descricao,
  responsavel_role::app_role as responsavel_role,
  responsavel_user_id,
  prazo_dias,
  prazo_data,
  status,
  concluida_em,
  concluida_por,
  created_at,
  updated_at
FROM public.sncf_tarefas
WHERE tipo_processo = 'onboarding';