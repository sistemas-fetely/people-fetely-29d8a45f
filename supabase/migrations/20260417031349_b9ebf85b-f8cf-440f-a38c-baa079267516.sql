INSERT INTO public.sncf_sistemas (slug, nome, descricao, icone, cor, ativo, ordem, rota_base) VALUES
  ('mercos', 'Mercos', 'Gestão comercial — Pedidos, representantes e catálogo', 'shopping-cart', '#FF6B00', true, 4, 'https://app.mercos.com/login/'),
  ('shopify', 'Shopify', 'E-commerce — Loja virtual e gestão de vendas online', 'store', '#96BF48', true, 5, 'https://accounts.shopify.com/lookup')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sncf_user_systems (user_id, sistema_id, role_no_sistema, ativo)
SELECT au.id, s.id, 'usuario', true
FROM auth.users au
CROSS JOIN public.sncf_sistemas s
WHERE s.slug IN ('mercos', 'shopify')
ON CONFLICT (user_id, sistema_id) DO NOTHING;