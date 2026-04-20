-- Adicionar colunas para suporte a importação de PDF e tags em processos
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS importado_de_pdf BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS importacao_pdf_id UUID REFERENCES public.processos_importacoes_pdf(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.processos.tags IS 'Tags livres do processo';
COMMENT ON COLUMN public.processos.importado_de_pdf IS 'Processo foi criado via importação PDF + IA';
COMMENT ON COLUMN public.processos.importacao_pdf_id IS 'Referência à importação que gerou o processo';

CREATE INDEX IF NOT EXISTS idx_processos_importacao_pdf ON public.processos(importacao_pdf_id) WHERE importacao_pdf_id IS NOT NULL;