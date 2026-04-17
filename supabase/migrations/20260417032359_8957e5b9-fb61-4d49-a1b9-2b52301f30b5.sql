-- Adicionar coordenador no checklist
ALTER TABLE public.onboarding_checklists
ADD COLUMN IF NOT EXISTS coordenador_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS coordenador_nome TEXT;

-- Preencher coordenador com criado_por do convite (migração de dados existentes)
UPDATE public.onboarding_checklists oc
SET coordenador_user_id = cc.criado_por,
    coordenador_nome = p.full_name
FROM public.convites_cadastro cc
JOIN public.profiles p ON p.user_id = cc.criado_por
WHERE oc.convite_id = cc.id
  AND oc.coordenador_user_id IS NULL;