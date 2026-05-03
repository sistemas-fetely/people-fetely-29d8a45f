-- 1. Colunas em nfs_stage
ALTER TABLE public.nfs_stage
  ADD COLUMN IF NOT EXISTS resumo_pdf_pendente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resumo_pdf_gerado_em timestamptz,
  ADD COLUMN IF NOT EXISTS resumo_pdf_storage_path text;

CREATE INDEX IF NOT EXISTS idx_nfs_stage_resumo_pendente
  ON public.nfs_stage (resumo_pdf_pendente)
  WHERE resumo_pdf_pendente = true;

-- 2. Tabela de auditoria de falhas
CREATE TABLE IF NOT EXISTS public.auditoria_resumo_nfe_falhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfs_stage_id uuid NOT NULL REFERENCES public.nfs_stage(id) ON DELETE CASCADE,
  erro text NOT NULL,
  tentativa integer NOT NULL DEFAULT 1,
  contexto jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_resumo_nfe_falhas_stage
  ON public.auditoria_resumo_nfe_falhas (nfs_stage_id, created_at DESC);

ALTER TABLE public.auditoria_resumo_nfe_falhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auditoria resumo NFe visível para roles privilegiadas"
ON public.auditoria_resumo_nfe_falhas
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'financeiro'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
);

CREATE POLICY "Sistema pode inserir falhas"
ON public.auditoria_resumo_nfe_falhas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Trigger: marcar pendente quando XML chega sem PDF gerado
CREATE OR REPLACE FUNCTION public.trg_marcar_resumo_nfe_pendente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.arquivo_storage_path IS NOT NULL
     AND NEW.arquivo_nome ILIKE '%.xml'
     AND NEW.resumo_pdf_gerado_em IS NULL
     AND COALESCE(NEW.resumo_pdf_pendente, false) = false
  THEN
    NEW.resumo_pdf_pendente := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nfs_stage_resumo_pendente ON public.nfs_stage;
CREATE TRIGGER trg_nfs_stage_resumo_pendente
  BEFORE INSERT OR UPDATE OF arquivo_storage_path, arquivo_nome
  ON public.nfs_stage
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_marcar_resumo_nfe_pendente();

-- 4. RPC para regerar (botão "Regerar" da UI)
CREATE OR REPLACE FUNCTION public.marcar_resumo_nfe_para_regerar(_nfs_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
    OR public.has_role(auth.uid(), 'administrativo'::app_role)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para regerar resumo NFe';
  END IF;

  -- Apaga registros antigos de documentos linkados a esta NF
  DELETE FROM public.contas_pagar_documentos d
  USING public.contas_pagar_receber c
  WHERE d.conta_id = c.id
    AND c.nf_stage_id = _nfs_stage_id
    AND d.nome_arquivo LIKE 'resumo_nfe_%';

  UPDATE public.nfs_stage
  SET resumo_pdf_gerado_em = NULL,
      resumo_pdf_storage_path = NULL,
      resumo_pdf_pendente = true
  WHERE id = _nfs_stage_id;
END;
$$;

-- 5. Backfill: marcar XMLs existentes sem resumo como pendentes
UPDATE public.nfs_stage
SET resumo_pdf_pendente = true
WHERE arquivo_storage_path IS NOT NULL
  AND arquivo_nome ILIKE '%.xml'
  AND resumo_pdf_gerado_em IS NULL
  AND COALESCE(resumo_pdf_pendente, false) = false;