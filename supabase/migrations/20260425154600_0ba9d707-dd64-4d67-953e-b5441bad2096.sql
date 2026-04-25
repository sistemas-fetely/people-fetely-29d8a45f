-- Contas bancárias
CREATE TABLE IF NOT EXISTS public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banco TEXT NOT NULL,
  banco_codigo TEXT,
  agencia TEXT,
  numero_conta TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'cartao_credito', 'cartao_debito', 'investimento')),
  nome_exibicao TEXT NOT NULL,
  moeda TEXT DEFAULT 'BRL',
  saldo_atual DECIMAL(15,2) DEFAULT 0,
  saldo_atualizado_em TIMESTAMPTZ,
  ativo BOOLEAN DEFAULT true,
  cor TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View contas bancarias"
  ON public.contas_bancarias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage contas bancarias"
  ON public.contas_bancarias FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE TRIGGER update_contas_bancarias_updated_at
  BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.contas_bancarias (banco, banco_codigo, tipo, nome_exibicao, cor) VALUES
  ('Itaú', '341', 'corrente', 'Itaú Conta Corrente', '#FF6600'),
  ('Safra', '422', 'corrente', 'Safra Conta Corrente', '#003399'),
  ('Itaú', '341', 'cartao_credito', 'Itaú Cartão de Crédito', '#FF9933'),
  ('Safra', '422', 'cartao_credito', 'Safra Cartão de Crédito', '#0066CC')
ON CONFLICT DO NOTHING;

-- Movimentações bancárias
CREATE TABLE IF NOT EXISTS public.movimentacoes_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  data_transacao DATE NOT NULL,
  data_balancete DATE,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  tipo TEXT CHECK (tipo IN ('credito', 'debito')),
  id_transacao_banco TEXT,
  hash_unico TEXT UNIQUE,
  conciliado BOOLEAN DEFAULT false,
  conta_pagar_id UUID REFERENCES public.contas_pagar_receber(id) ON DELETE SET NULL,
  conciliado_em TIMESTAMPTZ,
  conciliado_por UUID,
  conta_plano_id UUID REFERENCES public.plano_contas(id) ON DELETE SET NULL,
  centro_custo TEXT,
  saldo_pos_transacao DECIMAL(15,2),
  origem TEXT DEFAULT 'manual' CHECK (origem IN ('ofx', 'csv_itau', 'csv_safra', 'manual')),
  importacao_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mov_conta ON public.movimentacoes_bancarias(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_mov_data ON public.movimentacoes_bancarias(data_transacao);
CREATE INDEX IF NOT EXISTS idx_mov_conciliado ON public.movimentacoes_bancarias(conciliado);
CREATE INDEX IF NOT EXISTS idx_mov_hash ON public.movimentacoes_bancarias(hash_unico);
CREATE INDEX IF NOT EXISTS idx_mov_conta_pagar ON public.movimentacoes_bancarias(conta_pagar_id);

ALTER TABLE public.movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View mov bancarias"
  ON public.movimentacoes_bancarias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage mov bancarias"
  ON public.movimentacoes_bancarias FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- Histórico de importações
CREATE TABLE IF NOT EXISTS public.importacoes_extrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  arquivo_nome TEXT NOT NULL,
  formato TEXT CHECK (formato IN ('ofx', 'csv_itau', 'csv_safra')),
  periodo_inicio DATE,
  periodo_fim DATE,
  registros_importados INT DEFAULT 0,
  registros_duplicados INT DEFAULT 0,
  registros_erro INT DEFAULT 0,
  importado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.importacoes_extrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View import extrato"
  ON public.importacoes_extrato FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manage import extrato"
  ON public.importacoes_extrato FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));