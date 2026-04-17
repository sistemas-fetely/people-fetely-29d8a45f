
UPDATE public.sncf_tarefas SET area_destino = 'TI', sistema_origem = 'ti'
WHERE tipo_processo = 'onboarding' AND area_destino IS NULL
AND (titulo ILIKE '%notebook%' OR titulo ILIKE '%monitor%' OR titulo ILIKE '%teclado%' OR titulo ILIKE '%mouse%' OR titulo ILIKE '%headset%' OR titulo ILIKE '%celular corporativo%' OR titulo ILIKE '%acessos nos sistemas%' OR titulo ILIKE '%e-mail corporativo%' OR titulo ILIKE '%equipamento%');

UPDATE public.sncf_tarefas SET area_destino = 'RH', sistema_origem = 'people'
WHERE tipo_processo = 'onboarding' AND area_destino IS NULL
AND (titulo ILIKE '%integração%' OR titulo ILIKE '%contrato%' OR titulo ILIKE '%eSocial%' OR titulo ILIKE '%documentos%' OR titulo ILIKE '%assinar%' OR titulo ILIKE '%benefícios%' OR titulo ILIKE '%registro%');

UPDATE public.sncf_tarefas SET area_destino = 'Gestão', sistema_origem = 'people'
WHERE tipo_processo = 'onboarding' AND area_destino IS NULL
AND (titulo ILIKE '%apresentar%' OR titulo ILIKE '%reunião%' OR titulo ILIKE '%feedback%' OR titulo ILIKE '%agendar%');

UPDATE public.sncf_tarefas SET area_destino = 'Colaborador', sistema_origem = 'people'
WHERE tipo_processo = 'onboarding' AND area_destino IS NULL
AND (titulo ILIKE '%recebimento%' OR titulo ILIKE '%confirmar%' OR titulo ILIKE '%preencher%');

UPDATE public.sncf_tarefas SET area_destino = 'Geral', sistema_origem = COALESCE(sistema_origem, 'people')
WHERE tipo_processo = 'onboarding' AND area_destino IS NULL;
