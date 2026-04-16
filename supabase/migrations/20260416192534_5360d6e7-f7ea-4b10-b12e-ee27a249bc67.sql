-- Tabela de sistemas do SNCF
CREATE TABLE IF NOT EXISTS public.sncf_sistemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'layout-grid',
  cor TEXT DEFAULT '#1A4A3A',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  rota_base TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sncf_sistemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sistemas"
  ON public.sncf_sistemas FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage sistemas"
  ON public.sncf_sistemas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Tabela de acesso de usuários por sistema
CREATE TABLE IF NOT EXISTS public.sncf_user_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sistema_id UUID NOT NULL REFERENCES sncf_sistemas(id) ON DELETE CASCADE,
  role_no_sistema TEXT NOT NULL DEFAULT 'usuario',
  ativo BOOLEAN NOT NULL DEFAULT true,
  concedido_por UUID REFERENCES auth.users(id),
  concedido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sistema_id)
);

ALTER TABLE public.sncf_user_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own system access"
  ON public.sncf_user_systems FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admin and HR can manage system access"
  ON public.sncf_user_systems FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh'));

-- Seed: sistemas iniciais
INSERT INTO public.sncf_sistemas (slug, nome, descricao, icone, cor, ativo, ordem, rota_base) VALUES
  ('people', 'People Fetely', 'Gestão de Pessoas — RH completo CLT e PJ', 'users', '#1A4A3A', true, 1, '/dashboard'),
  ('ti', 'TI Fetely', 'Gestão de TI — Ativos, acessos e infraestrutura', 'monitor', '#2563EB', true, 2, '/ti')
ON CONFLICT (slug) DO NOTHING;

-- Dar acesso ao People Fetely para todos os usuários existentes (migração)
INSERT INTO public.sncf_user_systems (user_id, sistema_id, role_no_sistema, ativo)
SELECT au.id, s.id, 'usuario', true
FROM auth.users au
CROSS JOIN public.sncf_sistemas s
WHERE s.slug = 'people'
ON CONFLICT (user_id, sistema_id) DO NOTHING;