
-- Helper: get profile_id from a user_id (returns null if user has no profile)
CREATE OR REPLACE FUNCTION public.get_profile_id_from_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Helper: get user_id from a profile_id
CREATE OR REPLACE FUNCTION public.get_user_id_from_profile(_profile_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles WHERE id = _profile_id LIMIT 1;
$$;

-- Flag to prevent recursion between triggers
CREATE OR REPLACE FUNCTION public.org_sync_in_progress()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.org_sync_in_progress', true), 'off') = 'on';
$$;

-- ============================================================
-- TRIGGER 1: When colaboradores_clt.gestor_direto_id changes,
-- update the corresponding posicao's id_pai (or create posicao).
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_gestor_to_organograma_clt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_posicao_id uuid;
  v_gestor_user_id uuid;
  v_existing_posicao_id uuid;
BEGIN
  -- Avoid recursion
  IF public.org_sync_in_progress() THEN
    RETURN NEW;
  END IF;

  -- Only act if gestor_direto_id actually changed
  IF (TG_OP = 'UPDATE' AND COALESCE(NEW.gestor_direto_id::text, '') = COALESCE(OLD.gestor_direto_id::text, '')) THEN
    RETURN NEW;
  END IF;

  -- Resolve parent posicao from gestor profile -> user_id -> posicao
  v_parent_posicao_id := NULL;
  IF NEW.gestor_direto_id IS NOT NULL THEN
    v_gestor_user_id := public.get_user_id_from_profile(NEW.gestor_direto_id);
    IF v_gestor_user_id IS NOT NULL THEN
      -- Look for posicao linked to that gestor as colaborador CLT
      SELECT p.id INTO v_parent_posicao_id
      FROM public.posicoes p
      JOIN public.colaboradores_clt c ON c.id = p.colaborador_id
      WHERE c.user_id = v_gestor_user_id
      LIMIT 1;

      -- Or as PJ
      IF v_parent_posicao_id IS NULL THEN
        SELECT p.id INTO v_parent_posicao_id
        FROM public.posicoes p
        JOIN public.contratos_pj cp ON cp.id = p.contrato_pj_id
        WHERE cp.user_id = v_gestor_user_id
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  -- Find existing posicao for this colaborador
  SELECT id INTO v_existing_posicao_id
  FROM public.posicoes
  WHERE colaborador_id = NEW.id
  LIMIT 1;

  PERFORM set_config('app.org_sync_in_progress', 'on', true);

  IF v_existing_posicao_id IS NOT NULL THEN
    UPDATE public.posicoes
    SET id_pai = v_parent_posicao_id
    WHERE id = v_existing_posicao_id;
  ELSIF NEW.gestor_direto_id IS NOT NULL THEN
    -- Auto-create posicao for this colaborador under the gestor
    INSERT INTO public.posicoes (
      titulo_cargo, departamento, nivel_hierarquico, status, id_pai, colaborador_id, salario_previsto
    ) VALUES (
      NEW.cargo, COALESCE(NEW.departamento, 'Geral'), 1, 'ocupado', v_parent_posicao_id, NEW.id, NEW.salario_base
    );
  END IF;

  PERFORM set_config('app.org_sync_in_progress', 'off', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_gestor_to_organograma_clt ON public.colaboradores_clt;
CREATE TRIGGER trg_sync_gestor_to_organograma_clt
AFTER INSERT OR UPDATE OF gestor_direto_id ON public.colaboradores_clt
FOR EACH ROW
EXECUTE FUNCTION public.sync_gestor_to_organograma_clt();

-- ============================================================
-- TRIGGER 2: Same for contratos_pj
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_gestor_to_organograma_pj()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_posicao_id uuid;
  v_gestor_user_id uuid;
  v_existing_posicao_id uuid;
  v_titulo_cargo text;
BEGIN
  IF public.org_sync_in_progress() THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE' AND COALESCE(NEW.gestor_direto_id::text, '') = COALESCE(OLD.gestor_direto_id::text, '')) THEN
    RETURN NEW;
  END IF;

  v_parent_posicao_id := NULL;
  IF NEW.gestor_direto_id IS NOT NULL THEN
    v_gestor_user_id := public.get_user_id_from_profile(NEW.gestor_direto_id);
    IF v_gestor_user_id IS NOT NULL THEN
      SELECT p.id INTO v_parent_posicao_id
      FROM public.posicoes p
      JOIN public.colaboradores_clt c ON c.id = p.colaborador_id
      WHERE c.user_id = v_gestor_user_id
      LIMIT 1;

      IF v_parent_posicao_id IS NULL THEN
        SELECT p.id INTO v_parent_posicao_id
        FROM public.posicoes p
        JOIN public.contratos_pj cp ON cp.id = p.contrato_pj_id
        WHERE cp.user_id = v_gestor_user_id
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  SELECT id INTO v_existing_posicao_id
  FROM public.posicoes
  WHERE contrato_pj_id = NEW.id
  LIMIT 1;

  PERFORM set_config('app.org_sync_in_progress', 'on', true);

  IF v_existing_posicao_id IS NOT NULL THEN
    UPDATE public.posicoes
    SET id_pai = v_parent_posicao_id
    WHERE id = v_existing_posicao_id;
  ELSIF NEW.gestor_direto_id IS NOT NULL THEN
    v_titulo_cargo := COALESCE(NEW.tipo_servico, 'PJ - ' || NEW.contato_nome);
    INSERT INTO public.posicoes (
      titulo_cargo, departamento, nivel_hierarquico, status, id_pai, contrato_pj_id, salario_previsto
    ) VALUES (
      v_titulo_cargo, COALESCE(NEW.departamento, 'Geral'), 1, 'ocupado', v_parent_posicao_id, NEW.id, NEW.valor_mensal
    );
  END IF;

  PERFORM set_config('app.org_sync_in_progress', 'off', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_gestor_to_organograma_pj ON public.contratos_pj;
CREATE TRIGGER trg_sync_gestor_to_organograma_pj
AFTER INSERT OR UPDATE OF gestor_direto_id ON public.contratos_pj
FOR EACH ROW
EXECUTE FUNCTION public.sync_gestor_to_organograma_pj();

-- ============================================================
-- TRIGGER 3: When posicoes.id_pai changes, update the linked
-- person's gestor_direto_id (CLT or PJ).
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_organograma_to_gestor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_posicao RECORD;
  v_gestor_user_id uuid;
  v_gestor_profile_id uuid;
BEGIN
  IF public.org_sync_in_progress() THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE' AND COALESCE(NEW.id_pai::text, '') = COALESCE(OLD.id_pai::text, '')) THEN
    RETURN NEW;
  END IF;

  -- Resolve gestor profile from parent posicao's linked person
  v_gestor_profile_id := NULL;
  IF NEW.id_pai IS NOT NULL THEN
    SELECT colaborador_id, contrato_pj_id INTO v_parent_posicao
    FROM public.posicoes
    WHERE id = NEW.id_pai;

    IF v_parent_posicao.colaborador_id IS NOT NULL THEN
      SELECT user_id INTO v_gestor_user_id
      FROM public.colaboradores_clt
      WHERE id = v_parent_posicao.colaborador_id;
    ELSIF v_parent_posicao.contrato_pj_id IS NOT NULL THEN
      SELECT user_id INTO v_gestor_user_id
      FROM public.contratos_pj
      WHERE id = v_parent_posicao.contrato_pj_id;
    END IF;

    IF v_gestor_user_id IS NOT NULL THEN
      v_gestor_profile_id := public.get_profile_id_from_user(v_gestor_user_id);
    END IF;
  END IF;

  PERFORM set_config('app.org_sync_in_progress', 'on', true);

  -- Update linked CLT
  IF NEW.colaborador_id IS NOT NULL THEN
    UPDATE public.colaboradores_clt
    SET gestor_direto_id = v_gestor_profile_id
    WHERE id = NEW.colaborador_id;
  END IF;

  -- Update linked PJ
  IF NEW.contrato_pj_id IS NOT NULL THEN
    UPDATE public.contratos_pj
    SET gestor_direto_id = v_gestor_profile_id
    WHERE id = NEW.contrato_pj_id;
  END IF;

  PERFORM set_config('app.org_sync_in_progress', 'off', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_organograma_to_gestor ON public.posicoes;
CREATE TRIGGER trg_sync_organograma_to_gestor
AFTER INSERT OR UPDATE OF id_pai ON public.posicoes
FOR EACH ROW
EXECUTE FUNCTION public.sync_organograma_to_gestor();
