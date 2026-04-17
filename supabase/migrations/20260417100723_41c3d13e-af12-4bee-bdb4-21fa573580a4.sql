-- ============ FASE 3 — Templates de processos e offboarding ============

-- 1) Tabela de templates de processos
CREATE TABLE IF NOT EXISTS public.sncf_templates_processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_processo TEXT NOT NULL CHECK (tipo_processo IN ('onboarding', 'offboarding', 'movimentacao')),
  tipo_colaborador TEXT CHECK (tipo_colaborador IN ('clt', 'pj', 'ambos')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Tarefas dos templates
CREATE TABLE IF NOT EXISTS public.sncf_templates_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.sncf_templates_processos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL,
  descricao TEXT,
  area_destino TEXT,
  sistema_origem TEXT DEFAULT 'people',
  responsavel_role TEXT,
  accountable_role TEXT,
  prazo_dias INTEGER NOT NULL DEFAULT 0,
  prioridade TEXT DEFAULT 'normal',
  bloqueante BOOLEAN DEFAULT false,
  motivo_bloqueio TEXT,
  condicao_aplicacao TEXT DEFAULT 'sempre',
  chave_jsonb TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sncf_templates_processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sncf_templates_tarefas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR can manage templates" ON public.sncf_templates_processos;
CREATE POLICY "HR can manage templates" ON public.sncf_templates_processos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_rh'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_rh'::app_role));

DROP POLICY IF EXISTS "Staff can read templates" ON public.sncf_templates_processos;
CREATE POLICY "Staff can read templates" ON public.sncf_templates_processos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "HR can manage template tasks" ON public.sncf_templates_tarefas;
CREATE POLICY "HR can manage template tasks" ON public.sncf_templates_tarefas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_rh'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_rh'::app_role));

DROP POLICY IF EXISTS "Staff can read template tasks" ON public.sncf_templates_tarefas;
CREATE POLICY "Staff can read template tasks" ON public.sncf_templates_tarefas
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_templates_tarefas_template ON public.sncf_templates_tarefas(template_id, ordem);

-- 3) Permitir que onboarding_checklists guarde também offboarding/movimentação
ALTER TABLE public.onboarding_checklists
  ADD COLUMN IF NOT EXISTS tipo_processo TEXT DEFAULT 'onboarding' CHECK (tipo_processo IN ('onboarding', 'offboarding', 'movimentacao'));

ALTER TABLE public.onboarding_checklists
  ADD COLUMN IF NOT EXISTS data_efetivacao DATE,
  ADD COLUMN IF NOT EXISTS motivo TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS aviso_previo BOOLEAN DEFAULT false;

-- 4) Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_sncf_templates_processos_updated_at ON public.sncf_templates_processos;
CREATE TRIGGER update_sncf_templates_processos_updated_at
  BEFORE UPDATE ON public.sncf_templates_processos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Seed inicial dos templates de offboarding
INSERT INTO public.sncf_templates_processos (id, nome, descricao, tipo_processo, tipo_colaborador)
SELECT gen_random_uuid(), 'Offboarding CLT Padrão', 'Processo de desligamento de colaborador CLT com prazos legais', 'offboarding', 'clt'
WHERE NOT EXISTS (SELECT 1 FROM public.sncf_templates_processos WHERE nome = 'Offboarding CLT Padrão');

INSERT INTO public.sncf_templates_processos (id, nome, descricao, tipo_processo, tipo_colaborador)
SELECT gen_random_uuid(), 'Offboarding PJ Padrão', 'Encerramento de contrato de prestador PJ', 'offboarding', 'pj'
WHERE NOT EXISTS (SELECT 1 FROM public.sncf_templates_processos WHERE nome = 'Offboarding PJ Padrão');

-- 6) Seed das tarefas do template CLT offboarding
WITH t AS (SELECT id FROM public.sncf_templates_processos WHERE nome = 'Offboarding CLT Padrão' LIMIT 1)
INSERT INTO public.sncf_templates_tarefas (template_id, ordem, titulo, descricao, area_destino, sistema_origem, responsavel_role, accountable_role, prazo_dias, prioridade, bloqueante, motivo_bloqueio)
SELECT t.id, ord, titulo, descricao, area, sistema, resp, acc, prazo, prio, bloq, motivo FROM t,
(VALUES
  (1, 'Comunicar desligamento ao colaborador', 'Reunião formal com o colaborador', 'RH', 'people', 'admin_rh', 'gestor_rh', -1, 'urgente', true, 'Aviso prévio legal'),
  (2, 'Realizar entrevista de desligamento', 'Coletar feedback do colaborador desligado', 'RH', 'people', 'admin_rh', 'gestor_rh', 0, 'normal', false, null),
  (3, 'Calcular rescisão', 'Apurar verbas rescisórias', 'RH', 'people', 'admin_rh', 'gestor_rh', 0, 'urgente', true, 'Pré-requisito para pagamento'),
  (4, 'Registrar baixa no eSocial', 'Obrigação legal — prazo de 1 dia útil', 'RH', 'people', 'admin_rh', 'gestor_rh', 1, 'urgente', true, 'Prazo legal eSocial'),
  (5, 'Agendar homologação se >1 ano', 'Quando aplicável (sindicato)', 'RH', 'people', 'admin_rh', 'gestor_rh', 5, 'alta', false, null),
  (6, 'Entregar documentos rescisórios', 'TRCT, GRFC, GRRF, extrato FGTS', 'RH', 'people', 'admin_rh', 'gestor_rh', 5, 'alta', true, 'Obrigação legal'),
  (7, 'Revogar acessos a todos os sistemas', 'Segurança da informação', 'TI', 'ti', 'admin_ti', 'admin_ti', 0, 'urgente', true, 'Risco de segurança'),
  (8, 'Desativar email corporativo', 'Bloquear acesso imediato', 'TI', 'ti', 'admin_ti', 'admin_ti', 0, 'urgente', true, 'Risco de segurança'),
  (9, 'Recolher equipamentos', 'Notebook, celular e demais ativos', 'TI', 'ti', 'admin_ti', 'admin_ti', 2, 'alta', false, null),
  (10, 'Formatar equipamentos recolhidos', 'Higienizar para nova alocação', 'TI', 'ti', 'admin_ti', 'admin_ti', 7, 'normal', false, null),
  (11, 'Processar pagamento da rescisão', 'Prazo legal de 10 dias úteis', 'Financeiro', 'people', 'financeiro', 'financeiro', 10, 'urgente', true, 'Prazo legal'),
  (12, 'Cancelar benefícios', 'VR, VT, plano de saúde', 'Financeiro', 'people', 'financeiro', 'financeiro', 0, 'alta', false, null),
  (13, 'Redistribuir tarefas do colaborador', 'Repassar pendências para o time', 'Gestão', 'people', 'gestor_direto', 'gestor_direto', 0, 'alta', false, null),
  (14, 'Comunicar o time sobre o desligamento', 'Manter alinhamento da equipe', 'Gestão', 'people', 'gestor_direto', 'gestor_direto', 1, 'normal', false, null)
) AS v(ord, titulo, descricao, area, sistema, resp, acc, prazo, prio, bloq, motivo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sncf_templates_tarefas tt WHERE tt.template_id = t.id
);

-- 7) Seed das tarefas do template PJ offboarding
WITH t AS (SELECT id FROM public.sncf_templates_processos WHERE nome = 'Offboarding PJ Padrão' LIMIT 1)
INSERT INTO public.sncf_templates_tarefas (template_id, ordem, titulo, descricao, area_destino, sistema_origem, responsavel_role, accountable_role, prazo_dias, prioridade, bloqueante, motivo_bloqueio)
SELECT t.id, ord, titulo, descricao, area, sistema, resp, acc, prazo, prio, bloq, motivo FROM t,
(VALUES
  (1, 'Comunicar encerramento ao prestador', 'Notificar formalmente o fim do contrato', 'RH', 'people', 'admin_rh', 'gestor_rh', -1, 'urgente', false, null),
  (2, 'Verificar última nota fiscal', 'Garantir pagamento integral pendente', 'Financeiro', 'people', 'financeiro', 'financeiro', 5, 'alta', true, 'Quitação contratual'),
  (3, 'Processar último pagamento', 'Encerrar pendências financeiras', 'Financeiro', 'people', 'financeiro', 'financeiro', 10, 'alta', true, 'Quitação contratual'),
  (4, 'Revogar acessos a todos os sistemas', 'Segurança da informação', 'TI', 'ti', 'admin_ti', 'admin_ti', 0, 'urgente', true, 'Risco de segurança'),
  (5, 'Desativar email corporativo', 'Bloquear acesso imediato', 'TI', 'ti', 'admin_ti', 'admin_ti', 0, 'urgente', true, 'Risco de segurança'),
  (6, 'Recolher equipamentos cedidos', 'Se aplicável', 'TI', 'ti', 'admin_ti', 'admin_ti', 5, 'alta', false, null),
  (7, 'Cancelar benefícios PJ', 'Remover do plano de saúde, etc.', 'Financeiro', 'people', 'financeiro', 'financeiro', 0, 'alta', false, null),
  (8, 'Redistribuir trabalho em andamento', 'Garantir continuidade', 'Gestão', 'people', 'gestor_direto', 'gestor_direto', 0, 'alta', false, null),
  (9, 'Arquivar contrato encerrado', 'Manter histórico documental', 'RH', 'people', 'admin_rh', 'gestor_rh', 7, 'normal', false, null)
) AS v(ord, titulo, descricao, area, sistema, resp, acc, prazo, prio, bloq, motivo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sncf_templates_tarefas tt WHERE tt.template_id = t.id
);