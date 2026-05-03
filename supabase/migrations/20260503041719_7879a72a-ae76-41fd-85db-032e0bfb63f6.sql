-- =========================================================
-- Tabela de auditoria de duplicidade suspeita (Doutrina #13)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.auditoria_duplicidade_suspeita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  parceiro_id UUID,
  valor_total NUMERIC NOT NULL,
  data_primeira_parcela DATE NOT NULL,
  compromisso_existente_id UUID REFERENCES public.compromissos_parcelados(id) ON DELETE SET NULL,
  parcela_grupo_novo UUID NOT NULL,
  janela_segundos INTEGER NOT NULL,
  revisado_em TIMESTAMPTZ,
  revisado_por UUID,
  observacao TEXT
);

CREATE INDEX IF NOT EXISTS idx_aud_dup_parceiro_valor
  ON public.auditoria_duplicidade_suspeita(parceiro_id, valor_total, data_primeira_parcela);
CREATE INDEX IF NOT EXISTS idx_aud_dup_nao_revisado
  ON public.auditoria_duplicidade_suspeita(created_at DESC) WHERE revisado_em IS NULL;

ALTER TABLE public.auditoria_duplicidade_suspeita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financeiro pode ver auditoria de duplicidade"
  ON public.auditoria_duplicidade_suspeita
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'administrativo')
  );

CREATE POLICY "Financeiro pode atualizar auditoria de duplicidade"
  ON public.auditoria_duplicidade_suspeita
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'administrativo')
  );

-- INSERT é feito pelo trigger (SECURITY DEFINER), nenhuma policy de insert pra usuários

-- =========================================================
-- Trigger: auto-criar compromisso parcelado pai
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_auto_criar_compromisso_parcelado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_compromisso_id UUID;
  v_origem TEXT;
  v_qtd_parcelas INTEGER;
  v_valor_total NUMERIC;
  v_data_primeira DATE;
  v_data_compra DATE;
  v_descricao TEXT;
  v_parceiro_id UUID;
  v_categoria_id UUID;
  v_centro_custo TEXT;
  v_conta_bancaria_id UUID;
  v_fatura_origem_id UUID;
  v_dup_existente UUID;
BEGIN
  -- Só age quando há grupo de parcelamento e o compromisso ainda não foi setado.
  IF NEW.parcela_grupo_id IS NULL OR NEW.compromisso_parcelado_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Já existe compromisso pra esse grupo? (idempotência)
  SELECT compromisso_parcelado_id
    INTO v_compromisso_id
    FROM public.contas_pagar_receber
   WHERE parcela_grupo_id = NEW.parcela_grupo_id
     AND compromisso_parcelado_id IS NOT NULL
     AND id <> NEW.id
   LIMIT 1;

  IF v_compromisso_id IS NOT NULL THEN
    NEW.compromisso_parcelado_id := v_compromisso_id;
    RETURN NEW;
  END IF;

  -- 2. Agregar dados do grupo (siblings já existentes).
  SELECT
    COALESCE(MAX(total_parcelas), MAX(parcela_total), COUNT(*) + 1),
    SUM(valor) + NEW.valor,
    LEAST(MIN(data_vencimento), NEW.data_vencimento),
    COALESCE(MIN(data_compra), NEW.data_compra, NEW.data_vencimento)
    INTO v_qtd_parcelas, v_valor_total, v_data_primeira, v_data_compra
    FROM public.contas_pagar_receber
   WHERE parcela_grupo_id = NEW.parcela_grupo_id
     AND id <> NEW.id;

  -- Sem siblings: usa só a própria parcela.
  IF v_qtd_parcelas IS NULL THEN
    v_qtd_parcelas := COALESCE(NEW.total_parcelas, NEW.parcela_total, 1);
    v_valor_total  := NEW.valor * v_qtd_parcelas;
    v_data_primeira := NEW.data_vencimento;
    v_data_compra   := COALESCE(NEW.data_compra, NEW.data_vencimento);
  END IF;

  -- 3. Origem: cartão se veio de fatura, senão manual.
  IF NEW.is_cartao = true OR NEW.fatura_id IS NOT NULL THEN
    v_origem := 'cartao';
  ELSE
    v_origem := 'manual';
  END IF;

  v_descricao         := COALESCE(NEW.descricao, 'Compromisso parcelado');
  v_parceiro_id       := NEW.parceiro_id;
  v_categoria_id      := NEW.conta_id;
  v_centro_custo      := NEW.centro_custo;
  v_conta_bancaria_id := NEW.pago_em_conta_id;
  v_fatura_origem_id  := NEW.fatura_id;

  -- 4. Detecção de duplicidade suspeita (Doutrina #13).
  IF v_parceiro_id IS NOT NULL THEN
    SELECT id INTO v_dup_existente
      FROM public.compromissos_parcelados
     WHERE parceiro_id = v_parceiro_id
       AND valor_total = v_valor_total
       AND created_at > now() - interval '60 seconds'
       AND status = 'ativo'
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_dup_existente IS NOT NULL THEN
      INSERT INTO public.auditoria_duplicidade_suspeita (
        parceiro_id, valor_total, data_primeira_parcela,
        compromisso_existente_id, parcela_grupo_novo, janela_segundos, observacao
      ) VALUES (
        v_parceiro_id, v_valor_total, v_data_primeira,
        v_dup_existente, NEW.parcela_grupo_id, 60,
        'Detectado por trigger fn_auto_criar_compromisso_parcelado em INSERT de parcela'
      );
      RAISE WARNING 'Possível duplicidade: compromisso % já existe pro parceiro % valor %',
        v_dup_existente, v_parceiro_id, v_valor_total;
    END IF;
  END IF;

  -- 5. Criar compromisso pai.
  INSERT INTO public.compromissos_parcelados (
    descricao, parceiro_id, origem, conta_bancaria_id,
    valor_total, qtd_parcelas, valor_parcela,
    data_compra, data_primeira_parcela, status,
    categoria_id, centro_custo, fatura_origem_id, criado_por
  ) VALUES (
    v_descricao, v_parceiro_id, v_origem, v_conta_bancaria_id,
    v_valor_total, v_qtd_parcelas,
    ROUND(v_valor_total / GREATEST(v_qtd_parcelas, 1), 2),
    v_data_compra, v_data_primeira, 'ativo',
    v_categoria_id, v_centro_custo, v_fatura_origem_id, NEW.criado_por
  )
  RETURNING id INTO v_compromisso_id;

  -- 6. Vincular siblings já existentes do mesmo grupo.
  UPDATE public.contas_pagar_receber
     SET compromisso_parcelado_id = v_compromisso_id
   WHERE parcela_grupo_id = NEW.parcela_grupo_id
     AND id <> NEW.id
     AND compromisso_parcelado_id IS NULL;

  -- 7. Setar no NEW (BEFORE trigger).
  NEW.compromisso_parcelado_id := v_compromisso_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_criar_compromisso_parcelado ON public.contas_pagar_receber;
CREATE TRIGGER trg_auto_criar_compromisso_parcelado
  BEFORE INSERT ON public.contas_pagar_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_criar_compromisso_parcelado();

COMMENT ON FUNCTION public.fn_auto_criar_compromisso_parcelado() IS
  'Etapa 3: cria compromisso_parcelado pai automaticamente quando uma parcela nasce com parcela_grupo_id mas sem compromisso. Idempotente. Sem EXCEPTION WHEN OTHERS — falha propaga (Doutrina #9).';

COMMENT ON TABLE public.auditoria_duplicidade_suspeita IS
  'Registra suspeitas de import duplicado de cartão pra revisão humana (Doutrina #13).';