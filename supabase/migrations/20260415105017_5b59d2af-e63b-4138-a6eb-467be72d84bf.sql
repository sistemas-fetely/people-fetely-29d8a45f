ALTER TABLE public.testes_tecnicos
ADD COLUMN IF NOT EXISTS entregue_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notificacao_rh_enviada BOOLEAN DEFAULT false;

-- Allow public/anon to update testes_tecnicos for candidate delivery
CREATE POLICY "Candidato pode entregar teste"
ON public.testes_tecnicos FOR UPDATE TO anon
USING (true)
WITH CHECK (true);