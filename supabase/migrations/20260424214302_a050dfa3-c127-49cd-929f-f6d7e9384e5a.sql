
-- ============================================================
-- PARTE 1 — LIMPAR DADOS FINANCEIROS
-- ============================================================
DELETE FROM public.lancamentos_financeiros;
DROP TABLE IF EXISTS public.contas_pagar_itens CASCADE;
DELETE FROM public.contas_pagar_receber;
DROP TABLE IF EXISTS public.regras_categorizacao CASCADE;
DELETE FROM public.plano_contas;
DROP TABLE IF EXISTS public.fornecedores CASCADE;
DROP TABLE IF EXISTS public.formas_pagamento CASCADE;

-- ============================================================
-- PARTE 2.1 — FORNECEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT UNIQUE,
  cpf TEXT,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  telefone TEXT,
  email TEXT,
  tipo TEXT DEFAULT 'pj' CHECK (tipo IN ('pj', 'pf')),
  categoria_padrao_id UUID REFERENCES public.plano_contas(id),
  centro_custo_padrao TEXT,
  tags TEXT[],
  ativo BOOLEAN DEFAULT true,
  observacao TEXT,
  origem TEXT DEFAULT 'manual' CHECK (origem IN ('manual', 'nf_import', 'qive', 'nf_pj_interno', 'bling')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_fornecedores_cnpj ON public.fornecedores(cnpj);
CREATE INDEX idx_fornecedores_razao ON public.fornecedores(razao_social);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage fornecedores" ON public.fornecedores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- ============================================================
-- PARTE 2.2 — FORMAS DE PAGAMENTO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.formas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('a_vista', 'parcelado', 'recorrente')),
  ativo BOOLEAN DEFAULT true,
  ordem INT DEFAULT 0
);
INSERT INTO public.formas_pagamento (codigo, nome, tipo, ordem) VALUES
  ('pix', 'PIX', 'a_vista', 1),
  ('boleto', 'Boleto Bancário', 'a_vista', 2),
  ('transferencia', 'Transferência Bancária', 'a_vista', 3),
  ('cartao_credito', 'Cartão de Crédito', 'parcelado', 4),
  ('cartao_debito', 'Cartão de Débito', 'a_vista', 5),
  ('dinheiro', 'Dinheiro', 'a_vista', 6),
  ('debito_automatico', 'Débito Automático', 'recorrente', 7),
  ('cheque', 'Cheque', 'a_vista', 8),
  ('sem_pagamento', 'Sem Pagamento (devolução/bonificação)', 'a_vista', 9),
  ('outro', 'Outro', 'a_vista', 99);
ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View formas_pgto" ON public.formas_pagamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage formas_pgto" ON public.formas_pagamento FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- ============================================================
-- PARTE 2.3 — ITENS DA NF
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contas_pagar_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES public.contas_pagar_receber(id) ON DELETE CASCADE,
  codigo_produto TEXT,
  descricao TEXT NOT NULL,
  ncm TEXT,
  cfop TEXT,
  unidade TEXT,
  quantidade DECIMAL(15,4),
  valor_unitario DECIMAL(15,4),
  valor_total DECIMAL(15,2),
  valor_icms DECIMAL(15,2) DEFAULT 0,
  valor_ipi DECIMAL(15,2) DEFAULT 0,
  valor_pis DECIMAL(15,2) DEFAULT 0,
  valor_cofins DECIMAL(15,2) DEFAULT 0,
  conta_plano_id UUID REFERENCES public.plano_contas(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cpr_itens_conta ON public.contas_pagar_itens(conta_id);
CREATE INDEX idx_cpr_itens_ncm ON public.contas_pagar_itens(ncm);
ALTER TABLE public.contas_pagar_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View itens" ON public.contas_pagar_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage itens" ON public.contas_pagar_itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- ============================================================
-- PARTE 2.4 — REGRAS DE CATEGORIZAÇÃO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.regras_categorizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  cnpj_emitente TEXT,
  ncm_prefixo TEXT,
  descricao_contem TEXT,
  conta_plano_id UUID NOT NULL REFERENCES public.plano_contas(id),
  centro_custo TEXT,
  prioridade INT DEFAULT 10,
  ativo BOOLEAN DEFAULT true,
  criado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.regras_categorizacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View regras" ON public.regras_categorizacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage regras" ON public.regras_categorizacao FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- ============================================================
-- PARTE 3 — EVOLUIR CONTAS A PAGAR/RECEBER + PLANO + LANCAMENTOS
-- ============================================================
ALTER TABLE public.plano_contas DROP CONSTRAINT IF EXISTS plano_contas_natureza_check;
ALTER TABLE public.plano_contas ADD CONSTRAINT plano_contas_natureza_check
  CHECK (natureza IN ('operacional', 'financeira', 'nao_operacional', 'deducao'));

ALTER TABLE public.contas_pagar_receber
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES public.fornecedores(id),
  ADD COLUMN IF NOT EXISTS nf_chave_acesso TEXT,
  ADD COLUMN IF NOT EXISTS nf_numero TEXT,
  ADD COLUMN IF NOT EXISTS nf_serie TEXT,
  ADD COLUMN IF NOT EXISTS nf_data_emissao DATE,
  ADD COLUMN IF NOT EXISTS nf_cnpj_emitente TEXT,
  ADD COLUMN IF NOT EXISTS nf_valor_produtos DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS nf_valor_impostos DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS nf_xml_url TEXT,
  ADD COLUMN IF NOT EXISTS nf_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS nf_natureza_operacao TEXT,
  ADD COLUMN IF NOT EXISTS nf_cfop TEXT,
  ADD COLUMN IF NOT EXISTS nf_ncm TEXT,
  ADD COLUMN IF NOT EXISTS forma_pagamento_id UUID REFERENCES public.formas_pagamento(id),
  ADD COLUMN IF NOT EXISTS parcelas INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parcela_atual INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parcela_grupo_id UUID,
  ADD COLUMN IF NOT EXISTS categoria_sugerida_ia BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS categoria_confirmada BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS criado_por UUID,
  ADD COLUMN IF NOT EXISTS aprovado_por UUID,
  ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ;

ALTER TABLE public.contas_pagar_receber DROP CONSTRAINT IF EXISTS contas_pagar_receber_origem_check;
ALTER TABLE public.contas_pagar_receber ADD CONSTRAINT contas_pagar_receber_origem_check
  CHECK (origem IN ('manual', 'csv_qive', 'xml_nfe', 'pdf_nfe', 'nf_pj_interno', 'api_bling', 'csv', 'recorrente'));

ALTER TABLE public.contas_pagar_receber DROP CONSTRAINT IF EXISTS contas_pagar_receber_status_check;
ALTER TABLE public.contas_pagar_receber ADD CONSTRAINT contas_pagar_receber_status_check
  CHECK (status IN ('rascunho', 'aberto', 'aprovado', 'agendado', 'pago', 'atrasado', 'cancelado', 'conciliado'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_cpr_nf_chave ON public.contas_pagar_receber(nf_chave_acesso) WHERE nf_chave_acesso IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpr_fornecedor ON public.contas_pagar_receber(fornecedor_id);

ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS nf_chave_acesso TEXT;
CREATE INDEX IF NOT EXISTS idx_lancamentos_nf_chave ON public.lancamentos_financeiros(nf_chave_acesso) WHERE nf_chave_acesso IS NOT NULL;

-- ============================================================
-- PARTE 4 — PLANO DE CONTAS COMPLETO
-- ============================================================

-- Grupo 01 — Receitas
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza) VALUES
('01', 'Receitas Operacionais', 1, 'receita', 'operacional');

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('01.01', 'Receita Bruta de Vendas', 2, 'receita', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='01'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('01.01.01', 'Receita B2B (Atacado Mercus)', 3, 'receita', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='01.01')),
('01.01.02', 'Receita B2C (Varejo Direto)', 3, 'receita', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='01.01')),
('01.01.03', 'Receita Parceiros e Influenciadores', 3, 'receita', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='01.01')),
('01.01.04', 'Receita Marketplace', 3, 'receita', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='01.01')),
('01.01.05', 'Receita Exportação', 3, 'receita', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='01.01'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('01.02', 'Deduções sobre Vendas', 2, 'despesa', 'deducao', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='01'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('01.02.01', 'ICMS sobre Vendas', 3, 'despesa', 'deducao', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='01.02')),
('01.02.02', 'PIS sobre Vendas (0,65%)', 3, 'despesa', 'deducao', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='01.02')),
('01.02.03', 'COFINS sobre Vendas (3%)', 3, 'despesa', 'deducao', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='01.02')),
('01.02.04', 'ISS sobre Vendas', 3, 'despesa', 'deducao', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='01.02')),
('01.02.05', 'Devoluções de Vendas', 3, 'despesa', 'deducao', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='01.02')),
('01.02.06', 'Descontos Concedidos', 3, 'despesa', 'deducao', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='01.02'));

-- Grupo 02 — Aportes
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza) VALUES
('02', 'Aportes e Empréstimos', 1, 'receita', 'nao_operacional');

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id) VALUES
('02.01', 'Investimento de Sócio', 2, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='02')),
('02.02', 'Empréstimo Recebido', 2, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='02')),
('02.03', 'Financiamento Recebido', 2, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='02'));

-- Grupo 03 — Restituição
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza) VALUES
('03', 'Restituição de Impostos', 1, 'receita', 'nao_operacional');

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id) VALUES
('03.01', 'Impostos sobre Compras', 2, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='03'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id) VALUES
('03.01.01', 'ICMS Restituído', 3, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='03.01')),
('03.01.02', 'PIS Restituído', 3, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='03.01')),
('03.01.03', 'COFINS Restituído', 3, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='03.01')),
('03.01.04', 'Outros Impostos Restituídos', 3, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='03.01'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id) VALUES
('03.02', 'Drawback', 2, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='03'));

-- Grupo 04 — Outras receitas
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza) VALUES
('04', 'Outras Receitas', 1, 'receita', 'financeira');

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id) VALUES
('04.01', 'Venda de Ativos', 2, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='04'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('04.02', 'Rendimentos Financeiros', 2, 'receita', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='04'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('04.02.01', 'Rendimento Aplicações', 3, 'receita', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='04.02')),
('04.02.02', 'Rendimento Conta Corrente', 3, 'receita', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='04.02'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id) VALUES
('04.03', 'Devoluções e Estornos Recebidos', 2, 'receita', 'operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='04')),
('04.04', 'Juros e Multas Recebidos', 2, 'receita', 'financeira',
  (SELECT id FROM public.plano_contas WHERE codigo='04')),
('04.05', 'Variação Cambial Positiva', 2, 'receita', 'financeira',
  (SELECT id FROM public.plano_contas WHERE codigo='04')),
('04.06', 'Receitas Eventuais', 2, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='04'));

-- Grupo 05 — Despesas indiretas
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza) VALUES
('05', 'Despesas Indiretas', 1, 'despesa', 'operacional');

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.01', 'Despesas Comerciais e MKT', 2, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.01.01', 'Comissões', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01')),
('05.01.02', 'Fretes de Venda e Seguros', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01')),
('05.01.03', 'Mão de Obra Comercial', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01')),
('05.01.04', 'Insumos e Serviços Comerciais', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01')),
('05.01.05', 'Feiras e Eventos', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01')),
('05.01.06', 'Campanhas de Marketing', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01')),
('05.01.07', 'Viagens e Acomodações', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01')),
('05.01.08', 'Almoços de Relacionamento', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01')),
('05.01.09', 'Brindes e Presentes', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01')),
('05.01.10', 'Edição de Imagens e Vídeos', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01')),
('05.01.11', 'Associações e Organizações', 3, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.01.01.01', 'Comissões Representantes', 4, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01.01')),
('05.01.01.02', 'Comissões Equipe Fetely B2B', 4, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01.01')),
('05.01.01.03', 'Comissões Equipe Fetely B2C', 4, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01.01')),
('05.01.01.04', 'Comissões Influenciadores', 4, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01.01')),
('05.01.01.05', 'Comissões Parceiros', 4, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01.01'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.01.06.01', 'Campanhas MKT B2B', 4, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01.06')),
('05.01.06.02', 'Campanhas MKT B2C', 4, 'despesa', 'operacional', 'comercial',
  (SELECT id FROM public.plano_contas WHERE codigo='05.01.06'));

-- 05.02
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.02', 'Despesas Administrativas', 2, 'despesa', 'operacional', 'administrativo',
  (SELECT id FROM public.plano_contas WHERE codigo='05'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.02.01', 'Serviços de Contabilidade', 3, 'despesa', 'operacional', 'administrativo',
  (SELECT id FROM public.plano_contas WHERE codigo='05.02')),
('05.02.02', 'Serviços Jurídicos', 3, 'despesa', 'operacional', 'administrativo',
  (SELECT id FROM public.plano_contas WHERE codigo='05.02')),
('05.02.03', 'Seguros Empresariais', 3, 'despesa', 'operacional', 'administrativo',
  (SELECT id FROM public.plano_contas WHERE codigo='05.02')),
('05.02.04', 'Material de Escritório', 3, 'despesa', 'operacional', 'administrativo',
  (SELECT id FROM public.plano_contas WHERE codigo='05.02')),
('05.02.05', 'Copa e Cozinha', 3, 'despesa', 'operacional', 'administrativo',
  (SELECT id FROM public.plano_contas WHERE codigo='05.02')),
('05.02.06', 'Serviços de Limpeza', 3, 'despesa', 'operacional', 'administrativo',
  (SELECT id FROM public.plano_contas WHERE codigo='05.02')),
('05.02.07', 'Mão de Obra Administrativo', 3, 'despesa', 'operacional', 'administrativo',
  (SELECT id FROM public.plano_contas WHERE codigo='05.02')),
('05.02.08', 'Correios e Entregas', 3, 'despesa', 'operacional', 'administrativo',
  (SELECT id FROM public.plano_contas WHERE codigo='05.02')),
('05.02.09', 'Outras Despesas Administrativas', 3, 'despesa', 'operacional', 'administrativo',
  (SELECT id FROM public.plano_contas WHERE codigo='05.02'));

-- 05.03
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.03', 'Pessoal (RH)', 2, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.03.01', 'Salários e Ordenados CLT', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.02', 'FGTS', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.03', 'INSS Patronal', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.04', '13º Salário e Provisão', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.05', 'Férias e Provisão', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.06', 'Vale Transporte', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.07', 'Vale Refeição/Alimentação', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.08', 'Plano de Saúde', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.09', 'Outros Benefícios', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.10', 'Demissões e Rescisões', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.11', 'Contratos PJ', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03')),
('05.03.12', 'Treinamentos', 3, 'despesa', 'operacional', 'rh',
  (SELECT id FROM public.plano_contas WHERE codigo='05.03'));

-- 05.04
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.04', 'Despesas com Imóveis', 2, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.04.01', 'Aluguel Escritório SP', 3, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05.04')),
('05.04.02', 'Aluguel Galpão Joinville', 3, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05.04')),
('05.04.03', 'Condomínio', 3, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05.04')),
('05.04.04', 'IPTU', 3, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05.04')),
('05.04.05', 'Energia Elétrica', 3, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05.04')),
('05.04.06', 'Água', 3, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05.04')),
('05.04.07', 'Manutenção Predial', 3, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05.04'));

-- 05.05
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.05', 'Tecnologia e Sistemas', 2, 'despesa', 'operacional', 'ti',
  (SELECT id FROM public.plano_contas WHERE codigo='05'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.05.01', 'SaaS e Assinaturas', 3, 'despesa', 'operacional', 'ti',
  (SELECT id FROM public.plano_contas WHERE codigo='05.05')),
('05.05.02', 'Telecom e Internet', 3, 'despesa', 'operacional', 'ti',
  (SELECT id FROM public.plano_contas WHERE codigo='05.05')),
('05.05.03', 'Hospedagem e Domínios', 3, 'despesa', 'operacional', 'ti',
  (SELECT id FROM public.plano_contas WHERE codigo='05.05')),
('05.05.04', 'Softwares e Licenças', 3, 'despesa', 'operacional', 'ti',
  (SELECT id FROM public.plano_contas WHERE codigo='05.05')),
('05.05.05', 'Suporte e Manutenção TI', 3, 'despesa', 'operacional', 'ti',
  (SELECT id FROM public.plano_contas WHERE codigo='05.05'));

-- 05.06
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.06', 'Despesas Gerais', 2, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.06.01', 'Marcas e Patentes', 3, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05.06')),
('05.06.02', 'Despesas Diversas', 3, 'despesa', 'operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='05.06'));

-- 05.07
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.07', 'Despesas Financeiras', 2, 'despesa', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='05'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('05.07.01', 'Juros Bancários', 3, 'despesa', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='05.07')),
('05.07.02', 'Taxas e Tarifas Bancárias', 3, 'despesa', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='05.07')),
('05.07.03', 'IOF', 3, 'despesa', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='05.07')),
('05.07.04', 'Variação Cambial Negativa', 3, 'despesa', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='05.07')),
('05.07.05', 'Amortização Empréstimos — Principal', 3, 'despesa', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='05.07')),
('05.07.06', 'Amortização Empréstimos — Juros', 3, 'despesa', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='05.07')),
('05.07.07', 'Multas e Penalidades Financeiras', 3, 'despesa', 'financeira', 'financeiro',
  (SELECT id FROM public.plano_contas WHERE codigo='05.07'));

-- Grupo 06 — Custos diretos
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza) VALUES
('06', 'Custos Diretos (CPV)', 1, 'despesa', 'operacional');

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('06.01', 'Produto Acabado', 2, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('06.01.01', 'Produto Acabado Nacional', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.01')),
('06.01.02', 'Produto Acabado Importado', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.01'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('06.02', 'Matéria Prima', 2, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('06.02.01', 'Matéria Prima Nacional', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.02')),
('06.02.02', 'Matéria Prima Importada', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.02'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('06.03', 'Embalagens', 2, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06')),
('06.04', 'Custos de Importação', 2, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('06.04.01', 'Frete Internacional', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.04')),
('06.04.02', 'Seguro de Carga', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.04')),
('06.04.03', 'Desembaraço Aduaneiro', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.04')),
('06.04.04', 'Armazenagem Porto/Aeroporto', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.04')),
('06.04.05', 'Impostos de Importação (II)', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.04'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('06.05', 'Mão de Obra Produção', 2, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06')),
('06.06', 'Outros Custos Produção', 2, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('06.06.01', 'Energia Fábrica', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.06')),
('06.06.02', 'Manutenção Máquinas', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.06')),
('06.06.03', 'Código de Barras', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.06')),
('06.06.04', 'TI e Telecom Produção', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.06')),
('06.06.05', 'Material de Apoio Produção', 3, 'despesa', 'operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='06.06'));

-- Grupo 07 — Investimentos
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza) VALUES
('07', 'Investimentos e Amortizações', 1, 'investimento', 'nao_operacional');

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('07.01', 'Investimentos Fábrica', 2, 'investimento', 'nao_operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='07')),
('07.02', 'Investimentos Gerais', 2, 'investimento', 'nao_operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='07'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('07.01.01', 'Máquinas e Equipamentos', 3, 'investimento', 'nao_operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='07.01')),
('07.01.02', 'Mobiliário Industrial', 3, 'investimento', 'nao_operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='07.01')),
('07.01.03', 'Infraestrutura Fábrica', 3, 'investimento', 'nao_operacional', 'fabrica',
  (SELECT id FROM public.plano_contas WHERE codigo='07.01'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('07.02.01', 'Equipamentos de TI', 3, 'investimento', 'nao_operacional', 'ti',
  (SELECT id FROM public.plano_contas WHERE codigo='07.02')),
('07.02.02', 'Mobiliário Escritório', 3, 'investimento', 'nao_operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='07.02')),
('07.02.03', 'Reformas e Melhorias', 3, 'investimento', 'nao_operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='07.02')),
('07.02.04', 'Veículos', 3, 'investimento', 'nao_operacional', 'geral',
  (SELECT id FROM public.plano_contas WHERE codigo='07.02')),
('07.02.05', 'Infraestrutura de Rede/Telecom', 3, 'investimento', 'nao_operacional', 'ti',
  (SELECT id FROM public.plano_contas WHERE codigo='07.02'));

-- Grupo 08 — Impostos
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza) VALUES
('08', 'Impostos sobre Resultado', 1, 'imposto', 'operacional');

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('08.01', 'Impostos Federais', 2, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('08.01.01', 'IRPJ (Lucro Presumido)', 3, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08.01')),
('08.01.02', 'CSLL (Lucro Presumido)', 3, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08.01')),
('08.01.03', 'PIS Cumulativo (0,65%)', 3, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08.01')),
('08.01.04', 'COFINS Cumulativo (3%)', 3, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08.01')),
('08.01.05', 'Outros Impostos Federais', 3, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08.01'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('08.02', 'Taxas e Tarifas', 2, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('08.02.01', 'Estaduais', 3, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08.02')),
('08.02.02', 'Federais', 3, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08.02'));

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('08.03', 'Municipais', 2, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08'));
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, centro_custo, parent_id) VALUES
('08.03.01', 'Taxa de Funcionamento', 3, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08.03')),
('08.03.02', 'Alvará e Licenças', 3, 'imposto', 'operacional', 'fiscal',
  (SELECT id FROM public.plano_contas WHERE codigo='08.03'));

-- Grupo 09 — Transferências
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza) VALUES
('09', 'Transferências', 1, 'receita', 'nao_operacional');

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, natureza, parent_id) VALUES
('09.01', 'Transferências de Entrada', 2, 'receita', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='09')),
('09.02', 'Transferências de Saída', 2, 'despesa', 'nao_operacional',
  (SELECT id FROM public.plano_contas WHERE codigo='09'));

-- ============================================================
-- PARTE 5 — SEED FORNECEDORES
-- ============================================================
INSERT INTO public.fornecedores (cnpj, razao_social, tipo, origem) VALUES
('20704757000173', 'UP 2 TECH DO BRASIL S/A', 'pj', 'qive'),
('03007331001032', 'EBAZAR.COM.BR LTDA (Mercado Livre)', 'pj', 'qive'),
('18528327000104', 'MARINA HEQUIPEL RECICLAGEM E INFORMATICA LTDA', 'pj', 'qive'),
('43283811000150', 'KALUNGA SA', 'pj', 'qive'),
('60409075000152', 'NESTLE BRASIL LTDA', 'pj', 'qive'),
('28487924000146', 'ONTECH COMERCIAL LTDA', 'pj', 'qive')
ON CONFLICT (cnpj) DO NOTHING;

-- ============================================================
-- PARTE 6 — REGRAS DE CATEGORIZAÇÃO POR NCM
-- ============================================================
INSERT INTO public.regras_categorizacao (ncm_prefixo, conta_plano_id, centro_custo, prioridade) VALUES
('8471', (SELECT id FROM public.plano_contas WHERE codigo='07.02.01'), 'ti', 5),
('8528', (SELECT id FROM public.plano_contas WHERE codigo='07.02.01'), 'ti', 5),
('8517', (SELECT id FROM public.plano_contas WHERE codigo='07.02.01'), 'ti', 5),
('8526', (SELECT id FROM public.plano_contas WHERE codigo='07.02.01'), 'ti', 5),
('8473', (SELECT id FROM public.plano_contas WHERE codigo='07.02.01'), 'ti', 5),
('8544', (SELECT id FROM public.plano_contas WHERE codigo='07.02.01'), 'ti', 5);

INSERT INTO public.regras_categorizacao (ncm_prefixo, conta_plano_id, centro_custo, prioridade) VALUES
('8516', (SELECT id FROM public.plano_contas WHERE codigo='05.02.05'), 'administrativo', 10);

INSERT INTO public.regras_categorizacao (ncm_prefixo, conta_plano_id, centro_custo, prioridade) VALUES
('4802', (SELECT id FROM public.plano_contas WHERE codigo='05.02.04'), 'administrativo', 10);

INSERT INTO public.regras_categorizacao (ncm_prefixo, conta_plano_id, centro_custo, prioridade) VALUES
('0901', (SELECT id FROM public.plano_contas WHERE codigo='05.02.05'), 'administrativo', 10);

INSERT INTO public.regras_categorizacao (ncm_prefixo, conta_plano_id, centro_custo, prioridade) VALUES
('4823', (SELECT id FROM public.plano_contas WHERE codigo='05.02.05'), 'administrativo', 10);

-- ============================================================
-- PARTE 7 — ATUALIZAR TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.gerar_lancamentos_de_contas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pago' AND NEW.data_pagamento IS NOT NULL THEN
    IF (NEW.bling_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lancamentos_financeiros WHERE bling_id = NEW.bling_id
    )) THEN
      RETURN NEW;
    END IF;
    IF (NEW.nf_chave_acesso IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lancamentos_financeiros WHERE nf_chave_acesso = NEW.nf_chave_acesso
    )) THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.lancamentos_financeiros (
      conta_id, descricao, valor, tipo_lancamento,
      data_competencia, data_pagamento,
      centro_custo, fornecedor,
      origem, bling_id, nf_chave_acesso
    ) VALUES (
      NEW.conta_id, NEW.descricao, NEW.valor,
      CASE WHEN NEW.tipo = 'pagar' THEN 'debito' ELSE 'credito' END,
      COALESCE(NEW.nf_data_emissao, NEW.data_vencimento, NEW.data_pagamento),
      NEW.data_pagamento, NEW.centro_custo, NEW.fornecedor_cliente,
      COALESCE(NEW.origem, 'manual'), NEW.bling_id, NEW.nf_chave_acesso
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_lancamentos ON public.contas_pagar_receber;
CREATE TRIGGER trg_gerar_lancamentos
  AFTER INSERT OR UPDATE ON public.contas_pagar_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_lancamentos_de_contas();
