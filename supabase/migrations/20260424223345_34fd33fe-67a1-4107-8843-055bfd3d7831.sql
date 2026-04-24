-- Adicionar bling_id em parceiros_comerciais
ALTER TABLE public.parceiros_comerciais ADD COLUMN IF NOT EXISTS bling_id TEXT;
CREATE INDEX IF NOT EXISTS idx_parceiros_bling ON public.parceiros_comerciais(bling_id);

-- Pedidos de Venda
CREATE TABLE IF NOT EXISTS public.pedidos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bling_id TEXT UNIQUE,
  numero TEXT,
  numero_loja TEXT,
  data_pedido DATE,
  data_prevista_entrega DATE,
  data_saida DATE,
  parceiro_id UUID REFERENCES public.parceiros_comerciais(id),
  cliente_nome TEXT,
  cliente_cnpj_cpf TEXT,
  valor_produtos DECIMAL(15,2) DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  canal TEXT,
  situacao TEXT,
  observacoes TEXT,
  nf_numero TEXT,
  nf_serie TEXT,
  nf_chave_acesso TEXT,
  origem TEXT DEFAULT 'api_bling',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_bling ON public.pedidos_venda(bling_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON public.pedidos_venda(data_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_parceiro ON public.pedidos_venda(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_canal ON public.pedidos_venda(canal);

ALTER TABLE public.pedidos_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View pedidos" ON public.pedidos_venda FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage pedidos" ON public.pedidos_venda FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bling_id TEXT UNIQUE,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'produto' CHECK (tipo IN ('produto', 'servico', 'kit')),
  categoria TEXT,
  marca TEXT,
  linha TEXT,
  peso_bruto DECIMAL(10,3),
  peso_liquido DECIMAL(10,3),
  unidade TEXT DEFAULT 'UN',
  ncm TEXT,
  gtin TEXT,
  preco_custo DECIMAL(15,2),
  preco_venda DECIMAL(15,2),
  estoque_atual DECIMAL(15,2) DEFAULT 0,
  estoque_minimo DECIMAL(15,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  imagem_url TEXT,
  origem TEXT DEFAULT 'api_bling',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_produtos_bling ON public.produtos(bling_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_linha ON public.produtos(linha);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View produtos" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage produtos" ON public.produtos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- Itens dos pedidos
CREATE TABLE IF NOT EXISTS public.pedidos_venda_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos_venda(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  codigo_produto TEXT,
  descricao TEXT NOT NULL,
  quantidade DECIMAL(15,4),
  valor_unitario DECIMAL(15,4),
  valor_total DECIMAL(15,2),
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pv_itens_pedido ON public.pedidos_venda_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pv_itens_produto ON public.pedidos_venda_itens(produto_id);

ALTER TABLE public.pedidos_venda_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View pv itens" ON public.pedidos_venda_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage pv itens" ON public.pedidos_venda_itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- Triggers de updated_at
CREATE TRIGGER trg_pedidos_venda_updated_at BEFORE UPDATE ON public.pedidos_venda
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();