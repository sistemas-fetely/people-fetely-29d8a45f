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
  v_dup_existente UUID;
  v_siblings_count INTEGER;
  v_max_total INTEGER;
  v_sum_valor NUMERIC;
  v_min_venc DATE;
  v_min_compra DATE;
BEGIN
  IF NEW.parcela_grupo_id IS NULL OR NEW.compromisso_parcelado_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Idempotência
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

  -- 2. Agregar siblings já existentes
  SELECT COUNT(*), MAX(total_parcelas), SUM(valor), MIN(data_vencimento), MIN(data_compra)
    INTO v_siblings_count, v_max_total, v_sum_valor, v_min_venc, v_min_compra
    FROM public.contas_pagar_receber
   WHERE parcela_grupo_id = NEW.parcela_grupo_id
     AND id <> NEW.id;

  IF v_siblings_count > 0 THEN
    v_qtd_parcelas  := COALESCE(v_max_total, NEW.total_parcelas, v_siblings_count + 1);
    v_valor_total   := COALESCE(v_sum_valor, 0) + NEW.valor;
    v_data_primeira := LEAST(COALESCE(v_min_venc, NEW.data_vencimento), NEW.data_vencimento);
    v_data_compra   := COALESCE(v_min_compra, NEW.data_compra, NEW.data_vencimento);
  ELSE
    v_qtd_parcelas  := COALESCE(NEW.total_parcelas, 1);
    v_valor_total   := NEW.valor * v_qtd_parcelas;
    v_data_primeira := NEW.data_vencimento;
    v_data_compra   := COALESCE(NEW.data_compra, NEW.data_vencimento);
  END IF;

  -- 3. Origem
  v_origem := CASE WHEN NEW.is_cartao = true THEN 'cartao' ELSE 'manual' END;

  v_descricao         := COALESCE(NEW.descricao, 'Compromisso parcelado');
  v_parceiro_id       := NEW.parceiro_id;
  v_categoria_id      := NEW.conta_id;
  v_centro_custo      := NEW.centro_custo;
  v_conta_bancaria_id := NEW.pago_em_conta_id;

  -- 4. Detecção de duplicidade suspeita
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

  -- 5. Criar compromisso pai
  INSERT INTO public.compromissos_parcelados (
    descricao, parceiro_id, origem, conta_bancaria_id,
    valor_total, qtd_parcelas, valor_parcela,
    data_compra, data_primeira_parcela, status,
    categoria_id, centro_custo, criado_por
  ) VALUES (
    v_descricao, v_parceiro_id, v_origem, v_conta_bancaria_id,
    v_valor_total, v_qtd_parcelas,
    ROUND(v_valor_total / GREATEST(v_qtd_parcelas, 1), 2),
    v_data_compra, v_data_primeira, 'ativo',
    v_categoria_id, v_centro_custo, NEW.criado_por
  )
  RETURNING id INTO v_compromisso_id;

  -- 6. Vincular siblings já existentes
  UPDATE public.contas_pagar_receber
     SET compromisso_parcelado_id = v_compromisso_id
   WHERE parcela_grupo_id = NEW.parcela_grupo_id
     AND id <> NEW.id
     AND compromisso_parcelado_id IS NULL;

  -- 7. Setar no NEW
  NEW.compromisso_parcelado_id := v_compromisso_id;

  RETURN NEW;
END;
$$;