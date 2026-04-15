CREATE TABLE IF NOT EXISTS public.beneficios_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'todos'
    CHECK (tipo IN ('clt', 'pj', 'todos')),
  ativo BOOLEAN DEFAULT true,
  criado_por TEXT DEFAULT 'sistema',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(beneficio, tipo)
);

ALTER TABLE public.beneficios_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read beneficios_catalogo"
ON public.beneficios_catalogo FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage beneficios_catalogo"
ON public.beneficios_catalogo FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador')
);

INSERT INTO public.beneficios_catalogo (beneficio, tipo) VALUES
('Vale Refeição (VR)', 'clt'),
('Vale Alimentação (VA)', 'clt'),
('Vale Transporte (VT)', 'clt'),
('Plano de Saúde', 'clt'),
('Plano Odontológico', 'clt'),
('Seguro de Vida', 'clt'),
('PLR', 'clt'),
('PPR', 'clt'),
('Gympass / Wellhub', 'clt'),
('Day Off no aniversário', 'clt'),
('Home Office', 'clt'),
('Auxílio Home Office', 'clt'),
('Bolsa de Estudos', 'clt'),
('Previdência Privada', 'clt'),
('Plano de Saúde', 'pj'),
('Gympass / Wellhub', 'pj'),
('Auxílio Home Office', 'pj'),
('Bolsa de Estudos', 'pj'),
('Day Off no aniversário', 'pj'),
('Participação nos Resultados', 'todos'),
('Celular corporativo', 'todos'),
('Notebook', 'todos'),
('Acesso a plataformas de cursos', 'todos'),
('Flexibilidade de horário', 'todos'),
('Trabalho remoto', 'todos'),
('Bônus por performance', 'todos')
ON CONFLICT (beneficio, tipo) DO NOTHING;