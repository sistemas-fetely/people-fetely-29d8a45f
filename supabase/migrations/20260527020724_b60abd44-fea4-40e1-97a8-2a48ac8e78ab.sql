-- ============================================================================
-- MIGRATION: Módulo Análise de Crédito v1 — Views + RPCs
-- Data: 27/05/2026
-- 
-- Cria:
--   3 views: v_credito_resumo_financeiro, v_credito_resumo_financeiro_grupo, v_parceiro_timeline
--   4 RPCs:  criar_analise_credito, transicionar_analise, 
--            erguer_bandeira_vermelha, baixar_bandeira_vermelha
-- ============================================================================


-- ============================================================================
-- VIEW 1 — v_credito_resumo_financeiro (painel por cliente)
-- Lê de contas_pagar_receber tipo='receber' (vendas)
-- Filtra deleted_at IS NULL (respeita soft delete)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_credito_resumo_financeiro AS
SELECT
  pc.id AS parceiro_id,
  pc.cnpj,
  pc.razao_social,
  
  COALESCE(SUM(cpr.valor) FILTER (
    WHERE cpr.tipo = 'receber' AND cpr.status != 'paga' AND cpr.deleted_at IS NULL
  ), 0) AS em_aberto,
  
  COALESCE(SUM(cpr.valor) FILTER (
    WHERE cpr.tipo = 'receber' AND cpr.status = 'paga' AND cpr.deleted_at IS NULL
  ), 0) AS pago,
  
  COALESCE(MAX(cpr.valor) FILTER (
    WHERE cpr.tipo = 'receber' AND cpr.deleted_at IS NULL
  ), 0) AS maior_compra,
  
  MAX(cpr.created_at) FILTER (
    WHERE cpr.tipo = 'receber' AND cpr.deleted_at IS NULL
  ) AS ultima_compra_em,
  
  COALESCE(SUM(cpr.valor) FILTER (
    WHERE cpr.tipo = 'receber' 
    AND cpr.status != 'paga' 
    AND cpr.deleted_at IS NULL
    AND cpr.data_vencimento < CURRENT_DATE
  ), 0) AS vencidos,
  
  COALESCE(SUM(cpr.valor) FILTER (
    WHERE cpr.tipo = 'receber' 
    AND cpr.status != 'paga' 
    AND cpr.deleted_at IS NULL
    AND cpr.data_vencimento >= CURRENT_DATE
  ), 0) AS a_vencer,
  
  COALESCE(AVG(
    EXTRACT(DAY FROM (cpr.data_pagamento::timestamp - cpr.data_vencimento::timestamp))
  ) FILTER (
    WHERE cpr.tipo = 'receber' 
    AND cpr.status = 'paga' 
    AND cpr.deleted_at IS NULL
    AND cpr.data_pagamento::date > cpr.data_vencimento
  ), 0) AS atraso_medio_dias

FROM public.parceiros_comerciais pc
LEFT JOIN public.contas_pagar_receber cpr ON cpr.parceiro_id = pc.id
GROUP BY pc.id, pc.cnpj, pc.razao_social;

COMMENT ON VIEW public.v_credito_resumo_financeiro IS 'Painel financeiro do cliente — consumido pelo módulo Crédito (Tela 8 Joseph). Doutrina Petróleo: lê de CPR, não duplica dado.';


-- ============================================================================
-- VIEW 2 — v_credito_resumo_financeiro_grupo (agregado por grupo econômico)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_credito_resumo_financeiro_grupo AS
SELECT
  ge.id AS grupo_economico_id,
  ge.nome AS grupo_nome,
  SUM(vcrf.em_aberto) AS em_aberto,
  SUM(vcrf.pago) AS pago,
  MAX(vcrf.maior_compra) AS maior_compra,
  MAX(vcrf.ultima_compra_em) AS ultima_compra_em,
  SUM(vcrf.vencidos) AS vencidos,
  SUM(vcrf.a_vencer) AS a_vencer,
  AVG(vcrf.atraso_medio_dias) FILTER (WHERE vcrf.atraso_medio_dias > 0) AS atraso_medio_dias,
  COUNT(DISTINCT pc.id) AS qtd_parceiros
FROM public.grupos_economicos ge
JOIN public.parceiros_comerciais pc ON pc.grupo_economico_id = ge.id
JOIN public.v_credito_resumo_financeiro vcrf ON vcrf.parceiro_id = pc.id
WHERE ge.status = 'ativo'
GROUP BY ge.id, ge.nome;

COMMENT ON VIEW public.v_credito_resumo_financeiro_grupo IS 'Agregado do painel financeiro por grupo econômico — alimenta painel do grupo na Tela 8.';


-- ============================================================================
-- VIEW 3 — v_parceiro_timeline (timeline visual no card)
-- Frontend filtra por parceiro_id + ordena criado_em DESC
-- ============================================================================
CREATE OR REPLACE VIEW public.v_parceiro_timeline AS
SELECT 
  pm.id,
  pm.parceiro_id,
  pm.tipo_marco,
  pm.valor_anterior,
  pm.valor_novo,
  pm.motivo,
  pm.referencia_id,
  pm.referencia_tipo,
  pm.operador_id,
  au.email AS operador_email,
  pm.criado_em
FROM public.parceiro_marcos pm
LEFT JOIN auth.users au ON au.id = pm.operador_id;

COMMENT ON VIEW public.v_parceiro_timeline IS 'Timeline visual de marcos do parceiro — alimenta card do cliente na Tela 8.';


-- ============================================================================
-- GRANTS — views legíveis pra authenticated
-- ============================================================================
GRANT SELECT ON public.v_credito_resumo_financeiro TO authenticated;
GRANT SELECT ON public.v_credito_resumo_financeiro_grupo TO authenticated;
GRANT SELECT ON public.v_parceiro_timeline TO authenticated;


-- ============================================================================
-- RPC 1 — criar_analise_credito
-- Orquestra: busca/cria parceiro → cria pedido → cria análise → registra transição
-- Idempotente por id_externo (retry de Sistema do Thomer retorna análise existente)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.criar_analise_credito(
  p_cnpj text,
  p_id_externo text,
  p_data_pedido date,
  p_valor_bruto numeric,
  p_valor_liquido numeric,
  p_condicao_solicitada text,
  p_forma_solicitada text,
  p_desconto_pct numeric DEFAULT NULL,
  p_vendedor text DEFAULT NULL,
  p_origem text DEFAULT NULL,
  p_itens_json jsonb DEFAULT NULL,
  p_recebido_via text DEFAULT 'api'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parceiro_id uuid;
  v_pedido_id uuid;
  v_analise_id uuid;
  v_cnpj_limpo text;
  v_pedido_existente_id uuid;
BEGIN
  -- Limpa CNPJ (só dígitos)
  v_cnpj_limpo := regexp_replace(p_cnpj, '[^0-9]', '', 'g');
  
  IF length(v_cnpj_limpo) != 14 THEN
    RAISE EXCEPTION 'CNPJ inválido: deve ter 14 dígitos';
  END IF;
  
  IF p_valor_bruto <= 0 OR p_valor_liquido <= 0 THEN
    RAISE EXCEPTION 'Valores devem ser positivos';
  END IF;
  
  -- Idempotência: id_externo já existe?
  SELECT p.id INTO v_pedido_existente_id
  FROM pedidos p
  WHERE p.id_externo = p_id_externo;
  
  IF v_pedido_existente_id IS NOT NULL THEN
    SELECT id INTO v_analise_id 
    FROM analises_credito 
    WHERE pedido_id = v_pedido_existente_id;
    
    RETURN json_build_object(
      'analise_id', v_analise_id,
      'parceiro_id', (SELECT parceiro_id FROM analises_credito WHERE id = v_analise_id),
      'pedido_id', v_pedido_existente_id,
      'status', 'ja_existe'
    );
  END IF;
  
  -- Busca ou cria parceiro
  SELECT id INTO v_parceiro_id
  FROM parceiros_comerciais
  WHERE cnpj = v_cnpj_limpo;
  
  IF v_parceiro_id IS NULL THEN
    INSERT INTO parceiros_comerciais (cnpj, razao_social, cadastro_incompleto)
    VALUES (v_cnpj_limpo, 'A enriquecer via BrasilAPI', true)
    RETURNING id INTO v_parceiro_id;
    -- Edge function consultar-cnpj enriquece assincronamente depois
  END IF;
  
  -- Cria pedido
  INSERT INTO pedidos (
    id_externo, parceiro_id, data_pedido, valor_bruto, valor_liquido,
    desconto_pct, condicao_solicitada, forma_solicitada, vendedor, origem, 
    itens_json, recebido_via
  ) VALUES (
    p_id_externo, v_parceiro_id, p_data_pedido, p_valor_bruto, p_valor_liquido,
    p_desconto_pct, p_condicao_solicitada, p_forma_solicitada, p_vendedor, p_origem,
    p_itens_json, p_recebido_via
  ) RETURNING id INTO v_pedido_id;
  
  -- Cria análise
  INSERT INTO analises_credito (pedido_id, parceiro_id, estagio_atual)
  VALUES (v_pedido_id, v_parceiro_id, 'entrada')
  RETURNING id INTO v_analise_id;
  
  -- Registra transição inicial
  INSERT INTO analise_credito_transicoes (analise_id, acao, estagio_destino, motivo)
  VALUES (v_analise_id, 'digitado', 'entrada', 'Pedido recebido');
  
  RETURN json_build_object(
    'analise_id', v_analise_id,
    'parceiro_id', v_parceiro_id,
    'pedido_id', v_pedido_id,
    'status', 'criada'
  );
END;
$$;

COMMENT ON FUNCTION public.criar_analise_credito IS 'Orquestra criação de análise: parceiro+pedido+análise+transição inicial em transação atômica. Idempotente por id_externo.';


-- ============================================================================
-- RPC 2 — transicionar_analise
-- Máquina de estados Entrada → Análise → Decisão (com retornos permitidos)
-- Aplica side effects: atualiza parceiro_credito + cria marcos pós-decisão
-- Validade default 90 dias se não vier preenchida
-- ============================================================================
CREATE OR REPLACE FUNCTION public.transicionar_analise(
  p_analise_id uuid,
  p_acao text,
  p_estagio_destino text DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_perfil_aplicado text DEFAULT NULL,
  p_limite_concedido numeric DEFAULT NULL,
  p_prazo_max_dias int DEFAULT NULL,
  p_formas_aceitas text[] DEFAULT NULL,
  p_parecer_final text DEFAULT NULL,
  p_ressalva text DEFAULT NULL,
  p_validade_ate date DEFAULT NULL,
  p_delta_ia jsonb DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estagio_origem text;
  v_estagio_calculado text;
  v_parceiro_id uuid;
  v_perfil_anterior text;
  v_status_final text;
  v_validade_final date;
BEGIN
  -- Pega estado atual
  SELECT estagio_atual, parceiro_id INTO v_estagio_origem, v_parceiro_id
  FROM analises_credito WHERE id = p_analise_id;
  
  IF v_estagio_origem IS NULL THEN
    RAISE EXCEPTION 'Análise não encontrada';
  END IF;
  
  -- Análise finalizada é imutável (reabrir = nova análise via analise_anterior_id)
  IF EXISTS (SELECT 1 FROM analises_credito WHERE id = p_analise_id AND status_final IS NOT NULL) THEN
    RAISE EXCEPTION 'Análise já finalizada — não pode transicionar';
  END IF;
  
  -- Calcula estágio destino
  v_estagio_calculado := CASE
    WHEN p_acao = 'encaminhado' AND v_estagio_origem = 'entrada' THEN 'analise'
    WHEN p_acao = 'encaminhado' AND v_estagio_origem = 'analise' THEN 'decisao'
    WHEN p_acao = 'devolvido' THEN COALESCE(p_estagio_destino, 'entrada')
    WHEN p_acao IN ('aprovado','aprovado_com_ressalva','reprovado','cancelado') THEN v_estagio_origem
    ELSE NULL
  END;
  
  IF v_estagio_calculado IS NULL THEN
    RAISE EXCEPTION 'Transição inválida: % no estágio %', p_acao, v_estagio_origem;
  END IF;
  
  -- Validações de motivo obrigatório
  IF p_acao IN ('devolvido','reprovado','cancelado','aprovado_com_ressalva') 
     AND (p_motivo IS NULL OR length(p_motivo) < 10) THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 10 caracteres) para acao=%', p_acao;
  END IF;
  
  -- Determina status_final pra ações decisórias
  v_status_final := CASE 
    WHEN p_acao IN ('aprovado','aprovado_com_ressalva','reprovado','cancelado') THEN p_acao 
    ELSE NULL 
  END;
  
  -- Calcula validade default (90 dias) se aprovação sem validade explícita
  IF p_acao IN ('aprovado','aprovado_com_ressalva') AND p_validade_ate IS NULL THEN
    v_validade_final := CURRENT_DATE + INTERVAL '90 days';
  ELSE
    v_validade_final := p_validade_ate;
  END IF;
  
  -- Atualiza análise
  UPDATE analises_credito SET
    estagio_atual = v_estagio_calculado,
    encaminhado_analise_em = CASE 
      WHEN p_acao = 'encaminhado' AND v_estagio_origem = 'entrada' THEN now() 
      ELSE encaminhado_analise_em 
    END,
    encaminhado_decisao_em = CASE 
      WHEN p_acao = 'encaminhado' AND v_estagio_origem = 'analise' THEN now() 
      ELSE encaminhado_decisao_em 
    END,
    decidido_em = CASE 
      WHEN v_status_final IS NOT NULL THEN now() 
      ELSE decidido_em 
    END,
    decidido_por = CASE 
      WHEN v_status_final IS NOT NULL THEN auth.uid() 
      ELSE decidido_por 
    END,
    status_final = COALESCE(v_status_final, status_final),
    perfil_aplicado = COALESCE(p_perfil_aplicado, perfil_aplicado),
    limite_concedido = COALESCE(p_limite_concedido, limite_concedido),
    prazo_max_dias = COALESCE(p_prazo_max_dias, prazo_max_dias),
    formas_aceitas = COALESCE(p_formas_aceitas, formas_aceitas),
    parecer_final = COALESCE(p_parecer_final, parecer_final),
    ressalva = COALESCE(p_ressalva, ressalva),
    validade_ate = COALESCE(v_validade_final, validade_ate)
  WHERE id = p_analise_id;
  
  -- Registra transição (audit trail)
  INSERT INTO analise_credito_transicoes (
    analise_id, usuario_id, acao, estagio_origem, estagio_destino, motivo, delta_ia
  ) VALUES (
    p_analise_id, auth.uid(), p_acao, v_estagio_origem, v_estagio_calculado, p_motivo, p_delta_ia
  );
  
  -- Side effects pós-decisão
  IF p_acao IN ('aprovado','aprovado_com_ressalva') AND p_perfil_aplicado IS NOT NULL THEN
    SELECT perfil_credito INTO v_perfil_anterior 
    FROM parceiros_comerciais WHERE id = v_parceiro_id;
    
    -- Atualiza perfil se mudou
    IF v_perfil_anterior IS DISTINCT FROM p_perfil_aplicado THEN
      UPDATE parceiros_comerciais 
        SET perfil_credito = p_perfil_aplicado 
        WHERE id = v_parceiro_id;
      
      INSERT INTO parceiro_marcos (
        parceiro_id, tipo_marco, valor_anterior, valor_novo, 
        motivo, referencia_id, referencia_tipo, operador_id
      ) VALUES (
        v_parceiro_id, 'perfil_credito_mudou', v_perfil_anterior, p_perfil_aplicado,
        'Decisão de análise', p_analise_id, 'analise', auth.uid()
      );
    END IF;
  END IF;
  
  -- Marco de decisão (aprovada/aprovada_com_ressalva/reprovada/cancelada)
  IF v_status_final IS NOT NULL THEN
    INSERT INTO parceiro_marcos (
      parceiro_id, tipo_marco, motivo, referencia_id, referencia_tipo, operador_id
    ) VALUES (
      v_parceiro_id, ('analise_' || v_status_final)::text, 
      p_motivo, p_analise_id, 'analise', auth.uid()
    );
  END IF;
  
  RETURN json_build_object(
    'analise_id', p_analise_id, 
    'estagio_novo', v_estagio_calculado, 
    'status_final', v_status_final,
    'validade_ate', v_validade_final,
    'status', 'transicionada'
  );
END;
$$;

COMMENT ON FUNCTION public.transicionar_analise IS 'Máquina de estados Entrada→Análise→Decisão. Aplica side effects (perfil_credito, marcos) pós-decisão. Validade default 90 dias.';


-- ============================================================================
-- RPC 3 — erguer_bandeira_vermelha
-- ============================================================================
CREATE OR REPLACE FUNCTION public.erguer_bandeira_vermelha(
  p_parceiro_id uuid, 
  p_motivo text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_motivo IS NULL OR length(p_motivo) < 10 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 10 caracteres)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM parceiros_comerciais WHERE id = p_parceiro_id AND bandeira_vermelha = true) THEN
    RAISE EXCEPTION 'Cliente já está em bandeira vermelha';
  END IF;
  
  UPDATE parceiros_comerciais SET 
    bandeira_vermelha = true,
    bandeira_vermelha_motivo = p_motivo,
    bandeira_vermelha_por = auth.uid(),
    bandeira_vermelha_em = now()
  WHERE id = p_parceiro_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parceiro não encontrado';
  END IF;
  
  INSERT INTO parceiro_marcos (
    parceiro_id, tipo_marco, valor_anterior, valor_novo, motivo, operador_id
  ) VALUES (
    p_parceiro_id, 'bandeira_vermelha_subiu', 'false', 'true', p_motivo, auth.uid()
  );
  
  RETURN json_build_object('parceiro_id', p_parceiro_id, 'status', 'erguida');
END;
$$;

COMMENT ON FUNCTION public.erguer_bandeira_vermelha IS 'Marca cliente como bandeira vermelha. Motivo obrigatório. Audit em parceiro_marcos.';


-- ============================================================================
-- RPC 4 — baixar_bandeira_vermelha
-- ============================================================================
CREATE OR REPLACE FUNCTION public.baixar_bandeira_vermelha(
  p_parceiro_id uuid, 
  p_motivo text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_motivo IS NULL OR length(p_motivo) < 10 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 10 caracteres)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM parceiros_comerciais WHERE id = p_parceiro_id AND bandeira_vermelha = true) THEN
    RAISE EXCEPTION 'Cliente não está em bandeira vermelha';
  END IF;
  
  UPDATE parceiros_comerciais SET 
    bandeira_vermelha = false,
    bandeira_vermelha_motivo = NULL,
    bandeira_vermelha_por = NULL,
    bandeira_vermelha_em = NULL
  WHERE id = p_parceiro_id;
  
  INSERT INTO parceiro_marcos (
    parceiro_id, tipo_marco, valor_anterior, valor_novo, motivo, operador_id
  ) VALUES (
    p_parceiro_id, 'bandeira_vermelha_baixou', 'true', 'false', p_motivo, auth.uid()
  );
  
  RETURN json_build_object('parceiro_id', p_parceiro_id, 'status', 'baixada');
END;
$$;

COMMENT ON FUNCTION public.baixar_bandeira_vermelha IS 'Remove bandeira vermelha. Motivo obrigatório. Audit em parceiro_marcos.';


-- ============================================================================
-- GRANTS — RPCs executáveis por authenticated
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.criar_analise_credito TO authenticated;
GRANT EXECUTE ON FUNCTION public.transicionar_analise TO authenticated;
GRANT EXECUTE ON FUNCTION public.erguer_bandeira_vermelha TO authenticated;
GRANT EXECUTE ON FUNCTION public.baixar_bandeira_vermelha TO authenticated;


-- ============================================================================
-- VALIDATE-1 — Confirma estado final esperado
-- ============================================================================
SELECT
  'modulo_analise_credito_v1_views_rpcs' AS migration,
  (SELECT count(*)::int FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name IN ('v_credito_resumo_financeiro', 'v_credito_resumo_financeiro_grupo', 'v_parceiro_timeline')
  ) AS views_criadas,
  3 AS views_esperadas,
  (SELECT count(*)::int FROM information_schema.routines
    WHERE routine_schema = 'public' 
    AND routine_name IN ('criar_analise_credito', 'transicionar_analise', 'erguer_bandeira_vermelha', 'baixar_bandeira_vermelha')
  ) AS rpcs_criadas,
  4 AS rpcs_esperadas;