CREATE TABLE IF NOT EXISTS public.ofertas_candidato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  tipo_contrato TEXT CHECK (tipo_contrato IN ('clt', 'pj')),
  salario_proposto NUMERIC,
  data_inicio DATE,
  beneficios TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'em_negociacao'
    CHECK (status IN ('em_negociacao', 'aceita', 'recusada')),
  enviado_em TIMESTAMPTZ,
  enviado_por UUID REFERENCES auth.users(id),
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidato_id, vaga_id)
);

ALTER TABLE public.ofertas_candidato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage ofertas"
ON public.ofertas_candidato FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador')
);