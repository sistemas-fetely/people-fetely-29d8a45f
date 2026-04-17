-- Tabela de documentos
CREATE TABLE IF NOT EXISTS public.sncf_documentacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('tecnico', 'usuario', 'roadmap', 'status', 'estado_atual', 'continuidade', 'outro')),
  conteudo TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  versao INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  autor_user_id UUID REFERENCES auth.users(id),
  autor_nome TEXT,
  editado_por UUID REFERENCES auth.users(id),
  editado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de histórico de versões
CREATE TABLE IF NOT EXISTS public.sncf_documentacao_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES sncf_documentacao(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  editado_por UUID REFERENCES auth.users(id),
  editado_por_nome TEXT,
  observacao_mudanca TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sncf_documentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sncf_documentacao_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin and admin_rh can manage docs"
  ON public.sncf_documentacao FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'));

CREATE POLICY "Authorized roles can read docs"
  ON public.sncf_documentacao FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin_rh') OR
    has_role(auth.uid(), 'gestor_rh') OR
    has_role(auth.uid(), 'financeiro')
  );

CREATE POLICY "Same read access for versions"
  ON public.sncf_documentacao_versoes FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin_rh') OR
    has_role(auth.uid(), 'gestor_rh') OR
    has_role(auth.uid(), 'financeiro')
  );

CREATE POLICY "HR can insert version history"
  ON public.sncf_documentacao_versoes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'));

CREATE OR REPLACE FUNCTION public.sncf_documentacao_versionar()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.conteudo IS DISTINCT FROM NEW.conteudo OR OLD.titulo IS DISTINCT FROM NEW.titulo THEN
    INSERT INTO public.sncf_documentacao_versoes (
      documento_id, versao, titulo, conteudo, editado_por, editado_por_nome, observacao_mudanca
    ) VALUES (
      OLD.id, OLD.versao, OLD.titulo, OLD.conteudo, OLD.editado_por, OLD.editado_por_nome, NULL
    );
    NEW.versao = OLD.versao + 1;
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sncf_doc_versionar ON public.sncf_documentacao;
CREATE TRIGGER sncf_doc_versionar
  BEFORE UPDATE ON public.sncf_documentacao
  FOR EACH ROW
  EXECUTE FUNCTION public.sncf_documentacao_versionar();

CREATE INDEX IF NOT EXISTS idx_doc_tipo ON public.sncf_documentacao(tipo);
CREATE INDEX IF NOT EXISTS idx_doc_ativo ON public.sncf_documentacao(ativo);
CREATE INDEX IF NOT EXISTS idx_doc_conteudo ON public.sncf_documentacao USING gin(to_tsvector('portuguese', conteudo));

INSERT INTO public.sncf_documentacao (slug, titulo, descricao, tipo, conteudo, tags, ordem) VALUES
  ('runbook-tecnico', 'RunBook Técnico', 'Documentação técnica completa: arquitetura, tabelas, hooks, padrões de código', 'tecnico', '# RunBook Técnico

Conteúdo a ser preenchido pelo RH copiando do documento existente.', ARRAY['técnico', 'arquitetura', 'desenvolvedor'], 1),
  ('guia-usuario', 'Guia do Usuário', 'Manual completo do usuário por perfil e módulo', 'usuario', '# Guia do Usuário

Conteúdo a ser preenchido.', ARRAY['manual', 'usuário'], 2),
  ('estado-atual', 'Estado Atual', 'Documento de continuidade entre sessões', 'estado_atual', '# Estado Atual

Conteúdo a ser preenchido.', ARRAY['status', 'continuidade'], 3),
  ('roadmap', 'Roadmap & Melhorias', 'Pendências organizadas por prioridade', 'roadmap', '# Roadmap

Conteúdo a ser preenchido.', ARRAY['roadmap', 'prioridades'], 4),
  ('status-modulos', 'Status dos Módulos', 'Arquitetura e status de cada módulo do sistema', 'status', '# Status dos Módulos

Conteúdo a ser preenchido.', ARRAY['status', 'módulos'], 5)
ON CONFLICT (slug) DO NOTHING;