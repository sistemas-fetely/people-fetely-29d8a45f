-- Tabela de ativos de TI (inventário)
CREATE TABLE IF NOT EXISTS public.ti_ativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  numero_patrimonio TEXT,
  hostname TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'atribuido', 'manutencao', 'descartado')),
  estado TEXT NOT NULL DEFAULT 'novo' CHECK (estado IN ('novo', 'usado', 'recondicionado')),
  data_compra DATE,
  valor_compra NUMERIC,
  fornecedor TEXT,
  nota_fiscal TEXT,
  garantia_ate DATE,
  colaborador_id UUID,
  colaborador_tipo TEXT CHECK (colaborador_tipo IN ('clt', 'pj')),
  colaborador_nome TEXT,
  atribuido_em DATE,
  devolvido_em DATE,
  localizacao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.ti_ativos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users with TI access can manage ativos"
  ON public.ti_ativos FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin_rh') OR
    EXISTS (
      SELECT 1 FROM sncf_user_systems us
      JOIN sncf_sistemas s ON s.id = us.sistema_id
      WHERE us.user_id = auth.uid() AND s.slug = 'ti' AND us.ativo = true
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin_rh') OR
    EXISTS (
      SELECT 1 FROM sncf_user_systems us
      JOIN sncf_sistemas s ON s.id = us.sistema_id
      WHERE us.user_id = auth.uid() AND s.slug = 'ti' AND us.ativo = true
    )
  );

CREATE TRIGGER update_ti_ativos_updated_at
BEFORE UPDATE ON public.ti_ativos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Histórico de movimentação de ativos
CREATE TABLE IF NOT EXISTS public.ti_ativos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo_id UUID NOT NULL REFERENCES ti_ativos(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  de_colaborador TEXT,
  para_colaborador TEXT,
  responsavel_id UUID REFERENCES auth.users(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ti_ativos_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same access as ti_ativos"
  ON public.ti_ativos_historico FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin_rh') OR
    EXISTS (
      SELECT 1 FROM sncf_user_systems us
      JOIN sncf_sistemas s ON s.id = us.sistema_id
      WHERE us.user_id = auth.uid() AND s.slug = 'ti' AND us.ativo = true
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin') OR
    has_role(auth.uid(), 'admin_rh') OR
    EXISTS (
      SELECT 1 FROM sncf_user_systems us
      JOIN sncf_sistemas s ON s.id = us.sistema_id
      WHERE us.user_id = auth.uid() AND s.slug = 'ti' AND us.ativo = true
    )
  );

-- Dar acesso ao TI Fetely para o super_admin
INSERT INTO public.sncf_user_systems (user_id, sistema_id, role_no_sistema, ativo)
SELECT au.id, s.id, 'admin', true
FROM auth.users au
CROSS JOIN public.sncf_sistemas s
WHERE s.slug = 'ti'
AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = au.id AND ur.role = 'super_admin')
ON CONFLICT (user_id, sistema_id) DO NOTHING;