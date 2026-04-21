-- 1. Nova tabela de histórico/timeline das tarefas
CREATE TABLE IF NOT EXISTS public.sncf_tarefas_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES public.sncf_tarefas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'criacao',
    'status_change',
    'comentario',
    'delegacao',
    'edicao',
    'conclusao',
    'reativacao'
  )),
  descricao TEXT NOT NULL,
  status_anterior TEXT,
  status_novo TEXT,
  dados_extras JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tarefas_historico_tarefa
  ON public.sncf_tarefas_historico(tarefa_id, created_at DESC);

ALTER TABLE public.sncf_tarefas_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view historico of tasks they can see"
  ON public.sncf_tarefas_historico FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sncf_tarefas t
      WHERE t.id = tarefa_id
    )
  );

CREATE POLICY "Authenticated users can insert historico"
  ON public.sncf_tarefas_historico FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Atualizar constraint de status para incluir 'aguardando_terceiro'
ALTER TABLE public.sncf_tarefas
  DROP CONSTRAINT IF EXISTS sncf_tarefas_status_check;
ALTER TABLE public.sncf_tarefas
  ADD CONSTRAINT sncf_tarefas_status_check
  CHECK (status IN ('pendente', 'em_andamento', 'aguardando_terceiro', 'concluida', 'atrasada', 'cancelada'));

-- 3. Atualizar constraint de prioridade para garantir 'alta'
ALTER TABLE public.sncf_tarefas
  DROP CONSTRAINT IF EXISTS sncf_tarefas_prioridade_check;
ALTER TABLE public.sncf_tarefas
  ADD CONSTRAINT sncf_tarefas_prioridade_check
  CHECK (prioridade IN ('urgente', 'alta', 'normal', 'baixa'));

-- 4. Novos campos de delegação e tracking
ALTER TABLE public.sncf_tarefas
  ADD COLUMN IF NOT EXISTS delegado_de_user_id UUID,
  ADD COLUMN IF NOT EXISTS delegado_por_user_id UUID,
  ADD COLUMN IF NOT EXISTS delegado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS iniciada_em TIMESTAMPTZ;