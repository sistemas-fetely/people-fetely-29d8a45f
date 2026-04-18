-- Adicionar campos em fala_fetely_conhecimento
ALTER TABLE public.fala_fetely_conhecimento 
  ADD COLUMN IF NOT EXISTS fonte_arquivo_url TEXT,
  ADD COLUMN IF NOT EXISTS fonte_arquivo_nome TEXT,
  ADD COLUMN IF NOT EXISTS lote_importacao_id UUID;

-- Criar tabela de histórico de lotes importados
CREATE TABLE IF NOT EXISTS public.fala_fetely_importacoes_pdf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  tamanho_bytes INTEGER,
  conhecimentos_criados INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'aguardando_revisao', 'concluida', 'descartada', 'erro')),
  erro_mensagem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluida_em TIMESTAMPTZ
);

ALTER TABLE public.fala_fetely_importacoes_pdf ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e gestor RH gerenciam importacoes" 
  ON public.fala_fetely_importacoes_pdf 
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

CREATE INDEX IF NOT EXISTS idx_importacoes_user ON public.fala_fetely_importacoes_pdf(user_id);
CREATE INDEX IF NOT EXISTS idx_importacoes_status ON public.fala_fetely_importacoes_pdf(status);

-- Criar bucket privado no Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fala-fetely-fontes', 
  'fala-fetely-fontes', 
  false, 
  15728640,
  ARRAY['application/pdf']
) ON CONFLICT (id) DO UPDATE SET file_size_limit = 15728640, allowed_mime_types = ARRAY['application/pdf'];

-- Policies de storage
CREATE POLICY "Admin e gestor RH uploadam fontes fetely"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fala-fetely-fontes' 
    AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  );

CREATE POLICY "Admin e gestor RH leem fontes fetely"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'fala-fetely-fontes' 
    AND (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  );