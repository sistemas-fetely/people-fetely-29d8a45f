-- ============================================================================
-- Fix: atualiza funções que usavam nfs_stage.categoria_id (renomeado para plano_contas_id)
-- + regras_categorizacao.conta_plano_id (renomeado para plano_contas_id em §3.2)
-- ============================================================================
-- Funções afetadas:
--   1. trg_aprender_classificacao_stage — trigger de auto-aprendizado
--   2. aprender_regra_de_classificacao — cria regras de categorização
--   3. merge_nf_stage — importação/merge de NFs no stage
-- Compatibilidade retroativa: merge_nf_stage aceita plano_contas_id OU categoria_id no JSON de entrada.
-- 18/05/2026
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_aprender_classificacao_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_resultado JSONB; v_nf_alvo RECORD;
BEGIN
  IF OLD.plano_contas_id IS NULL AND NEW.plano_contas_id IS NOT NULL THEN
    BEGIN
      v_resultado := aprender_regra_de_classificacao(NEW.id, NULL);
      IF (v_resultado->>'ok')::boolean AND v_resultado->>'acao' = 'regra_criada' THEN
        FOR v_nf_alvo IN
          SELECT id FROM nfs_stage
          WHERE id <> NEW.id AND plano_contas_id IS NULL AND status NOT IN ('descartada', 'duplicata')
        LOOP
          PERFORM aplicar_regras_categorizacao_stage(v_nf_alvo.id);
        END LOOP;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Auto-aprendizado falhou: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.aprender_regra_de_classificacao(p_stage_id uuid, p_user_id uuid DEFAULT NULL::uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_nf RECORD; v_regra_existente_id UUID; v_nova_regra_id UUID;
  v_tipo_regra TEXT; v_chave_match TEXT; v_descricao_contem TEXT;
BEGIN
  SELECT * INTO v_nf FROM nfs_stage WHERE id = p_stage_id;
  IF v_nf.id IS NULL OR v_nf.plano_contas_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'NF inválida');
  END IF;
  IF v_nf.fornecedor_cnpj IS NOT NULL THEN
    v_tipo_regra := 'cnpj'; v_chave_match := v_nf.fornecedor_cnpj;
    SELECT id INTO v_regra_existente_id FROM regras_categorizacao WHERE ativo = true AND cnpj_emitente = v_nf.fornecedor_cnpj LIMIT 1;
    IF v_regra_existente_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'acao', 'regra_ja_existia', 'regra_id', v_regra_existente_id, 'tipo', v_tipo_regra);
    END IF;
    INSERT INTO regras_categorizacao (cnpj_emitente, plano_contas_id, ativo, prioridade, confianca, aprendida_automaticamente, escopo_origem, criado_por)
    VALUES (v_nf.fornecedor_cnpj, v_nf.plano_contas_id, true, 50, 0.8, true, 'classificacao_manual_stage', p_user_id)
    RETURNING id INTO v_nova_regra_id;
  END IF;
  IF v_nova_regra_id IS NULL AND v_nf.fornecedor_cnpj IS NULL AND v_nf.parceiro_id IS NOT NULL THEN
    v_tipo_regra := 'parceiro'; v_chave_match := v_nf.parceiro_id::text;
    SELECT id INTO v_regra_existente_id FROM regras_categorizacao WHERE ativo = true AND fornecedor_id = v_nf.parceiro_id LIMIT 1;
    IF v_regra_existente_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'acao', 'regra_ja_existia', 'regra_id', v_regra_existente_id, 'tipo', v_tipo_regra);
    END IF;
    INSERT INTO regras_categorizacao (fornecedor_id, plano_contas_id, ativo, prioridade, confianca, aprendida_automaticamente, escopo_origem, criado_por)
    VALUES (v_nf.parceiro_id, v_nf.plano_contas_id, true, 55, 0.8, true, 'classificacao_manual_stage', p_user_id)
    RETURNING id INTO v_nova_regra_id;
  END IF;
  IF v_nova_regra_id IS NULL AND v_nf.fornecedor_razao_social IS NOT NULL AND length(trim(v_nf.fornecedor_razao_social)) > 3 THEN
    v_tipo_regra := 'descricao';
    v_descricao_contem := split_part(trim(v_nf.fornecedor_razao_social), ' ', 1);
    IF length(v_descricao_contem) < 4 THEN v_descricao_contem := v_nf.fornecedor_razao_social; END IF;
    v_chave_match := v_descricao_contem;
    SELECT id INTO v_regra_existente_id FROM regras_categorizacao WHERE ativo = true AND descricao_contem = v_descricao_contem LIMIT 1;
    IF v_regra_existente_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'acao', 'regra_ja_existia', 'regra_id', v_regra_existente_id, 'tipo', v_tipo_regra);
    END IF;
    INSERT INTO regras_categorizacao (descricao_contem, plano_contas_id, ativo, prioridade, confianca, aprendida_automaticamente, escopo_origem, criado_por)
    VALUES (v_descricao_contem, v_nf.plano_contas_id, true, 70, 0.8, true, 'classificacao_manual_stage', p_user_id)
    RETURNING id INTO v_nova_regra_id;
  END IF;
  IF v_nova_regra_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'NF sem campos suficientes pra criar regra (sem CNPJ, sem parceiro_id, sem nome de fornecedor)');
  END IF;
  RETURN jsonb_build_object('ok', true, 'acao', 'regra_criada', 'regra_id', v_nova_regra_id, 'tipo', v_tipo_regra, 'chave', v_chave_match);
END;
$function$;

CREATE OR REPLACE FUNCTION public.merge_nf_stage(p_nf jsonb, p_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(stage_id uuid, acao text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_chave text := p_nf->>'nf_chave_acesso';
  v_cnpj text := p_nf->>'fornecedor_cnpj';
  v_numero_raw text := p_nf->>'nf_numero';
  v_data_emissao date := NULLIF(p_nf->>'nf_data_emissao','')::date;
  v_fonte text := COALESCE(p_nf->>'fonte', p_nf->>'_source', 'desconhecida');
  v_tipo_doc text := COALESCE(p_nf->>'tipo_doc', 'pdf_danfe');
  v_storage_path text := p_nf->>'arquivo_storage_path';
  v_arquivo_nome text := p_nf->>'arquivo_nome';
  v_linha_digitavel text := p_nf->>'linha_digitavel';
  v_existente_id uuid; v_existente_score int;
  v_chegando_eh_xml boolean; v_novo_id uuid;
  v_tipo_documento text := COALESCE(p_nf->>'tipo_documento', 'nfe');
  v_pais_emissor text := COALESCE(p_nf->>'pais_emissor', 'BR');
  v_moeda text := COALESCE(p_nf->>'moeda', 'BRL');
  v_fornecedor_razao text := p_nf->>'fornecedor_razao_social';
  v_valor numeric := COALESCE((p_nf->>'valor')::numeric, 0);
  v_doc_existente uuid;
  v_numero_parcela int := NULLIF(p_nf->>'numero_parcela','')::int;
  v_total_parcelas int := NULLIF(p_nf->>'total_parcelas','')::int;
  v_numero_doc_ref text := NULLIF(p_nf->>'numero_documento_referencia','');
  v_plano_contas_id uuid := COALESCE(
    NULLIF(p_nf->>'plano_contas_id','')::uuid,
    NULLIF(p_nf->>'categoria_id','')::uuid
  );
BEGIN
  v_chegando_eh_xml := v_tipo_doc = 'xml';
  IF v_tipo_doc NOT IN ('xml','pdf_danfe','pdf_boleto') THEN
    RAISE EXCEPTION 'tipo_doc inválido: %. Aceitos: xml, pdf_danfe, pdf_boleto', v_tipo_doc;
  END IF;
  IF v_chave IS NOT NULL THEN
    SELECT id INTO v_existente_id FROM nfs_stage WHERE nf_chave_acesso = v_chave AND status NOT IN ('descartada','duplicata') LIMIT 1;
  END IF;
  IF v_existente_id IS NULL AND v_cnpj IS NOT NULL AND v_numero_raw IS NOT NULL THEN
    SELECT id INTO v_existente_id FROM nfs_stage WHERE fornecedor_cnpj = v_cnpj AND nf_numero = v_numero_raw AND status NOT IN ('descartada','duplicata') LIMIT 1;
  END IF;
  IF v_existente_id IS NULL AND v_chave IS NULL THEN
    SELECT ns.id, score_match_nf(v_cnpj, v_valor, v_data_emissao, v_numero_raw, ns.fornecedor_cnpj, ns.valor, ns.nf_data_emissao, ns.nf_numero) AS s
    INTO v_existente_id, v_existente_score FROM nfs_stage ns WHERE ns.status NOT IN ('descartada','duplicata') ORDER BY s DESC LIMIT 1;
    IF v_existente_score IS NULL OR v_existente_score < 3 THEN v_existente_id := NULL; END IF;
  END IF;
  IF v_existente_id IS NULL THEN
    INSERT INTO nfs_stage (
      fonte, importacao_lote_id, fornecedor_cnpj, fornecedor_razao_social, fornecedor_cliente,
      parceiro_id, nf_numero, nf_chave_acesso, nf_data_emissao, nf_serie, valor, descricao,
      plano_contas_id, data_vencimento, itens, status, criada_por, tipo_documento, pais_emissor,
      moeda, valor_origem, taxa_conversao, numero_parcela, total_parcelas, numero_documento_referencia
    ) VALUES (
      v_fonte, NULLIF(p_nf->>'importacao_lote_id','')::uuid, v_cnpj, v_fornecedor_razao,
      p_nf->>'fornecedor_cliente', NULLIF(p_nf->>'parceiro_id','')::uuid, v_numero_raw, v_chave,
      v_data_emissao, p_nf->>'nf_serie', v_valor, p_nf->>'descricao', v_plano_contas_id,
      NULLIF(p_nf->>'data_vencimento','')::date, COALESCE(p_nf->'itens', '[]'::jsonb),
      'nao_vinculada', p_user_id, v_tipo_documento, v_pais_emissor, v_moeda,
      NULLIF(p_nf->>'valor_origem','')::numeric, NULLIF(p_nf->>'taxa_conversao','')::numeric,
      v_numero_parcela, v_total_parcelas, v_numero_doc_ref
    ) RETURNING id INTO v_novo_id;
    IF v_storage_path IS NOT NULL THEN
      INSERT INTO nfs_stage_documentos (nfs_stage_id, tipo, storage_path, arquivo_nome, linha_digitavel, criado_por)
      VALUES (v_novo_id, v_tipo_doc, v_storage_path, v_arquivo_nome, v_linha_digitavel, p_user_id);
    END IF;
    stage_id := v_novo_id; acao := 'criada'; RETURN NEXT; RETURN;
  END IF;
  UPDATE nfs_stage SET
    fornecedor_cnpj = CASE WHEN v_chegando_eh_xml THEN COALESCE(v_cnpj, fornecedor_cnpj) ELSE COALESCE(fornecedor_cnpj, v_cnpj) END,
    fornecedor_razao_social = CASE WHEN v_chegando_eh_xml THEN COALESCE(v_fornecedor_razao, fornecedor_razao_social) ELSE COALESCE(fornecedor_razao_social, v_fornecedor_razao) END,
    itens = CASE WHEN v_chegando_eh_xml AND p_nf ? 'itens' THEN p_nf->'itens' ELSE itens END,
    tipo_documento = CASE WHEN v_tipo_documento IN ('nfe','nfse') AND tipo_documento IN ('boleto','recibo') THEN v_tipo_documento ELSE tipo_documento END,
    nf_numero = COALESCE(nf_numero, v_numero_raw),
    nf_chave_acesso = COALESCE(nf_chave_acesso, v_chave),
    nf_data_emissao = COALESCE(nf_data_emissao, v_data_emissao),
    nf_serie = COALESCE(nf_serie, p_nf->>'nf_serie'),
    valor = CASE WHEN v_chegando_eh_xml AND v_valor > 0 THEN v_valor ELSE valor END,
    plano_contas_id = COALESCE(plano_contas_id, v_plano_contas_id),
    parceiro_id = COALESCE(parceiro_id, NULLIF(p_nf->>'parceiro_id','')::uuid),
    descricao = COALESCE(descricao, p_nf->>'descricao'),
    numero_parcela = COALESCE(numero_parcela, v_numero_parcela),
    total_parcelas = COALESCE(total_parcelas, v_total_parcelas),
    numero_documento_referencia = COALESCE(numero_documento_referencia, v_numero_doc_ref),
    updated_at = now()
  WHERE id = v_existente_id;
  IF v_storage_path IS NOT NULL THEN
    SELECT id INTO v_doc_existente FROM nfs_stage_documentos WHERE nfs_stage_id = v_existente_id AND storage_path = v_storage_path LIMIT 1;
    IF v_doc_existente IS NULL THEN
      INSERT INTO nfs_stage_documentos (nfs_stage_id, tipo, storage_path, arquivo_nome, linha_digitavel, criado_por)
      VALUES (v_existente_id, v_tipo_doc, v_storage_path, v_arquivo_nome, v_linha_digitavel, p_user_id);
      stage_id := v_existente_id;
      acao := CASE WHEN v_tipo_doc = 'xml' THEN 'enriquecida_xml' WHEN v_tipo_doc = 'pdf_boleto' THEN 'enriquecida_boleto' ELSE 'enriquecida_pdf' END;
      RETURN NEXT; RETURN;
    END IF;
  END IF;
  stage_id := v_existente_id; acao := 'duplicada_descartada'; RETURN NEXT;
END;
$function$;
