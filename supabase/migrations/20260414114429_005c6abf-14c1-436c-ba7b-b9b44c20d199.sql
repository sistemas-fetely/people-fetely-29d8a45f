
-- Candidato evaluations (scorecard)
CREATE TABLE IF NOT EXISTS public.candidato_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  avaliador_id UUID NOT NULL,
  skill TEXT NOT NULL,
  score INTEGER NOT NULL,
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for score range
CREATE OR REPLACE FUNCTION public.validate_avaliacao_score()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.score < 1 OR NEW.score > 5 THEN
    RAISE EXCEPTION 'score deve ser entre 1 e 5, recebido: %', NEW.score;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_avaliacao_score
BEFORE INSERT OR UPDATE ON public.candidato_avaliacoes
FOR EACH ROW EXECUTE FUNCTION public.validate_avaliacao_score();

ALTER TABLE public.candidato_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage candidato_avaliacoes"
ON public.candidato_avaliacoes FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'super_admin') OR
  public.has_role(auth.uid(),'admin_rh') OR
  public.has_role(auth.uid(),'gestor_rh') OR
  public.has_role(auth.uid(),'gestor_direto')
)
WITH CHECK (
  public.has_role(auth.uid(),'super_admin') OR
  public.has_role(auth.uid(),'admin_rh') OR
  public.has_role(auth.uid(),'gestor_rh') OR
  public.has_role(auth.uid(),'gestor_direto')
);

-- Candidato internal notes
CREATE TABLE IF NOT EXISTS public.candidato_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidato_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage candidato_notas"
ON public.candidato_notas FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'super_admin') OR
  public.has_role(auth.uid(),'admin_rh') OR
  public.has_role(auth.uid(),'gestor_rh') OR
  public.has_role(auth.uid(),'gestor_direto')
)
WITH CHECK (
  public.has_role(auth.uid(),'super_admin') OR
  public.has_role(auth.uid(),'admin_rh') OR
  public.has_role(auth.uid(),'gestor_rh') OR
  public.has_role(auth.uid(),'gestor_direto')
);

-- Candidato stage history log
CREATE TABLE IF NOT EXISTS public.candidato_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  responsavel_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidato_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage candidato_historico"
ON public.candidato_historico FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'super_admin') OR
  public.has_role(auth.uid(),'admin_rh') OR
  public.has_role(auth.uid(),'gestor_rh') OR
  public.has_role(auth.uid(),'gestor_direto')
)
WITH CHECK (
  public.has_role(auth.uid(),'super_admin') OR
  public.has_role(auth.uid(),'admin_rh') OR
  public.has_role(auth.uid(),'gestor_rh') OR
  public.has_role(auth.uid(),'gestor_direto')
);
