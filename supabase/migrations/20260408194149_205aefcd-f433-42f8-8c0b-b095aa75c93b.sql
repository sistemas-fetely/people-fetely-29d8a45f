
CREATE OR REPLACE FUNCTION public.submit_convite_cadastro(_token text, _dados jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _convite record;
  _email_recipient text;
  _message_id text;
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

  -- Send "cadastro recebido" email to candidate
  _email_recipient := _convite.email;
  _message_id := gen_random_uuid()::text;

  -- Log pending
  INSERT INTO email_send_log (message_id, template_name, recipient_email, status)
  VALUES (_message_id, 'cadastro-recebido', _email_recipient, 'pending');

  -- Enqueue transactional email
  PERFORM enqueue_email(
    'transactional_emails',
    jsonb_build_object(
      'message_id', _message_id,
      'to', _email_recipient,
      'from', 'Fetely People <noreply@notify.fetelycorp.com.br>',
      'sender_domain', 'notify.fetelycorp.com.br',
      'subject', 'Seu cadastro foi recebido com sucesso',
      'template_name', 'cadastro-recebido',
      'template_data', jsonb_build_object(
        'nome', _convite.nome,
        'tipo', _convite.tipo,
        'cargo', COALESCE(_convite.cargo, ''),
        'departamento', COALESCE(_convite.departamento, '')
      ),
      'purpose', 'transactional',
      'label', 'cadastro-recebido',
      'idempotency_key', 'cadastro-recebido-' || _convite.id || '-' || extract(epoch from now())::text,
      'queued_at', now()::text
    )
  );
  
  RETURN true;
END;
$function$;
