-- Tabela de Base de Conhecimento do Fala Fetely (já com categoria 'mercado' incluída)
CREATE TABLE IF NOT EXISTS public.fala_fetely_conhecimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL CHECK (categoria IN ('politica', 'regra', 'diretriz', 'faq', 'conceito', 'manifesto', 'mercado')),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  publico_alvo TEXT NOT NULL DEFAULT 'todos' CHECK (publico_alvo IN ('todos', 'admin_rh', 'gestores', 'colaboradores', 'financeiro', 'ti')),
  cargos_aplicaveis JSONB DEFAULT '[]'::jsonb,
  departamentos_aplicaveis JSONB DEFAULT '[]'::jsonb,
  niveis_aplicaveis JSONB DEFAULT '[]'::jsonb,
  fonte TEXT,
  tags TEXT[] DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  versao INTEGER NOT NULL DEFAULT 1,
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'sugestao_ia', 'aprendizado', 'feedback')),
  sugerido_por UUID REFERENCES auth.users(id),
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMPTZ,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fala_fetely_conhecimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos leem conhecimento ativo" ON public.fala_fetely_conhecimento
  FOR SELECT TO authenticated
  USING (ativo = true OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'));

CREATE POLICY "Super admin e admin_rh gerenciam conhecimento" ON public.fala_fetely_conhecimento
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'));

CREATE INDEX IF NOT EXISTS idx_conhecimento_categoria ON public.fala_fetely_conhecimento(categoria);
CREATE INDEX IF NOT EXISTS idx_conhecimento_ativo ON public.fala_fetely_conhecimento(ativo);

CREATE TRIGGER update_fala_fetely_conhecimento_updated_at
  BEFORE UPDATE ON public.fala_fetely_conhecimento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();