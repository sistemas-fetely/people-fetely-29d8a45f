INSERT INTO public.sncf_sistemas (slug, nome, descricao, icone, cor, ativo, ordem, rota_base) VALUES
  ('bling', 'Bling ERP', 'ERP — Gestão comercial, estoque e financeiro', 'package', '#7CB342', true, 3, 'https://www.bling.com.br/login')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sncf_user_systems (user_id, sistema_id, role_no_sistema, ativo)
SELECT au.id, s.id, 'usuario', true
FROM auth.users au
CROSS JOIN public.sncf_sistemas s
WHERE s.slug = 'bling'
ON CONFLICT (user_id, sistema_id) DO NOTHING;