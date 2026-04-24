CREATE OR REPLACE FUNCTION public.gerar_cp_de_nf_pj()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parceiro_id UUID;
  v_pj_nome TEXT;
  v_pj_cnpj TEXT;
  v_pj_cpf TEXT;
  v_doc TEXT;
BEGIN
  -- Dispara quando NF passa para "aprovada" ou "enviada_pagamento" (pipeline: pendente → aprovada → enviada_pagamento → paga)
  IF NEW.status NOT IN ('aprovada', 'enviada_pagamento') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Buscar dados do PJ pelo contrato
  SELECT
    COALESCE(razao_social, contato_nome),
    cnpj,
    cpf
  INTO v_pj_nome, v_pj_cnpj, v_pj_cpf
  FROM public.contratos_pj
  WHERE id = NEW.contrato_id;

  v_doc := COALESCE(NULLIF(v_pj_cnpj, ''), NULLIF(v_pj_cpf, ''));

  -- Buscar ou criar parceiro
  IF v_doc IS NOT NULL THEN
    SELECT id INTO v_parceiro_id
    FROM public.parceiros_comerciais
    WHERE COALESCE(NULLIF(cnpj, ''), NULLIF(cpf, '')) = v_doc
    LIMIT 1;

    IF v_parceiro_id IS NULL THEN
      INSERT INTO public.parceiros_comerciais (
        cnpj, cpf, razao_social, tipo, tipos, origem, ativo
      ) VALUES (
        v_pj_cnpj,
        v_pj_cpf,
        COALESCE(v_pj_nome, 'Prestador PJ'),
        CASE WHEN v_pj_cnpj IS NOT NULL THEN 'pj' ELSE 'pf' END,
        ARRAY['fornecedor']::TEXT[],
        'nf_pj_interno',
        true
      )
      RETURNING id INTO v_parceiro_id;
    END IF;
  END IF;

  -- Anti-duplicata: já existe conta para esta NF interna?
  IF EXISTS (
    SELECT 1 FROM public.contas_pagar_receber
    WHERE origem = 'nf_pj_interno'
      AND nf_numero = NEW.numero
      AND COALESCE(nf_cnpj_emitente, '') = COALESCE(v_doc, '')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.contas_pagar_receber (
    tipo, descricao, valor, data_vencimento, status,
    fornecedor_cliente, parceiro_id,
    nf_numero, nf_serie, nf_data_emissao, nf_cnpj_emitente,
    nf_valor_produtos, nf_pdf_url,
    origem, categoria_sugerida_ia
  ) VALUES (
    'pagar',
    COALESCE(v_pj_nome, 'PJ') || ' — NF ' || COALESCE(NEW.numero, '(s/ nº)'),
    NEW.valor,
    COALESCE(
      NEW.data_vencimento,
      (NEW.data_emissao + INTERVAL '30 days')::date,
      (CURRENT_DATE + INTERVAL '30 days')::date
    ),
    'rascunho',
    v_pj_nome,
    v_parceiro_id,
    NEW.numero,
    NEW.serie,
    NEW.data_emissao,
    v_doc,
    NEW.valor,
    NEW.arquivo_url,
    'nf_pj_interno',
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nf_pj_gera_cp ON public.notas_fiscais_pj;
CREATE TRIGGER trg_nf_pj_gera_cp
  AFTER INSERT OR UPDATE OF status ON public.notas_fiscais_pj
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_cp_de_nf_pj();