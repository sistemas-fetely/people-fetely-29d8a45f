-- V3-B: Infraestrutura completa Área/Departamento

-- 1.1 Criar 3 perfis de área novos
INSERT INTO public.perfis (codigo, nome, tipo, area, descricao, is_sistema) VALUES
  ('marketing', 'Marketing', 'area', 'marketing', 'Marketing, branding e comunicação', true),
  ('comercial', 'Comercial', 'area', 'comercial', 'Comercial B2B, B2C e Corporativo', true),
  ('produtos',  'Produtos',  'area', 'produtos',  'Design e desenvolvimento de produto', true)
ON CONFLICT (codigo) DO NOTHING;

-- 1.2 Amarrar pacotes básicos
WITH pf AS (SELECT id, codigo FROM public.perfis),
     pk AS (SELECT id, codigo FROM public.permission_packs)
INSERT INTO public.perfil_packs (perfil_id, pack_id) VALUES
  ((SELECT id FROM pf WHERE codigo='marketing'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='marketing'), (SELECT id FROM pk WHERE codigo='pessoas_leitura')),
  ((SELECT id FROM pf WHERE codigo='comercial'), (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='comercial'), (SELECT id FROM pk WHERE codigo='pessoas_leitura')),
  ((SELECT id FROM pf WHERE codigo='produtos'),  (SELECT id FROM pk WHERE codigo='basico_autogestao')),
  ((SELECT id FROM pf WHERE codigo='produtos'),  (SELECT id FROM pk WHERE codigo='pessoas_leitura'))
ON CONFLICT DO NOTHING;

-- 1.3 Coluna perfil_area_codigo em parametros
ALTER TABLE public.parametros
  ADD COLUMN IF NOT EXISTS perfil_area_codigo TEXT;

CREATE INDEX IF NOT EXISTS idx_parametros_perfil_area
  ON public.parametros (perfil_area_codigo)
  WHERE perfil_area_codigo IS NOT NULL;

-- 1.4 Mapeamento departamento -> perfil de área (somente os que têm pai_valor da V3-A)
UPDATE public.parametros SET perfil_area_codigo = 'financeiro'     WHERE categoria='departamento' AND valor='financeiro_controladoria';
UPDATE public.parametros SET perfil_area_codigo = 'rh'             WHERE categoria='departamento' AND valor='rh_dp';
UPDATE public.parametros SET perfil_area_codigo = 'ti'             WHERE categoria='departamento' AND valor='ti' AND pai_valor='administrativo';
UPDATE public.parametros SET perfil_area_codigo = 'administrativo' WHERE categoria='departamento' AND valor='sales_operation';
UPDATE public.parametros SET perfil_area_codigo = 'marketing'      WHERE categoria='departamento' AND valor='branding';
UPDATE public.parametros SET perfil_area_codigo = 'marketing'      WHERE categoria='departamento' AND valor='institucional';
UPDATE public.parametros SET perfil_area_codigo = 'marketing'      WHERE categoria='departamento' AND valor='merchandising';
UPDATE public.parametros SET perfil_area_codigo = 'produtos'       WHERE categoria='departamento' AND valor='design' AND pai_valor='produtos';
UPDATE public.parametros SET perfil_area_codigo = 'produtos'       WHERE categoria='departamento' AND valor='desenvolvimento';
UPDATE public.parametros SET perfil_area_codigo = 'comercial'      WHERE categoria='departamento' AND valor='b2b';
UPDATE public.parametros SET perfil_area_codigo = 'comercial'      WHERE categoria='departamento' AND valor='b2c';
UPDATE public.parametros SET perfil_area_codigo = 'comercial'      WHERE categoria='departamento' AND valor='corporativo';
UPDATE public.parametros SET perfil_area_codigo = 'operacional'    WHERE categoria='departamento' AND valor='logistica' AND pai_valor='operacao';
UPDATE public.parametros SET perfil_area_codigo = 'operacional'    WHERE categoria='departamento' AND valor='fabrica';

-- 1.5 FKs nullable nas 5 tabelas
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES public.parametros(id);

ALTER TABLE public.colaboradores_clt
  ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES public.parametros(id);

ALTER TABLE public.contratos_pj
  ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES public.parametros(id);

ALTER TABLE public.cargos
  ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES public.parametros(id);

ALTER TABLE public.colaborador_departamentos
  ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES public.parametros(id);

CREATE INDEX IF NOT EXISTS idx_profiles_departamento ON public.profiles(departamento_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_clt_departamento ON public.colaboradores_clt(departamento_id);
CREATE INDEX IF NOT EXISTS idx_contratos_pj_departamento ON public.contratos_pj(departamento_id);
CREATE INDEX IF NOT EXISTS idx_cargos_departamento ON public.cargos(departamento_id);
CREATE INDEX IF NOT EXISTS idx_colaborador_departamentos_departamento ON public.colaborador_departamentos(departamento_id);

-- 1.6 Função auxiliar
CREATE OR REPLACE FUNCTION public.perfil_area_do_departamento(_departamento_id UUID)
RETURNS TABLE (perfil_codigo TEXT, perfil_nome TEXT, area_label TEXT, departamento_label TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    pf.codigo,
    pf.nome,
    a.label,
    d.label
  FROM public.parametros d
  LEFT JOIN public.parametros a ON a.categoria = 'area_negocio' AND a.valor = d.pai_valor
  LEFT JOIN public.perfis pf ON pf.codigo = d.perfil_area_codigo AND pf.tipo = 'area'
  WHERE d.id = _departamento_id AND d.categoria = 'departamento';
$$;

COMMENT ON FUNCTION public.perfil_area_do_departamento IS
  'Dado um departamento_id, retorna o perfil de área que deve ser atribuído automaticamente à pessoa alocada neste departamento. Base da automação do cadastro de usuários v3.';