
-- Create colaboradores_clt table
CREATE TABLE public.colaboradores_clt (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Dados Pessoais
  nome_completo TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  rg TEXT,
  orgao_emissor TEXT,
  data_nascimento DATE NOT NULL,
  genero TEXT,
  estado_civil TEXT,
  nacionalidade TEXT DEFAULT 'Brasileira',
  etnia TEXT,
  nome_mae TEXT,
  nome_pai TEXT,
  
  -- Endereço
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  
  -- Contato
  telefone TEXT,
  email_pessoal TEXT,
  contato_emergencia_nome TEXT,
  contato_emergencia_telefone TEXT,
  
  -- Documentos
  pis_pasep TEXT,
  ctps_numero TEXT,
  ctps_serie TEXT,
  ctps_uf TEXT,
  titulo_eleitor TEXT,
  zona_eleitoral TEXT,
  secao_eleitoral TEXT,
  cnh_numero TEXT,
  cnh_categoria TEXT,
  cnh_validade DATE,
  certificado_reservista TEXT,
  
  -- Dados Profissionais
  matricula TEXT UNIQUE,
  cargo TEXT NOT NULL,
  departamento TEXT NOT NULL,
  data_admissao DATE NOT NULL,
  tipo_contrato TEXT NOT NULL DEFAULT 'indeterminado',
  salario_base NUMERIC(12,2) NOT NULL,
  jornada_semanal INTEGER DEFAULT 44,
  horario_trabalho TEXT,
  gestor_direto_id UUID REFERENCES public.profiles(id),
  local_trabalho TEXT,
  
  -- Dados Bancários
  banco_nome TEXT,
  banco_codigo TEXT,
  agencia TEXT,
  conta TEXT,
  tipo_conta TEXT DEFAULT 'corrente',
  chave_pix TEXT,
  
  -- Controle
  status TEXT NOT NULL DEFAULT 'ativo',
  foto_url TEXT,
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create dependentes table
CREATE TABLE public.dependentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores_clt(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  cpf TEXT,
  data_nascimento DATE NOT NULL,
  parentesco TEXT NOT NULL,
  incluir_irrf BOOLEAN DEFAULT false,
  incluir_plano_saude BOOLEAN DEFAULT false,
  documento_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.colaboradores_clt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependentes ENABLE ROW LEVEL SECURITY;

-- RLS policies for colaboradores_clt
CREATE POLICY "Super admin and HR can do everything on colaboradores"
  ON public.colaboradores_clt FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'gestor_rh'));

CREATE POLICY "Gestor direto can view colaboradores"
  ON public.colaboradores_clt FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor_direto'));

CREATE POLICY "Colaborador can view own record"
  ON public.colaboradores_clt FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS policies for dependentes
CREATE POLICY "Super admin and HR can do everything on dependentes"
  ON public.dependentes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'gestor_rh'));

CREATE POLICY "Colaborador can view own dependentes"
  ON public.dependentes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores_clt c
      WHERE c.id = colaborador_id AND c.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_colaboradores_cpf ON public.colaboradores_clt(cpf);
CREATE INDEX idx_colaboradores_departamento ON public.colaboradores_clt(departamento);
CREATE INDEX idx_colaboradores_status ON public.colaboradores_clt(status);
CREATE INDEX idx_dependentes_colaborador ON public.dependentes(colaborador_id);

-- Triggers for updated_at
CREATE TRIGGER update_colaboradores_clt_updated_at
  BEFORE UPDATE ON public.colaboradores_clt
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dependentes_updated_at
  BEFORE UPDATE ON public.dependentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
