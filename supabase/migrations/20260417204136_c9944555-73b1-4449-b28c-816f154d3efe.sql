-- Tabela de extensões disponíveis
CREATE TABLE IF NOT EXISTS public.sncf_template_extensoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.sncf_processos_categorias(id) ON DELETE CASCADE,
  dimensao TEXT NOT NULL CHECK (dimensao IN ('cargo', 'departamento', 'sistema')),
  referencia_id UUID,
  referencia_label TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(categoria_id, dimensao, referencia_id)
);

-- Tarefas de cada extensão
CREATE TABLE IF NOT EXISTS public.sncf_template_extensoes_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extensao_id UUID NOT NULL REFERENCES public.sncf_template_extensoes(id) ON DELETE CASCADE,
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
  link_acao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sncf_template_extensoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sncf_template_extensoes_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can manage extensoes"
  ON public.sncf_template_extensoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'));

CREATE POLICY "Authenticated read extensoes"
  ON public.sncf_template_extensoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR can manage extensoes_tarefas"
  ON public.sncf_template_extensoes_tarefas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'));

CREATE POLICY "Authenticated read extensoes_tarefas"
  ON public.sncf_template_extensoes_tarefas FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_extensoes_categoria ON public.sncf_template_extensoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_extensoes_dimensao ON public.sncf_template_extensoes(dimensao, referencia_id);

CREATE TRIGGER update_sncf_template_extensoes_updated_at
  BEFORE UPDATE ON public.sncf_template_extensoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna para rastrear origem da tarefa (extensão)
ALTER TABLE public.sncf_tarefas
  ADD COLUMN IF NOT EXISTS origem_extensao_id UUID REFERENCES public.sncf_template_extensoes(id);