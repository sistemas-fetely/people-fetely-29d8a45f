
-- =====================================================
-- 1. PLANO DE CONTAS (hierárquico)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plano_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  parent_id UUID REFERENCES public.plano_contas(id),
  nivel INT NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'investimento', 'imposto')),
  natureza TEXT CHECK (natureza IN ('operacional', 'financeira', 'nao_operacional')),
  centro_custo TEXT,
  ativo BOOLEAN DEFAULT true,
  origem TEXT DEFAULT 'bling' CHECK (origem IN ('bling', 'manual')),
  bling_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plano_contas_codigo ON public.plano_contas(codigo);
CREATE INDEX IF NOT EXISTS idx_plano_contas_parent ON public.plano_contas(parent_id);
CREATE INDEX IF NOT EXISTS idx_plano_contas_tipo ON public.plano_contas(tipo);

ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plano_contas"
  ON public.plano_contas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can insert plano_contas"
  ON public.plano_contas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin can update plano_contas"
  ON public.plano_contas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin can delete plano_contas"
  ON public.plano_contas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 2. LANÇAMENTOS FINANCEIROS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.plano_contas(id),
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  tipo_lancamento TEXT NOT NULL CHECK (tipo_lancamento IN ('credito', 'debito')),
  data_competencia DATE NOT NULL,
  data_pagamento DATE,
  centro_custo TEXT,
  canal TEXT,
  unidade TEXT,
  fornecedor TEXT,
  origem TEXT DEFAULT 'csv' CHECK (origem IN ('csv', 'api_bling', 'manual')),
  bling_id TEXT,
  arquivo_importacao TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_conta ON public.lancamentos_financeiros(conta_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_competencia ON public.lancamentos_financeiros(data_competencia);
CREATE INDEX IF NOT EXISTS idx_lancamentos_centro_custo ON public.lancamentos_financeiros(centro_custo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_canal ON public.lancamentos_financeiros(canal);
CREATE INDEX IF NOT EXISTS idx_lancamentos_unidade ON public.lancamentos_financeiros(unidade);

ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lancamentos"
  ON public.lancamentos_financeiros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can insert lancamentos"
  ON public.lancamentos_financeiros FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin can update lancamentos"
  ON public.lancamentos_financeiros FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin can delete lancamentos"
  ON public.lancamentos_financeiros FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 3. CONTAS A PAGAR / RECEBER
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contas_pagar_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'atrasado', 'cancelado')),
  conta_id UUID REFERENCES public.plano_contas(id),
  fornecedor_cliente TEXT,
  centro_custo TEXT,
  unidade TEXT,
  canal TEXT,
  origem TEXT DEFAULT 'csv' CHECK (origem IN ('csv', 'api_bling', 'manual')),
  bling_id TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpr_tipo ON public.contas_pagar_receber(tipo);
CREATE INDEX IF NOT EXISTS idx_cpr_status ON public.contas_pagar_receber(status);
CREATE INDEX IF NOT EXISTS idx_cpr_vencimento ON public.contas_pagar_receber(data_vencimento);

ALTER TABLE public.contas_pagar_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view CPR"
  ON public.contas_pagar_receber FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can insert CPR"
  ON public.contas_pagar_receber FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin can update CPR"
  ON public.contas_pagar_receber FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin can delete CPR"
  ON public.contas_pagar_receber FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 4. HISTÓRICO DE IMPORTAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.importacoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('plano_contas', 'lancamentos', 'contas_pagar', 'contas_receber')),
  arquivo_nome TEXT NOT NULL,
  registros_importados INT DEFAULT 0,
  registros_erro INT DEFAULT 0,
  status TEXT DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
  detalhes_erro TEXT,
  importado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.importacoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can view importacoes"
  ON public.importacoes_financeiras FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin can insert importacoes"
  ON public.importacoes_financeiras FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin can update importacoes"
  ON public.importacoes_financeiras FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin can delete importacoes"
  ON public.importacoes_financeiras FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 5. DIMENSÕES ANALÍTICAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.canais_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canais_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All can view centros" ON public.centros_custo FOR SELECT TO authenticated USING (true);
CREATE POLICY "All can view canais" ON public.canais_venda FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin insert centros" ON public.centros_custo FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin update centros" ON public.centros_custo FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin delete centros" ON public.centros_custo FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin insert canais" ON public.canais_venda FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin update canais" ON public.canais_venda FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin delete canais" ON public.canais_venda FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 6. SEED — DIMENSÕES
-- =====================================================
INSERT INTO public.centros_custo (codigo, nome) VALUES
  ('comercial', 'Comercial e Marketing'),
  ('administrativo', 'Administrativo'),
  ('fabrica', 'Fábrica'),
  ('ti', 'Tecnologia da Informação'),
  ('geral', 'Despesas Gerais'),
  ('financeiro', 'Financeiro'),
  ('rh', 'Recursos Humanos')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.canais_venda (codigo, nome) VALUES
  ('b2b', 'B2B (Atacado)'),
  ('b2c', 'B2C (Varejo)'),
  ('parceiros', 'Parceiros e Influenciadores'),
  ('marketplace', 'Marketplace')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- 7-10. SEED PLANO DE CONTAS
-- =====================================================
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza) VALUES
  ('01', 'Receitas Operacionais', 1, 'receita', 'operacional'),
  ('02', 'Aporte de Capital', 1, 'receita', 'nao_operacional'),
  ('03', 'Restituição de Impostos', 1, 'receita', 'nao_operacional'),
  ('04', 'Outras Receitas', 1, 'receita', 'financeira'),
  ('05', 'Despesas Indiretas', 1, 'despesa', 'operacional'),
  ('06', 'Despesas Diretas', 1, 'despesa', 'operacional'),
  ('07', 'Investimentos e Amortizações', 1, 'investimento', 'nao_operacional'),
  ('08', 'Taxas, Tarifas e Impostos', 1, 'imposto', 'operacional')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id, centro_custo) VALUES
  ('01.01', 'Receita Bruta de Vendas', 2, 'receita', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='01'), 'comercial'),
  ('02.01', 'Investimento de Sócio', 2, 'receita', 'nao_operacional', (SELECT id FROM public.plano_contas WHERE codigo='02'), NULL),
  ('02.02', 'Empréstimo Recebido', 2, 'receita', 'nao_operacional', (SELECT id FROM public.plano_contas WHERE codigo='02'), NULL),
  ('03.01', 'Impostos sobre Compras', 2, 'receita', 'nao_operacional', (SELECT id FROM public.plano_contas WHERE codigo='03'), NULL),
  ('04.01', 'Venda de Ativos', 2, 'receita', 'financeira', (SELECT id FROM public.plano_contas WHERE codigo='04'), NULL),
  ('04.02', 'Rendimentos', 2, 'receita', 'financeira', (SELECT id FROM public.plano_contas WHERE codigo='04'), 'financeiro'),
  ('04.03', 'Devoluções e Estornos', 2, 'receita', 'financeira', (SELECT id FROM public.plano_contas WHERE codigo='04'), NULL),
  ('04.04', 'Juros e Multas', 2, 'receita', 'financeira', (SELECT id FROM public.plano_contas WHERE codigo='04'), 'financeiro'),
  ('05.01', 'Despesas Comerciais e MKT', 2, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05'), 'comercial'),
  ('05.02', 'Despesas Administrativas', 2, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05'), 'administrativo'),
  ('05.03', 'Despesas Fábrica', 2, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05'), 'fabrica'),
  ('05.04', 'Despesas Gerais', 2, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05'), 'geral'),
  ('05.05', 'Despesas Bancárias', 2, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05'), 'financeiro'),
  ('06.01', 'Insumos e Serviços', 2, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='06'), 'fabrica'),
  ('06.02', 'Taxas e Impostos', 2, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='06'), NULL),
  ('07.01', 'Investimentos Fábrica', 2, 'investimento', 'nao_operacional', (SELECT id FROM public.plano_contas WHERE codigo='07'), NULL),
  ('07.02', 'Investimentos Gerais', 2, 'investimento', 'nao_operacional', (SELECT id FROM public.plano_contas WHERE codigo='07'), NULL),
  ('08.01', 'Impostos', 2, 'imposto', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='08'), NULL),
  ('08.02', 'Taxas e Tarifas', 2, 'imposto', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='08'), NULL),
  ('08.03', 'Municipal', 2, 'imposto', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='08'), NULL)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id, centro_custo) VALUES
  ('01.01.01', 'Receita B2B', 3, 'receita', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='01.01'), 'comercial'),
  ('01.01.02', 'Receita B2C', 3, 'receita', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='01.01'), 'comercial'),
  ('01.01.03', 'Receita Parceiros e Influenciadores', 3, 'receita', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='01.01'), 'comercial'),
  ('05.01.01', 'Comissões', 3, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01'), 'comercial'),
  ('05.01.02', 'Fretes e Seguros', 3, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01'), 'comercial'),
  ('05.01.03', 'Mão de Obra - Comercial', 3, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01'), 'comercial'),
  ('05.01.04', 'Insumos e Serviços', 3, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01'), 'comercial'),
  ('05.01.05', 'Feiras e Eventos', 3, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01'), 'comercial'),
  ('05.01.06', 'Campanhas de MKT', 3, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01'), 'comercial'),
  ('06.01.01', 'Produto Acabado', 3, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='06.01'), 'fabrica'),
  ('06.01.02', 'Matéria Prima', 3, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='06.01'), 'fabrica')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id, centro_custo) VALUES
  ('05.01.01.01', 'Comissões Representantes', 4, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01.01'), 'comercial'),
  ('05.01.01.02', 'Comissões Equipe Fetely B2B', 4, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01.01'), 'comercial'),
  ('05.01.01.03', 'Comissões Equipe Fetely B2C', 4, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01.01'), 'comercial'),
  ('05.01.01.04', 'Comissões Influenciadores', 4, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01.01'), 'comercial'),
  ('05.01.01.05', 'Comissões Parceiros', 4, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01.01'), 'comercial'),
  ('05.01.03.01', 'Salários', 4, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01.03'), 'comercial'),
  ('05.01.03.02', 'Contratos PJ', 4, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='05.01.03'), 'comercial'),
  ('06.01.01.01', 'Produto Acabado Nacional', 4, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='06.01.01'), 'fabrica'),
  ('06.01.01.02', 'Matéria Prima Importado', 4, 'despesa', 'operacional', (SELECT id FROM public.plano_contas WHERE codigo='06.01.01'), 'fabrica')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- 11. UPDATE TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS trg_plano_contas_updated_at ON public.plano_contas;
CREATE TRIGGER trg_plano_contas_updated_at
BEFORE UPDATE ON public.plano_contas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lancamentos_updated_at ON public.lancamentos_financeiros;
CREATE TRIGGER trg_lancamentos_updated_at
BEFORE UPDATE ON public.lancamentos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cpr_updated_at ON public.contas_pagar_receber;
CREATE TRIGGER trg_cpr_updated_at
BEFORE UPDATE ON public.contas_pagar_receber
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 12. BOARD FINANCEIRO (sncf_documentacao)
-- =====================================================
INSERT INTO public.sncf_documentacao (
  titulo, slug, categoria, tipo, conteudo, ativo, sync_fala_fetely
) VALUES (
  'Board Financeiro Fetely',
  'financeiro-fetely-board',
  'operacional',
  'outro',
  E'# Board Financeiro Fetely\n\n## Consultores\n\n**Dra. Patrícia Azevedo** — Controladoria & Gestão\nEx-controller de importadora de médio porte. DRE, centro de custos, margem por canal. Transforma dados contábeis em decisões de negócio.\n\n**Carlos Eduardo Lima** — Tesouraria & Fluxo de Caixa\nOperações financeiras com foco em importação. Gestão de caixa, câmbio, prazos, conciliação bancária. Liquidez e previsibilidade.\n\n**Dra. Ana Cláudia Ferreira** — Tributário (cross Board Jurídico)\nRegime tributário, drawback, ICMS/IPI/PIS/COFINS. Compliance fiscal integrado ao financeiro.\n\n## Diretrizes\n- O Bling é a verdade contábil. O Uauuu é a camada analítica.\n- Plano de contas espelhado do Bling, nunca editado manualmente no Uauuu.\n- Dimensões analíticas (centro de custo, canal, unidade) são a camada de inteligência do Uauuu.\n- DRE gerado automaticamente dos lançamentos importados.\n- Fluxo de caixa projetado = prioridade #1 do financeiro.',
  true,
  true
)
ON CONFLICT (slug) DO NOTHING;
