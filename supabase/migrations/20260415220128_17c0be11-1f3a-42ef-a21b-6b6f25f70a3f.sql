
-- 1. VAGAS — anon SELECT (somente vagas abertas)
CREATE POLICY "Anon pode ver vagas abertas"
ON public.vagas FOR SELECT TO anon
USING (status = 'aberta');

-- 2. CANDIDATOS — anon SELECT + UPDATE
CREATE POLICY "Anon pode ler candidatos"
ON public.candidatos FOR SELECT TO anon
USING (true);

CREATE POLICY "Anon pode atualizar candidatos"
ON public.candidatos FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- 3. TESTES TÉCNICOS — anon SELECT
CREATE POLICY "Anon pode ler testes tecnicos"
ON public.testes_tecnicos FOR SELECT TO anon
USING (true);

-- 4. CARGOS — anon SELECT
CREATE POLICY "Anon pode ler cargos"
ON public.cargos FOR SELECT TO anon
USING (true);

-- 5. TIGHTEN: testes_tecnicos anon UPDATE
DROP POLICY IF EXISTS "Candidato pode entregar teste" ON public.testes_tecnicos;

CREATE POLICY "Candidato pode entregar teste"
ON public.testes_tecnicos FOR UPDATE TO anon
USING (
  enviado_em IS NOT NULL
  AND entregue_em IS NULL
)
WITH CHECK (
  enviado_em IS NOT NULL
);
