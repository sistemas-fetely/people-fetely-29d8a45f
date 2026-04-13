
-- Onboarding checklists
CREATE TABLE public.onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID,
  colaborador_tipo TEXT NOT NULL CHECK (colaborador_tipo IN ('clt', 'pj')),
  convite_id UUID REFERENCES convites_cadastro(id),
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ
);

ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;

-- HR full access
CREATE POLICY "HR can manage onboarding_checklists"
ON public.onboarding_checklists FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'admin_rh'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'admin_rh'::app_role));

-- Gestor direto can view
CREATE POLICY "Gestor direto can view onboarding_checklists"
ON public.onboarding_checklists FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_direto'::app_role));

-- Colaborador can view own checklist (CLT)
CREATE POLICY "CLT colaborador can view own checklist"
ON public.onboarding_checklists FOR SELECT TO authenticated
USING (
  colaborador_tipo = 'clt' AND EXISTS (
    SELECT 1 FROM colaboradores_clt c WHERE c.id = onboarding_checklists.colaborador_id AND c.user_id = auth.uid()
  )
);

-- Colaborador can view own checklist (PJ)
CREATE POLICY "PJ colaborador can view own checklist"
ON public.onboarding_checklists FOR SELECT TO authenticated
USING (
  colaborador_tipo = 'pj' AND EXISTS (
    SELECT 1 FROM contratos_pj c WHERE c.id = onboarding_checklists.colaborador_id AND c.user_id = auth.uid()
  )
);

-- Financeiro can view
CREATE POLICY "Financeiro can view onboarding_checklists"
ON public.onboarding_checklists FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_onboarding_checklists_updated_at
BEFORE UPDATE ON public.onboarding_checklists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Onboarding tarefas
CREATE TABLE public.onboarding_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES onboarding_checklists(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel_role app_role NOT NULL,
  responsavel_user_id UUID,
  prazo_dias INTEGER NOT NULL DEFAULT 1,
  prazo_data DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'atrasada')),
  concluida_em TIMESTAMPTZ,
  concluida_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_tarefas ENABLE ROW LEVEL SECURITY;

-- HR full access
CREATE POLICY "HR can manage onboarding_tarefas"
ON public.onboarding_tarefas FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'admin_rh'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role) OR has_role(auth.uid(), 'admin_rh'::app_role));

-- Gestor direto can view and update tarefas
CREATE POLICY "Gestor direto can view onboarding_tarefas"
ON public.onboarding_tarefas FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_direto'::app_role));

CREATE POLICY "Gestor direto can update own tarefas"
ON public.onboarding_tarefas FOR UPDATE TO authenticated
USING (responsavel_user_id = auth.uid())
WITH CHECK (responsavel_user_id = auth.uid());

-- Colaborador can view own tarefas via checklist
CREATE POLICY "Colaborador can view own tarefas"
ON public.onboarding_tarefas FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM onboarding_checklists oc
    WHERE oc.id = onboarding_tarefas.checklist_id
    AND (
      (oc.colaborador_tipo = 'clt' AND EXISTS (SELECT 1 FROM colaboradores_clt c WHERE c.id = oc.colaborador_id AND c.user_id = auth.uid()))
      OR
      (oc.colaborador_tipo = 'pj' AND EXISTS (SELECT 1 FROM contratos_pj c WHERE c.id = oc.colaborador_id AND c.user_id = auth.uid()))
    )
  )
);

-- Colaborador can update own tarefas (mark as done)
CREATE POLICY "Colaborador can update own tarefas"
ON public.onboarding_tarefas FOR UPDATE TO authenticated
USING (responsavel_user_id = auth.uid())
WITH CHECK (responsavel_user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_onboarding_tarefas_updated_at
BEFORE UPDATE ON public.onboarding_tarefas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
