-- 20260518143000_versionar_fn_gerar_cprs_de_contrato_v2_cpr_li.sql
--
-- Versionamento retroativo da função fn_gerar_cprs_de_contrato (Resolve MIG-1)
-- + Doutrina CPR-LI: CPRs geradas de contrato herdam classificação contábil
--   (conta_id, centro_custo_id, linha_investimento_id) do parceiro e do contrato.
--
-- Aplicada em produção em 18/05/2026 via SQL Editor antes deste arquivo existir.
-- Este arquivo torna a alteração idempotente e reproduzível em qualquer ambiente.
-- A função abaixo é cópia fiel do pg_get_functiondef em produção (incluindo comentários).
--
-- Doutrinas envolvidas:
--   #07.6 — Plano de Contas hierárquico; CPR usa só folha
--   #95 — Status terminal padronizado (sem aguardando_pagamento)
--   #119 — Schema é verdade; memória é hipótese
--   #120 — EXCEPTION WHEN OTHERS é mina terrestre (não usar)
--   #126 — Cada tela tem responsabilidade própria; CPR-LI silencioso na Tela 2

-- 1) ALTER TABLE pasta_contratos: adiciona linha_investimento_id (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pasta_contratos'
      AND column_name = 'linha_investimento_id'
  ) THEN
    ALTER TABLE public.pasta_contratos
      ADD COLUMN linha_investimento_id uuid REFERENCES public.linhas_investimento(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pasta_contratos_linha_investimento_id
  ON public.pasta_contratos(linha_investimento_id);

COMMENT ON COLUMN public.pasta_contratos.linha_investimento_id IS
  'Linha de investimento que o contrato atende. CPRs geradas via fn_gerar_cprs_de_contrato herdam este valor. Doutrina CPR-LI (18/05/2026).';

-- 2) REPLACE FUNCTION fn_gerar_cprs_de_contrato (cópia fiel do pg_get_functiondef em produção)
CREATE OR REPLACE FUNCTION public.fn_gerar_cprs_de_contrato(p_contrato_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contrato public.pasta_contratos%ROWTYPE;
  v_pasta public.ged_pastas%ROWTYPE;
  v_parceiro public.parceiros_comerciais%ROWTYPE;
  v_parcela public.pasta_contrato_parcelas%ROWTYPE;
  v_cpr_id uuid;
  v_meio_id uuid;
  v_count int := 0;
  v_descricao text;
BEGIN
  SELECT * INTO v_contrato FROM public.pasta_contratos WHERE id = p_contrato_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato % não encontrado', p_contrato_id;
  END IF;

  SELECT * INTO v_pasta FROM public.ged_pastas WHERE id = v_contrato.pasta_id;

  -- NOVO (Doutrina CPR-LI): busca parceiro pra herdar classificação contábil
  SELECT * INTO v_parceiro
  FROM public.parceiros_comerciais
  WHERE id = v_pasta.parceiro_id;

  -- Meio de pagamento por tipo de contrato (lógica preservada)
  SELECT id INTO v_meio_id
  FROM public.meios_pagamento
  WHERE codigo = CASE
    WHEN v_contrato.ciclo_pagamento = 'unico' THEN 'a_vista'
    WHEN v_contrato.numero_parcelas IS NOT NULL AND v_contrato.numero_parcelas > 0 THEN 'parcelado_fornecedor'
    ELSE 'recorrente'
  END AND ativo = true
  LIMIT 1;

  IF v_meio_id IS NULL THEN
    SELECT id INTO v_meio_id FROM public.meios_pagamento WHERE ativo = true ORDER BY ordem LIMIT 1;
  END IF;

  FOR v_parcela IN
    SELECT * FROM public.pasta_contrato_parcelas
    WHERE contrato_id = p_contrato_id AND status = 'pendente' AND conta_pagar_id IS NULL
    ORDER BY data_vencimento
  LOOP
    v_descricao := CASE
      WHEN v_parcela.origem = 'setup' THEN
        'Contrato ' || v_contrato.numero || ' — Setup ' ||
        COALESCE(v_parcela.numero_parcela::text || '/' || v_parcela.total_parcelas::text, '1')
      WHEN v_parcela.total_parcelas IS NOT NULL THEN
        'Contrato ' || v_contrato.numero || ' — Parcela ' ||
        v_parcela.numero_parcela::text || '/' || v_parcela.total_parcelas::text
      ELSE
        'Contrato ' || v_contrato.numero || ' — ' || TO_CHAR(v_parcela.data_vencimento, 'MM/YYYY')
    END;

    INSERT INTO public.contas_pagar_receber (
      descricao, valor, data_vencimento, status, tipo, origem,
      parceiro_id, meio_pagamento_id, forma_pagamento_id,
      pasta_contrato_id, pasta_contrato_parcela_id, numero_parcela, total_parcelas,
      nf_aplicavel, aprovado_em,
      -- NOVO: classificação herdada
      conta_id, centro_custo_id, linha_investimento_id,
      categoria_confirmada, categoria_sugerida_ia
    ) VALUES (
      v_descricao, v_parcela.valor, v_parcela.data_vencimento, 'aprovado', 'pagar', 'contrato',
      v_pasta.parceiro_id, v_meio_id, v_contrato.meio_pagamento_id,
      p_contrato_id, v_parcela.id, v_parcela.numero_parcela, v_parcela.total_parcelas,
      true, NOW(),
      -- NOVO: herda do parceiro e do contrato
      v_parceiro.categoria_padrao_id,
      v_parceiro.centro_custo_id,
      v_contrato.linha_investimento_id,
      false, -- categoria_confirmada (herança automática, não humano)
      false  -- categoria_sugerida_ia (não veio de IA)
    )
    RETURNING id INTO v_cpr_id;

    UPDATE public.pasta_contrato_parcelas
    SET conta_pagar_id = v_cpr_id
    WHERE id = v_parcela.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

COMMENT ON FUNCTION public.fn_gerar_cprs_de_contrato(uuid) IS
  'Gera CPRs a partir de parcelas pendentes de contrato. Herda conta_id e centro_custo_id do parceiro; linha_investimento_id do contrato. Sem EXCEPTION WHEN OTHERS (Doutrina #120). Doutrina CPR-LI 18/05/2026.';

-- 3) Backfill condicional (idempotente — só toca CPRs origem='contrato' com algum campo NULL)
UPDATE public.contas_pagar_receber cpr
SET
  conta_id = COALESCE(cpr.conta_id, v.categoria_padrao_id),
  centro_custo_id = COALESCE(cpr.centro_custo_id, v.centro_custo_id),
  linha_investimento_id = COALESCE(cpr.linha_investimento_id, v.linha_investimento_id)
FROM (
  SELECT
    ct.id AS contrato_id,
    pc.categoria_padrao_id,
    pc.centro_custo_id,
    ct.linha_investimento_id
  FROM public.pasta_contratos ct
  JOIN public.ged_pastas gp ON gp.id = ct.pasta_id
  JOIN public.parceiros_comerciais pc ON pc.id = gp.parceiro_id
) v
WHERE cpr.pasta_contrato_id = v.contrato_id
  AND cpr.origem = 'contrato'
  AND (
    cpr.conta_id IS NULL
    OR cpr.centro_custo_id IS NULL
    OR cpr.linha_investimento_id IS NULL
  );
