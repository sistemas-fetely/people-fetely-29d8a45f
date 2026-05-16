
-- NFs emitidas vindas do Bling
CREATE TABLE IF NOT EXISTS public.nfs_emitidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bling_id TEXT UNIQUE,
  numero TEXT,
  serie TEXT,
  chave_acesso TEXT UNIQUE,
  tipo TEXT, -- 'entrada' | 'saida'
  situacao TEXT,
  data_emissao DATE,
  data_saida DATE,
  valor_nota NUMERIC(14,2),
  parceiro_id UUID REFERENCES public.parceiros_comerciais(id) ON DELETE SET NULL,
  pedido_venda_id UUID,
  xml_url TEXT,
  pdf_url TEXT,
  observacoes TEXT,
  origem TEXT DEFAULT 'api_bling',
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfs_emitidas_parceiro ON public.nfs_emitidas(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_nfs_emitidas_data_emissao ON public.nfs_emitidas(data_emissao DESC);

ALTER TABLE public.nfs_emitidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfs_emitidas_select_authenticated"
  ON public.nfs_emitidas FOR SELECT
  TO authenticated USING (true);

-- INSERT/UPDATE/DELETE só via service role (sem policy = bloqueado pra authenticated)

CREATE TRIGGER trg_nfs_emitidas_updated_at
  BEFORE UPDATE ON public.nfs_emitidas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cursor de sincronização por entidade
CREATE TABLE IF NOT EXISTS public.integracoes_sync_cursor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sistema TEXT NOT NULL,
  entidade TEXT NOT NULL,
  ultima_pagina INTEGER DEFAULT 0,
  ultimo_bling_id TEXT,
  ultima_data_corte TIMESTAMPTZ,
  em_execucao BOOLEAN DEFAULT FALSE,
  iniciado_em TIMESTAMPTZ,
  total_processado INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sistema, entidade)
);

ALTER TABLE public.integracoes_sync_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integracoes_sync_cursor_select_authenticated"
  ON public.integracoes_sync_cursor FOR SELECT
  TO authenticated USING (true);

CREATE TRIGGER trg_integracoes_sync_cursor_updated_at
  BEFORE UPDATE ON public.integracoes_sync_cursor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
