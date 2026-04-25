-- 1.1 Tabela de documentos por conta
CREATE TABLE IF NOT EXISTS public.contas_pagar_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.contas_pagar_receber(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('nf', 'recibo', 'boleto', 'ticket_cartao', 'comprovante', 'contrato', 'outro')),
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tamanho_bytes INT,
  uploaded_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_docs_conta ON public.contas_pagar_documentos(conta_id);

ALTER TABLE public.contas_pagar_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View cp docs" ON public.contas_pagar_documentos;
CREATE POLICY "View cp docs" ON public.contas_pagar_documentos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insert cp docs" ON public.contas_pagar_documentos;
CREATE POLICY "Insert cp docs" ON public.contas_pagar_documentos
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Delete cp docs" ON public.contas_pagar_documentos;
CREATE POLICY "Delete cp docs" ON public.contas_pagar_documentos
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- 1.2 Campos novos
ALTER TABLE public.contas_pagar_receber
  ADD COLUMN IF NOT EXISTS docs_status TEXT DEFAULT 'pendente' CHECK (docs_status IN ('ok', 'pendente', 'parcial')),
  ADD COLUMN IF NOT EXISTS is_cartao BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dados_bancarios_fornecedor JSONB;

-- 1.3 Bucket de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('financeiro-docs', 'financeiro-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Auth users can upload financeiro docs" ON storage.objects;
CREATE POLICY "Auth users can upload financeiro docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'financeiro-docs');

DROP POLICY IF EXISTS "Auth users can view financeiro docs" ON storage.objects;
CREATE POLICY "Auth users can view financeiro docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'financeiro-docs');

DROP POLICY IF EXISTS "Super admin can delete financeiro docs" ON storage.objects;
CREATE POLICY "Super admin can delete financeiro docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'financeiro-docs' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- 1.4 Função e trigger pra atualizar docs_status automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_docs_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tem_nf BOOLEAN;
  v_tem_recibo BOOLEAN;
  v_tem_algum BOOLEAN;
  v_novo_status TEXT;
  v_conta_id UUID;
BEGIN
  v_conta_id := COALESCE(NEW.conta_id, OLD.conta_id);

  SELECT
    bool_or(tipo = 'nf'),
    bool_or(tipo = 'recibo'),
    count(*) > 0
  INTO v_tem_nf, v_tem_recibo, v_tem_algum
  FROM public.contas_pagar_documentos
  WHERE conta_id = v_conta_id;

  -- Considera também NF vinculada via XML/Qive
  IF v_tem_nf OR v_tem_recibo OR EXISTS (
    SELECT 1 FROM public.contas_pagar_receber
    WHERE id = v_conta_id AND nf_chave_acesso IS NOT NULL AND nf_chave_acesso <> ''
  ) THEN
    v_novo_status := 'ok';
  ELSIF v_tem_algum THEN
    v_novo_status := 'parcial';
  ELSE
    v_novo_status := 'pendente';
  END IF;

  UPDATE public.contas_pagar_receber
  SET docs_status = v_novo_status, updated_at = now()
  WHERE id = v_conta_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_docs_status_update ON public.contas_pagar_documentos;
CREATE TRIGGER trg_docs_status_update
  AFTER INSERT OR DELETE ON public.contas_pagar_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_docs_status();

-- Atualiza docs_status quando NF é vinculada via Qive/XML
CREATE OR REPLACE FUNCTION public.atualizar_docs_status_nf()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.nf_chave_acesso IS NOT NULL AND NEW.nf_chave_acesso <> ''
     AND (OLD.nf_chave_acesso IS NULL OR OLD.nf_chave_acesso = '') THEN
    NEW.docs_status := 'ok';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_docs_status_nf ON public.contas_pagar_receber;
CREATE TRIGGER trg_docs_status_nf
  BEFORE UPDATE ON public.contas_pagar_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_docs_status_nf();

-- 1.5 Detectar cartão automaticamente
CREATE OR REPLACE FUNCTION public.detectar_cartao_cp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.forma_pagamento_id IS NOT NULL THEN
    SELECT (codigo IN ('cartao_credito', 'cartao_debito'))
    INTO NEW.is_cartao
    FROM public.formas_pagamento
    WHERE id = NEW.forma_pagamento_id;

    IF NEW.is_cartao IS NULL THEN
      NEW.is_cartao := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detectar_cartao ON public.contas_pagar_receber;
CREATE TRIGGER trg_detectar_cartao
  BEFORE INSERT OR UPDATE ON public.contas_pagar_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.detectar_cartao_cp();