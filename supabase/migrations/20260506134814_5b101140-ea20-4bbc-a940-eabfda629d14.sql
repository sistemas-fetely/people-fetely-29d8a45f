-- ETAPA 0: DESVINCULAR DEPENDÊNCIAS
UPDATE public.nfs_stage SET conta_pagar_id = NULL, categoria_id = NULL;
UPDATE public.compromissos_recorrentes SET categoria_id = NULL;

-- ETAPA 1: RESET
DELETE FROM public.movimentacoes_bancarias;
DELETE FROM public.pasta_contrato_parcelas;
DELETE FROM public.pasta_contratos;
DELETE FROM public.contas_pagar_receber;
DELETE FROM public.regras_categorizacao;
UPDATE public.parceiros_comerciais SET categoria_padrao_id = NULL;
UPDATE public.plano_contas SET parent_id = NULL;
DELETE FROM public.plano_contas;

-- ETAPA 2: TEXT -> FK (idempotente)
ALTER TABLE public.contas_pagar_receber
  ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES public.centros_custo(id) ON DELETE SET NULL;
ALTER TABLE public.contas_pagar_receber DROP COLUMN IF EXISTS centro_custo;
CREATE INDEX IF NOT EXISTS idx_cpr_centro_custo ON public.contas_pagar_receber(centro_custo_id);

ALTER TABLE public.plano_contas
  ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES public.centros_custo(id) ON DELETE SET NULL;
ALTER TABLE public.plano_contas DROP COLUMN IF EXISTS centro_custo;
CREATE INDEX IF NOT EXISTS idx_plano_contas_centro_custo ON public.plano_contas(centro_custo_id);

ALTER TABLE public.regras_categorizacao
  ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES public.centros_custo(id) ON DELETE SET NULL;
ALTER TABLE public.regras_categorizacao DROP COLUMN IF EXISTS centro_custo;
CREATE INDEX IF NOT EXISTS idx_regras_centro_custo ON public.regras_categorizacao(centro_custo_id);

ALTER TABLE public.movimentacoes_bancarias
  ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES public.centros_custo(id) ON DELETE SET NULL;
ALTER TABLE public.movimentacoes_bancarias DROP COLUMN IF EXISTS centro_custo;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_centro_custo ON public.movimentacoes_bancarias(centro_custo_id);

-- ETAPA 3: NOVOS CENTROS DE CUSTO
INSERT INTO public.centros_custo (codigo, nome) VALUES
  ('showroom',   'Show Room São Paulo'),
  ('lancamento', 'Operação de Lançamento')
ON CONFLICT (codigo) DO NOTHING;

-- ETAPA 4: PLANO DE CONTAS v2
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, origem) VALUES
  ('01', 'Receitas Operacionais',     1, 'receita',      'operacional',     'manual'),
  ('02', 'Custos Diretos (CMV)',      1, 'despesa',      'operacional',     'manual'),
  ('03', 'Despesas com Pessoal',      1, 'despesa',      'operacional',     'manual'),
  ('04', 'Despesas Operacionais',     1, 'despesa',      'operacional',     'manual'),
  ('05', 'Despesas Financeiras',      1, 'despesa',      'financeira',      'manual'),
  ('06', 'Tributos sobre Resultado',  1, 'imposto',      'operacional',     'manual'),
  ('07', 'Investimentos (CAPEX)',     1, 'investimento', 'operacional',     'manual'),
  ('08', 'Outras Receitas/Despesas',  1, 'despesa',      'nao_operacional', 'manual');

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id, centro_custo_id, origem) VALUES
  ('01.01', 'Receita Bruta - B2B (Mercus/Atacado)', 2, 'receita', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='01'),
    (SELECT id FROM public.centros_custo WHERE codigo='comercial'), 'manual'),
  ('01.02', 'Receita Bruta - B2C (Shopify/Varejo)', 2, 'receita', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='01'),
    (SELECT id FROM public.centros_custo WHERE codigo='comercial'), 'manual'),
  ('01.03', 'Devoluções e Estornos (-)', 2, 'receita', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='01'),
    (SELECT id FROM public.centros_custo WHERE codigo='comercial'), 'manual'),
  ('01.04', 'Impostos sobre Vendas (-)', 2, 'imposto', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='01'),
    (SELECT id FROM public.centros_custo WHERE codigo='financeiro'), 'manual'),
  ('02.01', 'Mercadoria para Revenda', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='02'),
    (SELECT id FROM public.centros_custo WHERE codigo='comercial'), 'manual'),
  ('02.02', 'Custos de Importação', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='02'),
    (SELECT id FROM public.centros_custo WHERE codigo='comercial'), 'manual'),
  ('02.03', 'Frete sobre Vendas', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='02'),
    (SELECT id FROM public.centros_custo WHERE codigo='comercial'), 'manual'),
  ('02.04', 'Comissões sobre Vendas', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='02'),
    (SELECT id FROM public.centros_custo WHERE codigo='comercial'), 'manual'),
  ('03.01', 'Salários CLT e Encargos', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='03'),
    (SELECT id FROM public.centros_custo WHERE codigo='rh'), 'manual'),
  ('03.02', 'Pró-Labore e Distribuição', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='03'),
    (SELECT id FROM public.centros_custo WHERE codigo='rh'), 'manual'),
  ('03.03', 'Contratos PJ', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='03'),
    (SELECT id FROM public.centros_custo WHERE codigo='rh'), 'manual'),
  ('03.04', 'Benefícios', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='03'),
    (SELECT id FROM public.centros_custo WHERE codigo='rh'), 'manual'),
  ('04.01', 'Marketing e Publicidade', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='04'),
    (SELECT id FROM public.centros_custo WHERE codigo='comercial'), 'manual'),
  ('04.02', 'Tecnologia e Sistemas', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='04'),
    (SELECT id FROM public.centros_custo WHERE codigo='ti'), 'manual'),
  ('04.03', 'Ocupação (aluguel/condomínio/utilities)', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='04'),
    (SELECT id FROM public.centros_custo WHERE codigo='administrativo'), 'manual'),
  ('04.04', 'Materiais e Insumos', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='04'),
    (SELECT id FROM public.centros_custo WHERE codigo='administrativo'), 'manual'),
  ('04.05', 'Serviços de Terceiros', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='04'),
    (SELECT id FROM public.centros_custo WHERE codigo='administrativo'), 'manual'),
  ('04.06', 'Administrativas Diversas', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='04'),
    (SELECT id FROM public.centros_custo WHERE codigo='administrativo'), 'manual'),
  ('04.07', 'Viagens e Representação', 2, 'despesa', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='04'),
    (SELECT id FROM public.centros_custo WHERE codigo='administrativo'), 'manual'),
  ('05.01', 'Tarifas Bancárias', 2, 'despesa', 'financeira',
    (SELECT id FROM public.plano_contas WHERE codigo='05'),
    (SELECT id FROM public.centros_custo WHERE codigo='financeiro'), 'manual'),
  ('05.02', 'Juros e Multas', 2, 'despesa', 'financeira',
    (SELECT id FROM public.plano_contas WHERE codigo='05'),
    (SELECT id FROM public.centros_custo WHERE codigo='financeiro'), 'manual'),
  ('05.03', 'IOF e Câmbio', 2, 'despesa', 'financeira',
    (SELECT id FROM public.plano_contas WHERE codigo='05'),
    (SELECT id FROM public.centros_custo WHERE codigo='financeiro'), 'manual'),
  ('06.01', 'IRPJ', 2, 'imposto', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='06'),
    (SELECT id FROM public.centros_custo WHERE codigo='financeiro'), 'manual'),
  ('06.02', 'CSLL', 2, 'imposto', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='06'),
    (SELECT id FROM public.centros_custo WHERE codigo='financeiro'), 'manual'),
  ('07.01', 'Mobiliário e Decoração', 2, 'investimento', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='07'),
    (SELECT id FROM public.centros_custo WHERE codigo='showroom'), 'manual'),
  ('07.02', 'Equipamentos de Informática', 2, 'investimento', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='07'),
    (SELECT id FROM public.centros_custo WHERE codigo='ti'), 'manual'),
  ('07.03', 'Máquinas e Equipamentos (Fábrica)', 2, 'investimento', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='07'),
    (SELECT id FROM public.centros_custo WHERE codigo='fabrica'), 'manual'),
  ('07.04', 'Benfeitorias em Imóveis', 2, 'investimento', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='07'),
    (SELECT id FROM public.centros_custo WHERE codigo='showroom'), 'manual'),
  ('07.05', 'Veículos', 2, 'investimento', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='07'),
    (SELECT id FROM public.centros_custo WHERE codigo='geral'), 'manual'),
  ('07.06', 'Software (intangível)', 2, 'investimento', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='07'),
    (SELECT id FROM public.centros_custo WHERE codigo='ti'), 'manual'),
  ('07.07', 'Marca e Propriedade Intelectual', 2, 'investimento', 'operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='07'),
    (SELECT id FROM public.centros_custo WHERE codigo='comercial'), 'manual'),
  ('08.01', 'Receitas Financeiras (rendimentos)', 2, 'receita', 'financeira',
    (SELECT id FROM public.plano_contas WHERE codigo='08'),
    (SELECT id FROM public.centros_custo WHERE codigo='financeiro'), 'manual'),
  ('08.02', 'Outras Receitas Não-Operacionais', 2, 'receita', 'nao_operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='08'),
    (SELECT id FROM public.centros_custo WHERE codigo='geral'), 'manual'),
  ('08.03', 'Outras Despesas Não-Operacionais', 2, 'despesa', 'nao_operacional',
    (SELECT id FROM public.plano_contas WHERE codigo='08'),
    (SELECT id FROM public.centros_custo WHERE codigo='geral'), 'manual');

COMMENT ON COLUMN public.contas_pagar_receber.centro_custo_id IS
  'FK pra centros_custo. Migrado de TEXT em 06/05/2026 (Fase 2.5) — Doutrina #14.';
COMMENT ON COLUMN public.plano_contas.centro_custo_id IS
  'FK pra centros_custo. Centro de custo padrão sugerido para esta conta.';
COMMENT ON COLUMN public.regras_categorizacao.centro_custo_id IS
  'FK pra centros_custo. Aplicado pela IA/regra ao classificar.';
COMMENT ON COLUMN public.movimentacoes_bancarias.centro_custo_id IS
  'FK pra centros_custo. Para análise gerencial.';