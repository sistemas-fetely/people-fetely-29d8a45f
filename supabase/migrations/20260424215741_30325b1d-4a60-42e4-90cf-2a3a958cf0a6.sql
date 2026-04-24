-- 1.1 Renomear tabela
ALTER TABLE public.fornecedores RENAME TO parceiros_comerciais;

-- Adicionar campos novos
ALTER TABLE public.parceiros_comerciais
  ADD COLUMN IF NOT EXISTS tipos TEXT[] DEFAULT ARRAY['fornecedor'],
  ADD COLUMN IF NOT EXISTS canal TEXT,
  ADD COLUMN IF NOT EXISTS segmento TEXT;

UPDATE public.parceiros_comerciais SET tipos = ARRAY['fornecedor'] WHERE tipos IS NULL;

-- Recriar índices
DROP INDEX IF EXISTS public.idx_fornecedores_cnpj;
DROP INDEX IF EXISTS public.idx_fornecedores_razao;
CREATE INDEX IF NOT EXISTS idx_parceiros_cnpj ON public.parceiros_comerciais(cnpj);
CREATE INDEX IF NOT EXISTS idx_parceiros_razao ON public.parceiros_comerciais(razao_social);
CREATE INDEX IF NOT EXISTS idx_parceiros_tipos ON public.parceiros_comerciais USING GIN(tipos);

-- Recriar políticas com novo nome
DROP POLICY IF EXISTS "View fornecedores" ON public.parceiros_comerciais;
DROP POLICY IF EXISTS "Manage fornecedores" ON public.parceiros_comerciais;
CREATE POLICY "View parceiros" ON public.parceiros_comerciais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage parceiros" ON public.parceiros_comerciais FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- 1.2 Alias parceiro_id em contas_pagar_receber
ALTER TABLE public.contas_pagar_receber
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros_comerciais(id);
UPDATE public.contas_pagar_receber SET parceiro_id = fornecedor_id WHERE fornecedor_id IS NOT NULL AND parceiro_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cpr_parceiro ON public.contas_pagar_receber(parceiro_id);

-- 1.3 Alias parceiro_id em regras_categorizacao
ALTER TABLE public.regras_categorizacao
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros_comerciais(id);
UPDATE public.regras_categorizacao SET parceiro_id = fornecedor_id WHERE fornecedor_id IS NOT NULL AND parceiro_id IS NULL;