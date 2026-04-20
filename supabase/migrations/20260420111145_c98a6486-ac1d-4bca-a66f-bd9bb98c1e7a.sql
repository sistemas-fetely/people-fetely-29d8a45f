
-- ============================================================
-- 1. Tighten candidatos table RLS (drop anon read/update; keep limited public insert)
-- ============================================================
DROP POLICY IF EXISTS "Anon pode atualizar candidatos" ON public.candidatos;
DROP POLICY IF EXISTS "Anon pode ler candidatos" ON public.candidatos;
DROP POLICY IF EXISTS "Public can insert candidatos" ON public.candidatos;

-- Allow anonymous INSERT only when the row matches an open vaga and required PII is present
CREATE POLICY "Anon can submit candidacy to open vaga"
ON public.candidatos
FOR INSERT
TO anon
WITH CHECK (
  vaga_id IS NOT NULL
  AND nome IS NOT NULL AND length(trim(nome)) > 0
  AND email IS NOT NULL AND length(trim(email)) > 0
  AND status = 'recebido'
  AND score_total IS NULL
  AND score_detalhado IS NULL
  AND EXISTS (
    SELECT 1 FROM public.vagas v
    WHERE v.id = vaga_id
      AND v.status IN ('aberta', 'em_selecao')
  )
);

-- Authenticated candidates submitting (logged-in users) — same constraint
CREATE POLICY "Authenticated can submit candidacy to open vaga"
ON public.candidatos
FOR INSERT
TO authenticated
WITH CHECK (
  vaga_id IS NOT NULL
  AND nome IS NOT NULL AND length(trim(nome)) > 0
  AND email IS NOT NULL AND length(trim(email)) > 0
  AND EXISTS (
    SELECT 1 FROM public.vagas v
    WHERE v.id = vaga_id
      AND v.status IN ('aberta', 'em_selecao')
  )
);

-- (Existing "Staff can manage candidatos" and "recrutador_candidatos" policies remain)

-- ============================================================
-- 2. Recreate SECURITY DEFINER views with security_invoker
-- ============================================================
DROP VIEW IF EXISTS public.meus_acessos_salario;
CREATE VIEW public.meus_acessos_salario
WITH (security_invoker = true)
AS
SELECT l.id,
       l.user_id AS ator_user_id,
       COALESCE(l.user_nome, p_ator.full_name) AS ator_nome,
       l.contexto,
       l.justificativa,
       COALESCE(l.em_lote, false) AS em_lote,
       COALESCE(l.quantidade_alvos, 1) AS quantidade_alvos,
       l.created_at AS criado_em
FROM acesso_dados_log l
LEFT JOIN profiles p_ator ON p_ator.user_id = l.user_id
WHERE l.tipo_dado = 'salario'
  AND l.alvo_user_id = auth.uid()
ORDER BY l.created_at DESC;

DROP VIEW IF EXISTS public.kpis_nf_pj_mensal;
CREATE VIEW public.kpis_nf_pj_mensal
WITH (security_invoker = true)
AS
SELECT to_char(date_trunc('month'::text, created_at), 'YYYY-MM'::text) AS mes_submissao,
       count(*) AS total_submetidas,
       count(*) FILTER (WHERE status = ANY (ARRAY['aprovada'::text, 'enviada_pagamento'::text, 'paga'::text])) AS total_aprovadas,
       count(*) FILTER (WHERE status = 'precisa_correcao'::text) AS total_rejeitadas,
       count(*) FILTER (WHERE status = 'em_disputa'::text) AS total_em_disputa,
       avg(valor) AS valor_medio,
       COALESCE(sum((SELECT sum(c.valor) FROM nf_pj_classificacoes c WHERE c.nota_fiscal_id = nf.id AND c.categoria_valor = 'contrato'::text)), 0::numeric) AS folha_contratual,
       COALESCE(sum((SELECT sum(c.valor) FROM nf_pj_classificacoes c WHERE c.nota_fiscal_id = nf.id AND c.categoria_valor <> 'contrato'::text)), 0::numeric) AS despesa_variavel,
       round(((100.0 * (count(*) FILTER (WHERE NOT (id IN (SELECT lf.nota_fiscal_id FROM nf_pj_log_fiscal lf WHERE lf.tipo_evento = 'rejeitada_automatica'::text))))::numeric) / NULLIF(count(*), 0)::numeric), 2) AS taxa_aprovacao_1a_tentativa_pct
FROM notas_fiscais_pj nf
GROUP BY date_trunc('month'::text, created_at)
ORDER BY to_char(date_trunc('month'::text, created_at), 'YYYY-MM'::text) DESC;

-- ============================================================
-- 3. Realtime channel authorization
-- ============================================================
-- Restrict realtime.messages so users can only subscribe to topics scoped to their own user_id
-- (e.g. "user:{auth.uid()}" — frontend should subscribe to per-user topics)
DO $$
BEGIN
  -- Drop existing if present
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'realtime' AND tablename = 'messages' AND policyname = 'authenticated_can_subscribe_own_topic') THEN
    DROP POLICY "authenticated_can_subscribe_own_topic" ON realtime.messages;
  END IF;
END $$;

CREATE POLICY "authenticated_can_subscribe_own_topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow subscription to per-user topics like "user:<uid>" or "notificacoes:<uid>"
  realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() = ('notificacoes:' || auth.uid()::text)
  -- Allow staff to subscribe to broader staff topics
  OR (
    realtime.topic() LIKE 'staff:%'
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin_rh')
      OR public.has_role(auth.uid(), 'gestor_rh')
    )
  )
);
