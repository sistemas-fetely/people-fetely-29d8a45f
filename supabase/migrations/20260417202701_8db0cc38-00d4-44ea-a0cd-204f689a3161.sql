-- 1. Criar tabela de categorias de processo
CREATE TABLE IF NOT EXISTS public.sncf_processos_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  modulo_origem TEXT NOT NULL DEFAULT 'people' CHECK (modulo_origem IN ('rh', 'people', 'ti', 'compras', 'financeiro', 'comercial', 'operacional', 'estrategico', 'outros')),
  icone TEXT DEFAULT 'workflow',
  cor TEXT DEFAULT '#1A4A3A',
  natureza TEXT NOT NULL DEFAULT 'lista_tarefas' CHECK (natureza IN ('lista_tarefas', 'workflow', 'guia')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sncf_processos_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can manage categorias"
  ON public.sncf_processos_categorias FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'));

CREATE POLICY "Authenticated can read categorias"
  ON public.sncf_processos_categorias FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_sncf_processos_categorias_updated_at
BEFORE UPDATE ON public.sncf_processos_categorias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed das 3 categorias atuais
INSERT INTO public.sncf_processos_categorias (slug, nome, descricao, modulo_origem, icone, natureza, ordem) VALUES
  ('onboarding', 'Onboarding', 'Integração de novo colaborador', 'rh', 'rocket', 'lista_tarefas', 1),
  ('offboarding', 'Offboarding', 'Desligamento de colaborador', 'rh', 'log-out', 'lista_tarefas', 2),
  ('movimentacao', 'Movimentação', 'Transferência ou promoção', 'rh', 'arrow-left-right', 'lista_tarefas', 3)
ON CONFLICT (slug) DO NOTHING;

-- 3. Adicionar referencia categoria_id em sncf_templates_processos
ALTER TABLE public.sncf_templates_processos
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.sncf_processos_categorias(id);

-- Migrar dados existentes
UPDATE public.sncf_templates_processos t
SET categoria_id = c.id
FROM public.sncf_processos_categorias c
WHERE t.tipo_processo = c.slug
  AND t.categoria_id IS NULL;