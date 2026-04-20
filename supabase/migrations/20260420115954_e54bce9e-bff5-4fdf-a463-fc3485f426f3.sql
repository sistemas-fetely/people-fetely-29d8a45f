-- Expandir constraint de origem em fala_fetely_conhecimento
ALTER TABLE public.fala_fetely_conhecimento DROP CONSTRAINT IF EXISTS fala_fetely_conhecimento_origem_check;
ALTER TABLE public.fala_fetely_conhecimento ADD CONSTRAINT fala_fetely_conhecimento_origem_check
  CHECK (origem IN ('manual', 'sugestao_ia', 'aprendizado', 'feedback', 'sync_documentacao', 'importacao_pdf'));