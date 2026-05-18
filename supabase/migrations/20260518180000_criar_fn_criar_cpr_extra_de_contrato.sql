-- ============================================================================
-- Migration: 20260518180000_criar_fn_criar_cpr_extra_de_contrato.sql
-- ============================================================================
-- Cria RPC fn_criar_cpr_extra_de_contrato(uuid, text, numeric, date, uuid)
--
-- Propósito: lançamento de UMA despesa avulsa (extra) vinculada a um contrato
-- existente, com herança automática de classificação contábil (CPR-LI).
--
-- Resolve bug ativo: o INSERT direto em salvarExtra usava tipo='despesa',
-- violando CHECK ((tipo = ANY (ARRAY['pagar'::text, 'receber'::text]))) da
-- tabela contas_pagar_receber.
--
-- Doutrinas:
-- - CPR-LI (18/05/2026): herda parceiro_id, conta_id, centro_custo_id,
--   linha_investimento_id do contrato e parceiro
-- - #126: lógica de herança vive no SQL (fonte única); UI só dispara
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_criar_cpr_extra_de_contrato(
  p_contrato_id uuid,
  p_descricao text,
  p_valor numeric,
  p_data_vencimento date,
  p_meio_pagamento_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contrato public.pasta_contratos%ROWTYPE;
  v_pasta public.ged_pastas%ROWTYPE;
  v_parceiro public.parceiros_comerciais%ROWTYPE;
  v_cpr_id uuid;
BEGIN
  -- Validações de entrada
  IF p_descricao IS NULL OR TRIM(p_descricao) = '' THEN
    RAISE EXCEPTION 'Descrição é obrigatória';
  END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;
  IF p_data_vencimento IS NULL THEN
    RAISE EXCEPTION 'Data de vencimento é obrigatória';
  END IF;
  IF p_meio_pagamento_id IS NULL THEN
    RAISE EXCEPTION 'Meio de pagamento é obrigatório';
  END IF;

  -- Buscar contrato
  SELECT * INTO v_contrato FROM public.pasta_contratos WHERE id = p_contrato_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato % não encontrado', p_contrato_id;
  END IF;

  -- Buscar pasta (pra chegar no parceiro)
  SELECT * INTO v_pasta FROM public.ged_pastas WHERE id = v_contrato.pasta_id;

  -- Doutrina CPR-LI: herdar classificação contábil do parceiro
  SELECT * INTO v_parceiro
  FROM public.parceiros_comerciais
  WHERE id = v_pasta.parceiro_id;

  -- Inserir CPR extra (origem='contrato_extra' preserva semântica do fluxo)
  INSERT INTO public.contas_pagar_receber (
    descricao, valor, data_vencimento, status, tipo, origem,
    parceiro_id, meio_pagamento_id, forma_pagamento_id,
    pasta_contrato_id, pasta_contrato_parcela_id,
    nf_aplicavel, aprovado_em,
    conta_id, centro_custo_id, linha_investimento_id,
    categoria_confirmada, categoria_sugerida_ia
  ) VALUES (
    TRIM(p_descricao), p_valor, p_data_vencimento, 'aprovado', 'pagar', 'contrato_extra',
    v_pasta.parceiro_id, p_meio_pagamento_id, v_contrato.meio_pagamento_id,
    p_contrato_id, NULL,
    true, NOW(),
    v_parceiro.categoria_padrao_id,
    v_parceiro.centro_custo_id,
    v_contrato.linha_investimento_id,
    false,
    false
  )
  RETURNING id INTO v_cpr_id;

  RETURN v_cpr_id;
END;
$function$;

COMMENT ON FUNCTION public.fn_criar_cpr_extra_de_contrato(uuid, text, numeric, date, uuid) IS
  'Cria UMA CPR avulsa (despesa extra) vinculada a um contrato existente. Herda parceiro/conta/centro/linha do contrato e parceiro. Origem: contrato_extra. Replica cross-wire forma_pagamento_id = v_contrato.meio_pagamento_id pra consistência com fn_gerar_cprs_de_contrato (a investigar no Balde B §3.4). Doutrina CPR-LI 18/05/2026. Doutrina #126: lógica de herança no banco; UI só dispara.';

GRANT EXECUTE ON FUNCTION public.fn_criar_cpr_extra_de_contrato(uuid, text, numeric, date, uuid) TO authenticated;
