-- BLOCO 1
CREATE OR REPLACE FUNCTION public.desvincular_nf_de_conta(p_conta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nf_stage_id uuid;
BEGIN
  SELECT nf_stage_id INTO v_nf_stage_id
  FROM contas_pagar_receber
  WHERE id = p_conta_id;

  IF v_nf_stage_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Esta conta não tem NF vinculada');
  END IF;

  UPDATE contas_pagar_receber
     SET nf_stage_id = NULL
   WHERE id = p_conta_id;

  UPDATE nfs_stage
     SET conta_pagar_id = NULL
   WHERE id = v_nf_stage_id
     AND conta_pagar_id = p_conta_id;

  RETURN jsonb_build_object('ok', true, 'nf_stage_id', v_nf_stage_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.desvincular_nf_de_conta(uuid) TO authenticated;

-- BLOCO 2
ALTER TABLE public.nfs_stage
  DROP CONSTRAINT IF EXISTS nfs_stage_categoria_id_fkey;

ALTER TABLE public.nfs_stage
  ADD CONSTRAINT nfs_stage_categoria_id_fkey
  FOREIGN KEY (categoria_id)
  REFERENCES public.plano_contas(id)
  ON DELETE SET NULL;

-- BLOCO 3 (a coluna em contas_pagar_receber chama-se conta_id, não categoria_id)
CREATE OR REPLACE FUNCTION public.fn_validar_categoria_folha_cpr()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.conta_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.conta_id IS NOT DISTINCT FROM NEW.conta_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM plano_contas WHERE parent_id = NEW.conta_id
  ) THEN
    RAISE EXCEPTION 'Categoria escolhida é cabeçalho (tem subcategorias). Selecione uma categoria folha.'
      USING ERRCODE = 'check_violation',
            HINT = 'Lançamentos só são permitidos em nós folha do plano de contas. Doutrina #07.6.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_categoria_folha_cpr ON public.contas_pagar_receber;

CREATE TRIGGER trg_validar_categoria_folha_cpr
  BEFORE INSERT OR UPDATE OF conta_id ON public.contas_pagar_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validar_categoria_folha_cpr();