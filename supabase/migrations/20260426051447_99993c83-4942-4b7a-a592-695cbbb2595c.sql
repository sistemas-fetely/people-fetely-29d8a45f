-- Tabela de rascunhos de importação
CREATE TABLE IF NOT EXISTS public.rascunhos_importacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_importacao TEXT NOT NULL CHECK (tipo_importacao IN ('csv_qive', 'pdf_danfe', 'pdf_invoice')),
  nfs_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rascunhos_importacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem seus rascunhos"
  ON public.rascunhos_importacao FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios criam seus rascunhos"
  ON public.rascunhos_importacao FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios atualizam seus rascunhos"
  ON public.rascunhos_importacao FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios deletam seus rascunhos"
  ON public.rascunhos_importacao FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS idx_rascunhos_usuario_tipo
  ON public.rascunhos_importacao(usuario_id, tipo_importacao);

CREATE TRIGGER set_rascunhos_updated_at
  BEFORE UPDATE ON public.rascunhos_importacao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.limpar_rascunhos_antigos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.rascunhos_importacao
  WHERE created_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;