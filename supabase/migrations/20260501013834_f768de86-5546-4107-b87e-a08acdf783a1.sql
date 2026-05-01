CREATE OR REPLACE FUNCTION public.desfazer_conciliacao_ofx(p_ofx_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ofx RECORD;
  v_mov RECORD;
  v_conta_pagar_id UUID;
BEGIN
  SELECT * INTO v_ofx FROM ofx_transacoes_stage WHERE id = p_ofx_id;
  IF v_ofx.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Transação OFX não encontrada');
  END IF;
  IF v_ofx.status <> 'persistida' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Transação OFX não está conciliada (status: ' || v_ofx.status || ')');
  END IF;

  -- Localiza a movimentação criada pela conciliação (origem='ofx' + mesma conta + mesmo id_transacao_banco)
  SELECT * INTO v_mov
  FROM movimentacoes_bancarias
  WHERE origem = 'ofx'
    AND conta_bancaria_id = v_ofx.conta_bancaria_id
    AND (
      (v_ofx.id_transacao_banco IS NOT NULL AND id_transacao_banco = v_ofx.id_transacao_banco)
      OR (v_ofx.hash_unico IS NOT NULL AND hash_unico = v_ofx.hash_unico)
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_mov.id IS NULL THEN
    -- Mesmo sem mov, libera o status do OFX
    UPDATE ofx_transacoes_stage SET status = 'pendente' WHERE id = p_ofx_id;
    RETURN jsonb_build_object('ok', true, 'aviso', 'Movimentação não encontrada — apenas status OFX revertido');
  END IF;

  v_conta_pagar_id := v_mov.conta_pagar_id;

  -- Reverte conta a pagar (se existir vínculo)
  IF v_conta_pagar_id IS NOT NULL THEN
    UPDATE contas_pagar_receber
    SET
      movimentacao_bancaria_id = NULL,
      data_pagamento = NULL,
      status = 'aprovado',
      conciliado_em = NULL,
      conciliado_por = NULL,
      updated_at = now()
    WHERE id = v_conta_pagar_id;
  END IF;

  -- Apaga a movimentação criada
  DELETE FROM movimentacoes_bancarias WHERE id = v_mov.id;

  -- Volta o OFX para pendente
  UPDATE ofx_transacoes_stage SET status = 'pendente' WHERE id = p_ofx_id;

  -- Recalcula fatura, se aplicável
  IF v_conta_pagar_id IS NOT NULL THEN
    PERFORM public.recalcular_status_fatura(v_conta_pagar_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'movimentacao_removida', v_mov.id,
    'conta_pagar_revertida', v_conta_pagar_id
  );
END;
$function$;