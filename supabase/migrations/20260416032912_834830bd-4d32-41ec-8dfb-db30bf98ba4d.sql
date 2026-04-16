ALTER TABLE public.convites_cadastro
ADD COLUMN IF NOT EXISTS dados_contratacao JSONB DEFAULT '{}';

COMMENT ON COLUMN public.convites_cadastro.dados_contratacao IS 'Dados profissionais preenchidos pelo RH na contratação: tipo_contrato, jornada_semanal, horario_trabalho, local_trabalho';