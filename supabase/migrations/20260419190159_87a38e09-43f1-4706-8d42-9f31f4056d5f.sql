CREATE TABLE IF NOT EXISTS public.navegacao_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rota TEXT NOT NULL,
  titulo TEXT,
  acessado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_navegacao_user_recente 
  ON public.navegacao_log(user_id, acessado_em DESC);

CREATE INDEX IF NOT EXISTS idx_navegacao_user_rota 
  ON public.navegacao_log(user_id, rota);

COMMENT ON TABLE public.navegacao_log IS 
  'Registra acessos de usuários a telas internas para montar atalhos personalizados (4 mais acessados + último).';

ALTER TABLE public.navegacao_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "navegacao_log_insert_self" ON public.navegacao_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "navegacao_log_read_self" ON public.navegacao_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.meus_atalhos_personalizados(_limite INTEGER DEFAULT 4)
RETURNS TABLE(rota TEXT, titulo TEXT, acessos INTEGER, ultimo_acesso TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH stats AS (
    SELECT 
      rota,
      MAX(titulo) AS titulo,
      COUNT(*)::INTEGER AS acessos,
      MAX(acessado_em) AS ultimo_acesso
    FROM public.navegacao_log
    WHERE user_id = auth.uid()
      AND acessado_em >= now() - interval '30 days'
      AND rota NOT IN ('/', '/login', '/logout')
    GROUP BY rota
  )
  SELECT * FROM stats
  ORDER BY acessos DESC, ultimo_acesso DESC
  LIMIT _limite;
$$;