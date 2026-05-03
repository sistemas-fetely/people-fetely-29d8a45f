CREATE OR REPLACE FUNCTION public.trg_marcar_resumo_nfe_pendente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xml_path text;
BEGIN
  v_xml_path := COALESCE(NEW.xml_storage_path, NEW.arquivo_storage_path);

  IF v_xml_path IS NOT NULL
     AND (
       NEW.xml_storage_path IS NOT NULL
       OR (NEW.arquivo_nome IS NOT NULL AND NEW.arquivo_nome ILIKE '%.xml')
     )
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
  BEFORE INSERT OR UPDATE OF arquivo_storage_path, arquivo_nome, xml_storage_path
  ON public.nfs_stage
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_marcar_resumo_nfe_pendente();

-- Backfill ampliado
UPDATE public.nfs_stage
SET resumo_pdf_pendente = true
WHERE COALESCE(xml_storage_path, arquivo_storage_path) IS NOT NULL
  AND (
    xml_storage_path IS NOT NULL
    OR (arquivo_nome IS NOT NULL AND arquivo_nome ILIKE '%.xml')
  )
  AND resumo_pdf_gerado_em IS NULL
  AND COALESCE(resumo_pdf_pendente, false) = false;