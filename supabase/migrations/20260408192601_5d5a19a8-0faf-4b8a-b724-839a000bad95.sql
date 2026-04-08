CREATE OR REPLACE FUNCTION public.submit_convite_cadastro(_token text, _dados jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _convite record;
BEGIN
  SELECT * INTO _convite
  FROM convites_cadastro
  WHERE token = _token;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;
  
  IF _convite.status NOT IN ('pendente', 'preenchido') THEN
    RAISE EXCEPTION 'Este convite já foi utilizado ou cancelado';
  END IF;
  
  IF _convite.expira_em < now() AND _convite.status != 'preenchido' THEN
    RAISE EXCEPTION 'Este convite expirou';
  END IF;
  
  UPDATE convites_cadastro
  SET dados_preenchidos = _dados,
      status = 'preenchido',
      preenchido_em = now()
  WHERE token = _token;
  
  -- Create notification for HR
  INSERT INTO notificacoes_rh (tipo, titulo, mensagem, link, user_id)
  VALUES (
    'cadastro_preenchido',
    _convite.nome || CASE WHEN _convite.status = 'preenchido' THEN ' atualizou o cadastro' ELSE ' preencheu o cadastro' END,
    'O ' || CASE WHEN _convite.tipo = 'clt' THEN 'colaborador CLT' ELSE 'prestador PJ' END || ' ' || _convite.nome || CASE WHEN _convite.status = 'preenchido' THEN ' atualizou os dados do formulário de pré-cadastro.' ELSE ' completou o formulário de pré-cadastro.' END,
    '/convites-cadastro',
    _convite.criado_por
  );
  
  RETURN true;
END;
$function$