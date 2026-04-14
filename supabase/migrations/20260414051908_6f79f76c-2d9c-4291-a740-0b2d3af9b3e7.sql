
-- Vagas de recrutamento
CREATE TABLE public.vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  area TEXT NOT NULL,
  departamento TEXT,
  tipo_contrato TEXT NOT NULL DEFAULT 'clt',
  nivel TEXT NOT NULL DEFAULT 'pleno',
  status TEXT NOT NULL DEFAULT 'rascunho',
  descricao TEXT,
  missao TEXT,
  responsabilidades TEXT[],
  skills_obrigatorias TEXT[],
  skills_desejadas TEXT[],
  ferramentas TEXT[],
  faixa_min NUMERIC,
  faixa_max NUMERIC,
  is_clevel BOOLEAN DEFAULT false,
  local_trabalho TEXT,
  jornada TEXT,
  beneficios TEXT,
  gestor_id UUID,
  criado_por UUID,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Candidatos
CREATE TABLE public.candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  curriculo_url TEXT,
  status TEXT NOT NULL DEFAULT 'recebido',
  origem TEXT DEFAULT 'portal',
  consentimento_lgpd BOOLEAN DEFAULT false,
  consentimento_lgpd_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vaga_id, email)
);

-- Validation trigger for vagas.tipo_contrato
CREATE OR REPLACE FUNCTION public.validate_vaga_tipo_contrato()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_contrato NOT IN ('clt', 'pj', 'ambos') THEN
    RAISE EXCEPTION 'tipo_contrato inválido: %', NEW.tipo_contrato;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_vaga_tipo_contrato
BEFORE INSERT OR UPDATE ON public.vagas
FOR EACH ROW EXECUTE FUNCTION public.validate_vaga_tipo_contrato();

-- Validation trigger for vagas.status
CREATE OR REPLACE FUNCTION public.validate_vaga_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('rascunho', 'aberta', 'em_selecao', 'encerrada', 'cancelada') THEN
    RAISE EXCEPTION 'status de vaga inválido: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_vaga_status
BEFORE INSERT OR UPDATE ON public.vagas
FOR EACH ROW EXECUTE FUNCTION public.validate_vaga_status();

-- Validation trigger for candidatos.status
CREATE OR REPLACE FUNCTION public.validate_candidato_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('recebido', 'triagem', 'entrevista_rh', 'entrevista_gestor',
                         'teste_tecnico', 'oferta', 'contratado', 'recusado', 'desistiu') THEN
    RAISE EXCEPTION 'status de candidato inválido: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_candidato_status
BEFORE INSERT OR UPDATE ON public.candidatos
FOR EACH ROW EXECUTE FUNCTION public.validate_candidato_status();

-- Updated_at triggers
CREATE TRIGGER update_vagas_updated_at
BEFORE UPDATE ON public.vagas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidatos_updated_at
BEFORE UPDATE ON public.candidatos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage vagas"
ON public.vagas FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh')
);

CREATE POLICY "Gestor direto can view own vagas"
ON public.vagas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor_direto') AND gestor_id = auth.uid()
);

CREATE POLICY "Staff can manage candidatos"
ON public.candidatos FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh')
);

CREATE POLICY "Public can insert candidatos"
ON public.candidatos FOR INSERT TO anon
WITH CHECK (true);
