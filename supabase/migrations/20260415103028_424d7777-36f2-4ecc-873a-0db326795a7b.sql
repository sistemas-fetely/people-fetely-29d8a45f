CREATE TABLE IF NOT EXISTS public.testes_tecnicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  desafio_contexto TEXT,
  desafio_descricao TEXT,
  desafio_entregaveis TEXT,
  desafio_criterios TEXT,
  prazo_entrega DATE,
  link_entrega TEXT,
  nota INTEGER CHECK (nota BETWEEN 1 AND 5),
  pontos_avaliados TEXT,
  resultado TEXT CHECK (resultado IN ('aprovado', 'reprovado', 'pendente')),
  enviado_em TIMESTAMPTZ,
  enviado_por UUID REFERENCES auth.users(id),
  avaliado_em TIMESTAMPTZ,
  avaliado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidato_id, vaga_id)
);

ALTER TABLE public.testes_tecnicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage testes_tecnicos"
ON public.testes_tecnicos FOR ALL TO authenticated
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