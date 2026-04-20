-- Documentação Fetely · Migrar de TI para SNCF transversal
ALTER TABLE public.sncf_documentacao
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'operacional' 
    CHECK (categoria IN ('dna_marca', 'people', 'juridico', 'ti', 'operacional', 'roadmap'));

COMMENT ON COLUMN public.sncf_documentacao.categoria IS 
  'Categoria do documento: dna_marca, people, juridico, ti, operacional, roadmap.';

ALTER TABLE public.sncf_documentacao
  ADD COLUMN IF NOT EXISTS sync_fala_fetely BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fala_fetely_conhecimento_id UUID;

COMMENT ON COLUMN public.sncf_documentacao.sync_fala_fetely IS 
  'Se true, atualizações neste doc são sincronizadas com fala_fetely_conhecimento automaticamente.';

DELETE FROM public.sncf_documentacao 
WHERE slug IN ('runbook-tecnico', 'guia-usuario', 'estado-atual', 'roadmap')
  AND conteudo LIKE '%Conteúdo a ser preenchido%';

DO $$
BEGIN
  PERFORM public.registrar_audit(
    'DOCUMENTACAO_MIGRADA_PARA_SNCF',
    jsonb_build_object(
      'acao', 'Migrou documentação de TI para SNCF transversal',
      'placeholders_removidos', ARRAY['runbook-tecnico', 'guia-usuario', 'estado-atual', 'roadmap'],
      'nova_coluna', 'categoria',
      'aplicado_em', now()
    )
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;