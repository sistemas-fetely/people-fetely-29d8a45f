-- Parte 1.1 — Campos novos
ALTER TABLE public.contratos_pj ADD COLUMN IF NOT EXISTS email_corporativo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS acesso_ativado_em TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS termo_uso_aceito_em TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS termo_uso_versao TEXT;

-- Parte 1.2 — Seed domínios corporativos
INSERT INTO public.parametros (categoria, valor, label, ordem, ativo)
VALUES
  ('dominio_corporativo', 'fetely.com.br', '@fetely.com.br', 1, true),
  ('dominio_corporativo', 'fetelycorp.com.br', '@fetelycorp.com.br', 2, true)
ON CONFLICT (categoria, valor) DO NOTHING;

-- Parte 1.3 — Função de validação
CREATE OR REPLACE FUNCTION public.validar_email_corporativo(_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_dominio TEXT;
  v_dominios_validos TEXT[];
BEGIN
  IF _email IS NULL OR _email = '' THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Email vazio');
  END IF;

  v_dominio := lower(split_part(_email, '@', 2));
  IF v_dominio = '' THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Email sem domínio');
  END IF;

  SELECT array_agg(lower(valor)) INTO v_dominios_validos
  FROM public.parametros
  WHERE categoria = 'dominio_corporativo' AND ativo = true;

  IF v_dominios_validos IS NULL OR array_length(v_dominios_validos, 1) = 0 THEN
    RETURN jsonb_build_object(
      'valido', false,
      'motivo', 'Nenhum domínio corporativo configurado. Cadastre em /parametros.'
    );
  END IF;

  IF NOT (v_dominio = ANY(v_dominios_validos)) THEN
    RETURN jsonb_build_object(
      'valido', false,
      'motivo', format('Domínio "@%s" não é corporativo. Aceitos: %s', v_dominio,
        (SELECT string_agg('@' || d, ', ') FROM unnest(v_dominios_validos) d))
    );
  END IF;

  RETURN jsonb_build_object('valido', true);
END;
$$;

COMMENT ON FUNCTION public.validar_email_corporativo IS
  'Valida se email pertence a um domínio corporativo configurado em parametros.dominio_corporativo. Retorna {valido: bool, motivo: text}.';

-- Parte 1.4 — Atualizar validar_prontidao_sistema
CREATE OR REPLACE FUNCTION public.validar_prontidao_sistema()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_qtd_cargos INT;
  v_qtd_departamentos INT;
  v_qtd_unidades INT;
  v_qtd_dominios INT;
  v_deptos_sem_perfil INT;
  v_cargos_sem_depto INT;
  v_tem_template_analista BOOLEAN;
  v_problemas jsonb := '[]'::jsonb;
  v_tem_critico BOOLEAN := false;
BEGIN
  SELECT COUNT(*) INTO v_qtd_cargos FROM public.cargos WHERE ativo = true;
  SELECT COUNT(*) INTO v_qtd_departamentos FROM public.parametros WHERE categoria = 'departamento' AND ativo = true;
  SELECT COUNT(*) INTO v_qtd_unidades FROM public.unidades WHERE ativa = true;
  SELECT COUNT(*) INTO v_qtd_dominios FROM public.parametros WHERE categoria = 'dominio_corporativo' AND ativo = true;

  SELECT COUNT(*) INTO v_deptos_sem_perfil
  FROM public.parametros
  WHERE categoria = 'departamento' AND ativo = true AND perfil_area_codigo IS NULL;

  SELECT COUNT(*) INTO v_cargos_sem_depto
  FROM public.cargos WHERE ativo = true AND departamento_id IS NULL;

  SELECT EXISTS(
    SELECT 1 FROM public.cargo_template WHERE codigo = 'analista' AND is_sistema = true AND ativo = true
  ) INTO v_tem_template_analista;

  IF v_qtd_cargos = 0 THEN
    v_problemas := v_problemas || jsonb_build_object('codigo','sem_cargos','severidade','critico','mensagem','Nenhum cargo cadastrado. Cadastre pelo menos 1 em /cargos.','link','/cargos');
    v_tem_critico := true;
  END IF;
  IF v_qtd_departamentos = 0 THEN
    v_problemas := v_problemas || jsonb_build_object('codigo','sem_departamentos','severidade','critico','mensagem','Nenhum departamento cadastrado.','link','/parametros');
    v_tem_critico := true;
  END IF;
  IF v_qtd_unidades = 0 THEN
    v_problemas := v_problemas || jsonb_build_object('codigo','sem_unidades','severidade','critico','mensagem','Nenhuma unidade cadastrada.','link','/parametros');
    v_tem_critico := true;
  END IF;
  IF v_qtd_dominios = 0 THEN
    v_problemas := v_problemas || jsonb_build_object(
      'codigo','sem_dominio_corporativo',
      'severidade','critico',
      'mensagem','Nenhum domínio corporativo configurado. Sem isso, não é possível criar usuários com acesso ao sistema.',
      'link','/parametros'
    );
    v_tem_critico := true;
  END IF;
  IF v_deptos_sem_perfil > 0 THEN
    v_problemas := v_problemas || jsonb_build_object('codigo','deptos_sem_perfil','severidade','aviso','mensagem',format('%s departamento(s) sem perfil de área mapeado.', v_deptos_sem_perfil),'link','/parametros');
  END IF;
  IF v_cargos_sem_depto > 0 THEN
    v_problemas := v_problemas || jsonb_build_object('codigo','cargos_sem_depto','severidade','aviso','mensagem',format('%s cargo(s) sem departamento vinculado.', v_cargos_sem_depto),'link','/cargos');
  END IF;
  IF NOT v_tem_template_analista THEN
    v_problemas := v_problemas || jsonb_build_object('codigo','sem_template_fallback','severidade','critico','mensagem','Template "analista" de fallback não existe.','link',null);
    v_tem_critico := true;
  END IF;

  RETURN jsonb_build_object(
    'pronto', NOT v_tem_critico,
    'stats', jsonb_build_object(
      'cargos', v_qtd_cargos,
      'departamentos', v_qtd_departamentos,
      'unidades', v_qtd_unidades,
      'dominios_corporativos', v_qtd_dominios,
      'deptos_sem_perfil', v_deptos_sem_perfil,
      'cargos_sem_depto', v_cargos_sem_depto
    ),
    'problemas', v_problemas
  );
END;
$$;

-- Parte 4.2 — Trigger marcar acesso ativado no primeiro login
CREATE OR REPLACE FUNCTION public.marcar_acesso_ativado()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL AND OLD.last_sign_in_at IS NULL THEN
    UPDATE public.profiles
    SET acesso_ativado_em = NEW.last_sign_in_at
    WHERE user_id = NEW.id AND acesso_ativado_em IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marcar_acesso_ativado ON auth.users;
CREATE TRIGGER trg_marcar_acesso_ativado
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.marcar_acesso_ativado();