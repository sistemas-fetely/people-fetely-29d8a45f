-- RACI support
ALTER TABLE public.sncf_tarefas
ADD COLUMN IF NOT EXISTS accountable_user_id UUID,
ADD COLUMN IF NOT EXISTS accountable_role TEXT,
ADD COLUMN IF NOT EXISTS informar_user_ids UUID[] DEFAULT '{}';

-- Prioridade legal
ALTER TABLE public.sncf_tarefas
ADD COLUMN IF NOT EXISTS bloqueante BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS motivo_bloqueio TEXT;

-- Evidência de conclusão
ALTER TABLE public.sncf_tarefas
ADD COLUMN IF NOT EXISTS evidencia_texto TEXT,
ADD COLUMN IF NOT EXISTS evidencia_url TEXT;

COMMENT ON COLUMN public.sncf_tarefas.responsavel_user_id IS 'RACI: R (Responsible) — quem executa a tarefa';
COMMENT ON COLUMN public.sncf_tarefas.accountable_user_id IS 'RACI: A (Accountable) — quem cobra e garante execução';
COMMENT ON COLUMN public.sncf_tarefas.informar_user_ids IS 'RACI: I (Informed) — notificados quando conclui';

-- Backfill RACI
UPDATE public.sncf_tarefas SET accountable_role = 'admin_rh'
WHERE tipo_processo = 'onboarding' AND area_destino = 'TI' AND accountable_role IS NULL;

UPDATE public.sncf_tarefas st SET accountable_user_id = oc.coordenador_user_id
FROM public.onboarding_checklists oc
WHERE st.processo_id = oc.id AND st.tipo_processo = 'onboarding'
  AND st.area_destino IN ('RH', 'Gestão') AND st.accountable_user_id IS NULL;

UPDATE public.sncf_tarefas SET accountable_role = 'admin_rh'
WHERE tipo_processo = 'onboarding' AND area_destino = 'Colaborador' AND accountable_role IS NULL;

-- Backfill bloqueantes
UPDATE public.sncf_tarefas SET bloqueante = true, motivo_bloqueio = 'Prazo legal — obrigatório antes do primeiro dia'
WHERE tipo_processo = 'onboarding' AND bloqueante IS NOT true
  AND (titulo ILIKE '%eSocial%' OR titulo ILIKE '%contrato%' OR titulo ILIKE '%assinar%');