CREATE OR REPLACE FUNCTION public.revogar_acessos_ex_colaboradores()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total INTEGER := 0;
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT user_id, data_desligamento AS data_saida
    FROM public.colaboradores_clt
    WHERE data_desligamento IS NOT NULL
      AND data_desligamento <= CURRENT_DATE - INTERVAL '30 days'
      AND acesso_revogado_em IS NULL
      AND user_id IS NOT NULL
    UNION
    SELECT user_id, data_fim AS data_saida
    FROM public.contratos_pj
    WHERE data_fim IS NOT NULL
      AND data_fim <= CURRENT_DATE - INTERVAL '30 days'
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
        jsonb_build_object('data_saida', v_user.data_saida),
        jsonb_build_object('revogado_em', now()),
        'Revogacao automatica 30 dias apos desligamento (Regra 12)'
      );

      v_total := v_total + 1;
    END IF;
  END LOOP;

  RETURN v_total;
END;
$function$;