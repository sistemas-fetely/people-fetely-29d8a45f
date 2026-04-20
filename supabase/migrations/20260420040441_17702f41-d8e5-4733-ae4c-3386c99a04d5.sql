CREATE TABLE IF NOT EXISTS public.processos_importacoes_pdf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importado_por UUID REFERENCES auth.users(id),
  importado_por_nome TEXT,
  arquivo_nome TEXT NOT NULL,
  arquivo_tamanho_kb INTEGER,
  arquivo_paginas INTEGER,
  status TEXT NOT NULL CHECK (status IN (
    'em_processamento',
    'sucesso',
    'recusado_nao_processo',
    'erro_ia',
    'erro_pdf'
  )),
  resultado_ia JSONB,
  processos_criados UUID[] DEFAULT ARRAY[]::UUID[],
  erro_mensagem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.processos_importacoes_pdf IS
  'Auditoria de cada importação de PDF pra Processos Fetely. Guarda histórico, resultado IA, processos criados.';

CREATE INDEX IF NOT EXISTS idx_proc_imp_pdf_user ON public.processos_importacoes_pdf(importado_por);
CREATE INDEX IF NOT EXISTS idx_proc_imp_pdf_status ON public.processos_importacoes_pdf(status);

CREATE TRIGGER trg_proc_imp_pdf_updated_at
  BEFORE UPDATE ON public.processos_importacoes_pdf
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.processos_importacoes_pdf ENABLE ROW LEVEL SECURITY;

CREATE POLICY "importacoes_pdf_admin_all" ON public.processos_importacoes_pdf
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
  );