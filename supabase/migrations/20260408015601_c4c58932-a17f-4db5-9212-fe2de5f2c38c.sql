
-- Create contratos_pj table
CREATE TABLE public.contratos_pj (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Dados da empresa PJ
  cnpj TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_municipal TEXT,
  inscricao_estadual TEXT,
  
  -- Contato
  contato_nome TEXT NOT NULL,
  contato_telefone TEXT,
  contato_email TEXT,
  
  -- Contrato
  objeto TEXT,
  tipo_servico TEXT NOT NULL,
  departamento TEXT NOT NULL,
  valor_mensal NUMERIC NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'transferencia',
  dia_vencimento INTEGER DEFAULT 10,
  
  -- Vigência
  data_inicio DATE NOT NULL,
  data_fim DATE,
  renovacao_automatica BOOLEAN NOT NULL DEFAULT false,
  
  -- Dados bancários do prestador
  banco_nome TEXT,
  banco_codigo TEXT,
  agencia TEXT,
  conta TEXT,
  tipo_conta TEXT DEFAULT 'corrente',
  chave_pix TEXT,
  
  -- Status e controle
  status TEXT NOT NULL DEFAULT 'rascunho',
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contratos_pj ENABLE ROW LEVEL SECURITY;

-- Super admin and HR can do everything
CREATE POLICY "Super admin and HR can manage contratos_pj"
ON public.contratos_pj
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role));

-- Financeiro can view
CREATE POLICY "Financeiro can view contratos_pj"
ON public.contratos_pj
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role));

-- Gestor direto can view
CREATE POLICY "Gestor direto can view contratos_pj"
ON public.contratos_pj
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor_direto'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_contratos_pj_updated_at
BEFORE UPDATE ON public.contratos_pj
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
