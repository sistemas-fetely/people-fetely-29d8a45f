-- 1. Adicionar coluna pai_valor para hierarquia entre parâmetros da mesma tabela
ALTER TABLE public.parametros
ADD COLUMN IF NOT EXISTS pai_valor TEXT;

-- 2. Índice composto para consulta rápida (categoria, pai_valor)
CREATE INDEX IF NOT EXISTS idx_parametros_categoria_pai
  ON public.parametros (categoria, pai_valor);

-- 3. Seed das 5 áreas de negócio
INSERT INTO public.parametros (categoria, valor, label, ordem, ativo, is_clevel)
VALUES
  ('area_negocio', 'administrativo', 'Administrativo', 1, true, false),
  ('area_negocio', 'marketing',      'Marketing',      2, true, false),
  ('area_negocio', 'produtos',       'Produtos',       3, true, false),
  ('area_negocio', 'comercial',      'Comercial',      4, true, false),
  ('area_negocio', 'operacao',       'Operação',       5, true, false)
ON CONFLICT (categoria, valor) DO NOTHING;

-- 4. Seed dos 13 departamentos com pai_valor apontando para a área
INSERT INTO public.parametros (categoria, valor, label, pai_valor, ordem, ativo, is_clevel)
VALUES
  ('departamento', 'financeiro_controladoria', 'Financeiro/Controladoria', 'administrativo', 1, true, false),
  ('departamento', 'rh_dp',                    'RH-DP',                    'administrativo', 2, true, false),
  ('departamento', 'ti',                       'TI',                       'administrativo', 3, true, false),
  ('departamento', 'sales_operation',          'Sales Operation',          'administrativo', 4, true, false),
  ('departamento', 'branding',                 'Branding',                 'marketing',      1, true, false),
  ('departamento', 'institucional',            'Institucional',            'marketing',      2, true, false),
  ('departamento', 'merchandising',            'Merchandising',            'marketing',      3, true, false),
  ('departamento', 'design',                   'Design',                   'produtos',       1, true, false),
  ('departamento', 'desenvolvimento',          'Desenvolvimento',          'produtos',       2, true, false),
  ('departamento', 'b2b',                      'B2B',                      'comercial',      1, true, false),
  ('departamento', 'b2c',                      'B2C',                      'comercial',      2, true, false),
  ('departamento', 'corporativo',              'Corporativo',              'comercial',      3, true, false),
  ('departamento', 'logistica',                'Logística',                'operacao',       1, true, false),
  ('departamento', 'fabrica',                  'Fábrica',                  'operacao',       2, true, false)
ON CONFLICT (categoria, valor) DO NOTHING;