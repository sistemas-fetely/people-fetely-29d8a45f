
-- Create convites_cadastro table
CREATE TABLE public.convites_cadastro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('clt', 'pj')),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT,
  departamento TEXT,
  criado_por UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'preenchido', 'expirado', 'cancelado')),
  expira_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  preenchido_em TIMESTAMP WITH TIME ZONE,
  colaborador_id UUID REFERENCES public.colaboradores_clt(id),
  contrato_pj_id UUID REFERENCES public.contratos_pj(id),
  dados_preenchidos JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.convites_cadastro ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read a convite by token (for the public form)
CREATE POLICY "Public can read convite by token"
  ON public.convites_cadastro
  FOR SELECT
  USING (true);

-- Public: anyone can update a pendente convite (to submit the form data)
CREATE POLICY "Public can update pendente convite"
  ON public.convites_cadastro
  FOR UPDATE
  USING (status = 'pendente' AND expira_em > now());

-- Authenticated users can create convites
CREATE POLICY "Authenticated users can create convites"
  ON public.convites_cadastro
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can delete convites
CREATE POLICY "Authenticated users can delete convites"
  ON public.convites_cadastro
  FOR DELETE
  TO authenticated
  USING (true);

-- Create notificacoes_rh table for in-app notifications
CREATE TABLE public.notificacoes_rh (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes_rh ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notificacoes_rh
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own notifications"
  ON public.notificacoes_rh
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Allow anon to insert notifications (from public form)
CREATE POLICY "Anyone can insert notifications"
  ON public.notificacoes_rh
  FOR INSERT
  WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_convites_cadastro_updated_at
  BEFORE UPDATE ON public.convites_cadastro
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
