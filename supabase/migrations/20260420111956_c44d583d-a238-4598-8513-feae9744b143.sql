-- Storage: documentos-cadastro — restringir SELECT a authenticated
DROP POLICY IF EXISTS "Anyone can read cadastro documents" ON storage.objects;
CREATE POLICY "Authenticated can read documentos-cadastro"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documentos-cadastro');

-- Storage: ti-ativos — restringir SELECT a authenticated
DROP POLICY IF EXISTS "Public can read ti-ativos" ON storage.objects;
CREATE POLICY "Authenticated can read ti-ativos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ti-ativos');

-- testes_tecnicos: tighten anon UPDATE
-- Candidato anônimo só entrega (link_entrega + entregue_em) enquanto teste estiver enviado e não entregue
-- Não pode mexer em nota/resultado/avaliação
DROP POLICY IF EXISTS "Candidato pode entregar teste" ON public.testes_tecnicos;

CREATE POLICY "Anon pode entregar seu teste"
ON public.testes_tecnicos
FOR UPDATE
TO anon
USING (
  enviado_em IS NOT NULL
  AND entregue_em IS NULL
  AND avaliado_em IS NULL
)
WITH CHECK (
  enviado_em IS NOT NULL
  AND nota IS NULL
  AND resultado IS NULL
  AND avaliado_em IS NULL
  AND avaliado_por IS NULL
);