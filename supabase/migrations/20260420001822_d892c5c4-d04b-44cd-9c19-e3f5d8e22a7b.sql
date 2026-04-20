-- ============================================================
-- Fase NF-1.B · Storage + Policies para PJ submeter NF
-- ============================================================

-- ═══ 1. Bucket privado para PDFs de NF PJ ═══
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notas-fiscais-pj', 
  'notas-fiscais-pj', 
  false,
  15728640,
  ARRAY['application/pdf']
) ON CONFLICT (id) DO UPDATE 
  SET file_size_limit = 15728640, 
      allowed_mime_types = ARRAY['application/pdf'];

-- ═══ 2. Policies do bucket ═══
DROP POLICY IF EXISTS "nf_pj_upload_self" ON storage.objects;
CREATE POLICY "nf_pj_upload_self"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'notas-fiscais-pj'
    AND EXISTS (
      SELECT 1 FROM public.contratos_pj 
      WHERE user_id = auth.uid()
        AND id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "nf_pj_read_self" ON storage.objects;
CREATE POLICY "nf_pj_read_self"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'notas-fiscais-pj'
    AND EXISTS (
      SELECT 1 FROM public.contratos_pj 
      WHERE user_id = auth.uid()
        AND id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "nf_pj_read_admin" ON storage.objects;
CREATE POLICY "nf_pj_read_admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'notas-fiscais-pj'
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin_rh'::app_role)
      OR public.has_role(auth.uid(), 'gestor_rh'::app_role)
      OR public.has_role(auth.uid(), 'financeiro'::app_role)
    )
  );

-- ═══ 3. Policies de notas_fiscais_pj para PJ autor ═══
DROP POLICY IF EXISTS "notas_pj_insert_self" ON public.notas_fiscais_pj;
CREATE POLICY "notas_pj_insert_self"
  ON public.notas_fiscais_pj FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contratos_pj 
      WHERE id = contrato_id 
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "notas_pj_read_self" ON public.notas_fiscais_pj;
CREATE POLICY "notas_pj_read_self"
  ON public.notas_fiscais_pj FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contratos_pj 
      WHERE id = contrato_id 
        AND user_id = auth.uid()
    )
  );

-- ═══ 4. Função helper: contrato ativo do PJ logado ═══
CREATE OR REPLACE FUNCTION public.meu_contrato_pj_ativo()
RETURNS TABLE (
  id UUID,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  contato_nome TEXT,
  valor_mensal NUMERIC,
  categoria_pj TEXT,
  status TEXT,
  data_inicio DATE,
  data_fim DATE
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    cpj.id, cpj.razao_social, cpj.nome_fantasia, cpj.cnpj, cpj.contato_nome,
    cpj.valor_mensal, cpj.categoria_pj, cpj.status,
    cpj.data_inicio, cpj.data_fim
  FROM public.contratos_pj cpj
  WHERE cpj.user_id = auth.uid()
    AND cpj.status = 'ativo'
  ORDER BY cpj.data_inicio DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.meu_contrato_pj_ativo IS 
  'Retorna o contrato PJ ativo do usuário logado. Usado no portal /minhas-notas.';