-- ═══ MIGRATION 1: Bloquear auto-aprovação ═══
CREATE OR REPLACE FUNCTION public.bloquear_auto_aprovacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solicitante_id UUID;
  v_aprovador_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'ferias' THEN
    v_solicitante_id := NEW.colaborador_user_id;
    v_aprovador_id := NEW.aprovado_por;
  ELSIF TG_TABLE_NAME = 'notas_fiscais' THEN
    v_solicitante_id := NEW.user_id;
    v_aprovador_id := NEW.aprovado_por;
  ELSIF TG_TABLE_NAME = 'pagamentos_pj' THEN
    v_solicitante_id := NEW.user_id;
    v_aprovador_id := NEW.aprovado_por;
  ELSE
    RETURN NEW;
  END IF;

  IF v_aprovador_id IS NOT NULL AND v_aprovador_id = v_solicitante_id THEN
    IF NOT public.has_role(v_aprovador_id, 'super_admin') THEN
      RAISE EXCEPTION 'Auto-aprovacao nao permitida (Regra 9 - Segregacao de Funcoes). Solicitacao deve ser aprovada por gestor hierarquico ou RH.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ferias' AND column_name='aprovado_por') THEN
    DROP TRIGGER IF EXISTS trg_bloquear_auto_aprov_ferias ON public.ferias;
    CREATE TRIGGER trg_bloquear_auto_aprov_ferias
      BEFORE INSERT OR UPDATE ON public.ferias
      FOR EACH ROW EXECUTE FUNCTION public.bloquear_auto_aprovacao();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notas_fiscais' AND column_name='aprovado_por') THEN
    DROP TRIGGER IF EXISTS trg_bloquear_auto_aprov_nf ON public.notas_fiscais;
    CREATE TRIGGER trg_bloquear_auto_aprov_nf
      BEFORE INSERT OR UPDATE ON public.notas_fiscais
      FOR EACH ROW EXECUTE FUNCTION public.bloquear_auto_aprovacao();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pagamentos_pj' AND column_name='aprovado_por') THEN
    DROP TRIGGER IF EXISTS trg_bloquear_auto_aprov_pag ON public.pagamentos_pj;
    CREATE TRIGGER trg_bloquear_auto_aprov_pag
      BEFORE INSERT OR UPDATE ON public.pagamentos_pj
      FOR EACH ROW EXECUTE FUNCTION public.bloquear_auto_aprovacao();
  END IF;
END $$;

-- ═══ MIGRATION 2: Audit log automático ═══
CREATE OR REPLACE FUNCTION public.trigger_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registro_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    BEGIN
      v_registro_id := (to_jsonb(OLD)->>'id');
      IF v_registro_id IS NULL THEN
        v_registro_id := (to_jsonb(OLD)->>'user_id');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_registro_id := NULL;
    END;
  ELSE
    BEGIN
      v_registro_id := (to_jsonb(NEW)->>'id');
      IF v_registro_id IS NULL THEN
        v_registro_id := (to_jsonb(NEW)->>'user_id');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_registro_id := NULL;
    END;
  END IF;

  PERFORM public.registrar_audit(
    TG_OP,
    TG_TABLE_NAME,
    v_registro_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_remuneracoes ON public.remuneracoes;
CREATE TRIGGER trg_audit_remuneracoes
  AFTER INSERT OR UPDATE OR DELETE ON public.remuneracoes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_role_permissions ON public.role_permissions;
CREATE TRIGGER trg_audit_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

-- ═══ MIGRATION 3: Proteger Super Admin ═══
CREATE OR REPLACE FUNCTION public.proteger_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.role = 'super_admin')
     OR (TG_OP = 'DELETE' AND OLD.role = 'super_admin')
     OR (TG_OP = 'UPDATE' AND (NEW.role = 'super_admin' OR OLD.role = 'super_admin')) THEN

    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Apenas Super Admin pode alterar roles de Super Admin (Regra 2 - Blindagem de Privilegio)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_super_admin ON public.user_roles;
CREATE TRIGGER trg_proteger_super_admin
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_super_admin();

-- ═══ MIGRATION 4: Anonimização inteligente ═══
CREATE OR REPLACE FUNCTION public.processar_exclusao_dados_usuario(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apagados JSONB := '[]'::jsonb;
  v_anonimizados JSONB := '[]'::jsonb;
  v_mantidos JSONB := '[]'::jsonb;
  v_classificacao RECORD;
  v_count INTEGER;
  v_sql TEXT;
BEGIN
  IF auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Apenas o proprio titular ou Super Admin pode solicitar exclusao de dados';
  END IF;

  PERFORM public.registrar_audit(
    'SOLICITACAO_EXCLUSAO_DADOS',
    'classificacao_dados',
    _user_id::TEXT,
    NULL,
    jsonb_build_object('titular', _user_id, 'solicitado_por', auth.uid()),
    'Solicitacao de exclusao LGPD Art. 18 VI'
  );

  FOR v_classificacao IN SELECT * FROM public.classificacao_dados LOOP
    IF v_classificacao.politica = 'apagavel' THEN
      v_sql := format('DELETE FROM public.%I WHERE user_id = $1', v_classificacao.tabela);
      BEGIN
        EXECUTE v_sql USING _user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
          v_apagados := v_apagados || jsonb_build_object('tabela', v_classificacao.tabela, 'registros', v_count);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

    ELSIF v_classificacao.politica = 'anonimizavel' THEN
      v_sql := format('UPDATE public.%I SET user_id = NULL WHERE user_id = $1', v_classificacao.tabela);
      BEGIN
        EXECUTE v_sql USING _user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
          v_anonimizados := v_anonimizados || jsonb_build_object('tabela', v_classificacao.tabela, 'registros', v_count);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

    ELSE
      v_sql := format('SELECT COUNT(*) FROM public.%I WHERE user_id = $1', v_classificacao.tabela);
      BEGIN
        EXECUTE v_sql INTO v_count USING _user_id;
        IF v_count > 0 THEN
          v_mantidos := v_mantidos || jsonb_build_object(
            'tabela', v_classificacao.tabela,
            'registros', v_count,
            'motivo', v_classificacao.base_legal,
            'retencao_anos', v_classificacao.retencao_anos
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'apagados', v_apagados,
    'anonimizados', v_anonimizados,
    'mantidos_retencao_legal', v_mantidos,
    'processado_em', now()
  );
END;
$$;

-- ═══ MIGRATION 5: Revogação D+30 ═══
CREATE OR REPLACE FUNCTION public.revogar_acessos_ex_colaboradores()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER := 0;
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT user_id, data_desligamento FROM public.colaboradores_clt
    WHERE data_desligamento IS NOT NULL
      AND data_desligamento <= CURRENT_DATE - INTERVAL '30 days'
      AND acesso_revogado_em IS NULL
      AND user_id IS NOT NULL
    UNION
    SELECT user_id, data_desligamento FROM public.contratos_pj
    WHERE data_desligamento IS NOT NULL
      AND data_desligamento <= CURRENT_DATE - INTERVAL '30 days'
      AND acesso_revogado_em IS NULL
      AND user_id IS NOT NULL
  LOOP
    IF NOT public.has_role(v_user.user_id, 'super_admin') THEN
      DELETE FROM public.user_roles WHERE user_id = v_user.user_id;

      UPDATE public.colaboradores_clt SET acesso_revogado_em = now() WHERE user_id = v_user.user_id;
      UPDATE public.contratos_pj SET acesso_revogado_em = now() WHERE user_id = v_user.user_id;

      PERFORM public.registrar_audit(
        'REVOGACAO_ACESSO_POS_DESLIGAMENTO',
        'user_roles',
        v_user.user_id::TEXT,
        jsonb_build_object('data_desligamento', v_user.data_desligamento),
        jsonb_build_object('revogado_em', now()),
        'Revogacao automatica 30 dias apos desligamento (Regra 12)'
      );

      v_total := v_total + 1;
    END IF;
  END LOOP;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.revogar_acessos_ex_colaboradores IS
  'Deve ser agendada para rodar diariamente via pg_cron ou Edge Function scheduled.';

-- ═══ MIGRATION 6: Bloquear DELETE em retenção legal ═══
CREATE OR REPLACE FUNCTION public.bloquear_delete_retencao_legal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_politica TEXT;
BEGIN
  SELECT politica INTO v_politica
  FROM public.classificacao_dados
  WHERE tabela = TG_TABLE_NAME;

  IF v_politica = 'retencao_legal' THEN
    -- Super admin pode forçar (em casos excepcionais com audit)
    IF public.has_role(auth.uid(), 'super_admin') THEN
      PERFORM public.registrar_audit(
        'DELETE_FORCADO_RETENCAO_LEGAL',
        TG_TABLE_NAME,
        COALESCE((to_jsonb(OLD)->>'id'), (to_jsonb(OLD)->>'user_id')),
        to_jsonb(OLD),
        NULL,
        'DELETE forcado por super_admin em tabela com retencao legal'
      );
      RETURN OLD;
    END IF;

    RAISE EXCEPTION 'Tabela % tem retencao legal obrigatoria. DELETE bloqueado (Regra 4). Use anonimizacao se necessario.', TG_TABLE_NAME
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN OLD;
END;
$$;

DO $$
DECLARE
  v_tabela TEXT;
BEGIN
  FOR v_tabela IN
    SELECT cd.tabela FROM public.classificacao_dados cd
    WHERE cd.politica = 'retencao_legal'
      AND cd.tabela IN (
        SELECT t.table_name FROM information_schema.tables t
        WHERE t.table_schema = 'public'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_bloquear_delete_retencao ON public.%I', v_tabela);
    EXECUTE format('CREATE TRIGGER trg_bloquear_delete_retencao BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_delete_retencao_legal()', v_tabela);
  END LOOP;
END $$;