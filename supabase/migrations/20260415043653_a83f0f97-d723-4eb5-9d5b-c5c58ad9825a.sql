
CREATE TABLE IF NOT EXISTS public.entrevistas_candidato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('rh', 'gestor')),
  impressao_geral INTEGER CHECK (impressao_geral BETWEEN 1 AND 5),
  fit_cultural INTEGER CHECK (fit_cultural BETWEEN 1 AND 5),
  pontos_fortes TEXT,
  pontos_atencao TEXT,
  recomendacao TEXT CHECK (recomendacao IN ('avançar', 'aguardar', 'nao_avançar')),
  observacoes TEXT,
  preenchido_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidato_id, vaga_id, tipo)
);

ALTER TABLE public.entrevistas_candidato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage entrevistas"
ON public.entrevistas_candidato FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador') OR
  public.has_role(auth.uid(), 'gestor_direto')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador') OR
  public.has_role(auth.uid(), 'gestor_direto')
);

CREATE TRIGGER update_entrevistas_candidato_updated_at
BEFORE UPDATE ON public.entrevistas_candidato
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
