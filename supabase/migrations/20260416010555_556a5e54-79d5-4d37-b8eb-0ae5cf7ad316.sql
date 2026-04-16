CREATE OR REPLACE FUNCTION public.submit_convite_cadastro(_token text, _dados jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _convite record;
  _was_already_preenchido boolean;
  _email_recipient text;
  _message_id text;
  _html text;
  _plain text;
  _tipo_label text;
  _cargo_text text;
  _depto_text text;
  _unsub_token text;
BEGIN
  SELECT * INTO _convite
  FROM convites_cadastro
  WHERE token = _token;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;
  
  IF _convite.status NOT IN ('pendente', 'email_enviado', 'preenchido', 'devolvido') THEN
    RAISE EXCEPTION 'Este convite já foi utilizado ou cancelado';
  END IF;
  
  IF _convite.expira_em < now() AND _convite.status NOT IN ('preenchido', 'email_enviado') THEN
    RAISE EXCEPTION 'Este convite expirou';
  END IF;

  _was_already_preenchido := (_convite.status = 'preenchido');
  
  UPDATE convites_cadastro
  SET dados_preenchidos = _dados,
      status = 'preenchido',
      preenchido_em = now()
  WHERE token = _token;
  
  INSERT INTO notificacoes_rh (tipo, titulo, mensagem, link, user_id)
  VALUES (
    'cadastro_preenchido',
    _convite.nome || CASE WHEN _was_already_preenchido THEN ' atualizou o cadastro' ELSE ' preencheu o cadastro' END,
    'O ' || CASE WHEN _convite.tipo = 'clt' THEN 'colaborador CLT' ELSE 'prestador PJ' END || ' ' || _convite.nome || CASE WHEN _was_already_preenchido THEN ' atualizou os dados do formulário de pré-cadastro.' ELSE ' completou o formulário de pré-cadastro.' END,
    '/convites-cadastro',
    _convite.criado_por
  );

  IF NOT _was_already_preenchido THEN
    _email_recipient := lower(_convite.email);
    _message_id := gen_random_uuid()::text;
    _tipo_label := CASE WHEN _convite.tipo = 'pj' THEN 'Prestador PJ' ELSE 'Colaborador CLT' END;
    _cargo_text := CASE WHEN _convite.cargo IS NOT NULL AND _convite.cargo != '' THEN ' para o cargo de ' || _convite.cargo ELSE '' END;
    _depto_text := CASE WHEN _convite.departamento IS NOT NULL AND _convite.departamento != '' THEN ' no departamento ' || _convite.departamento ELSE '' END;

    SELECT eut.token INTO _unsub_token
    FROM email_unsubscribe_tokens eut
    WHERE eut.email = _email_recipient AND eut.used_at IS NULL;

    IF _unsub_token IS NULL THEN
      _unsub_token := encode(gen_random_bytes(32), 'hex');
      INSERT INTO email_unsubscribe_tokens (token, email)
      VALUES (_unsub_token, _email_recipient)
      ON CONFLICT (email) DO NOTHING;
      SELECT eut.token INTO _unsub_token
      FROM email_unsubscribe_tokens eut
      WHERE eut.email = _email_recipient;
    END IF;

    _html := '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body style="background-color:#ffffff;font-family:''Segoe UI'',Arial,sans-serif;margin:0;padding:0;">'
      || '<div style="max-width:560px;margin:0 auto;padding:30px 25px;">'
      || '<h1 style="font-size:22px;font-weight:bold;color:#1a3a5c;margin:0 0 20px;">Cadastro Recebido!</h1>'
      || '<p style="font-size:15px;color:#3a3a4a;line-height:1.6;margin:0 0 16px;">Olá, ' || _convite.nome || '! Confirmamos o recebimento dos seus dados de pré-cadastro como <strong>' || _tipo_label || '</strong>' || _cargo_text || _depto_text || '.</p>'
      || '<p style="font-size:15px;color:#3a3a4a;line-height:1.6;margin:0 0 16px;">Nossa equipe de RH irá analisar suas informações e entrará em contato em breve com os próximos passos.</p>'
      || '<p style="font-size:15px;color:#3a3a4a;line-height:1.6;margin:0 0 16px;">Caso precise atualizar alguma informação, utilize o mesmo link recebido anteriormente.</p>'
      || '<hr style="border-color:#e5e7eb;margin:24px 0;" />'
      || '<p style="font-size:12px;color:#999999;margin:0;">Este é um e-mail automático enviado por Fetely People. Caso não reconheça esta mensagem, ignore-a.</p>'
      || '</div></body></html>';

    _plain := 'Cadastro Recebido!' || E'\n\n'
      || 'Olá, ' || _convite.nome || '! Confirmamos o recebimento dos seus dados de pré-cadastro como ' || _tipo_label || _cargo_text || _depto_text || '.' || E'\n\n'
      || 'Nossa equipe de RH irá analisar suas informações e entrará em contato em breve com os próximos passos.' || E'\n\n'
      || 'Caso precise atualizar alguma informação, utilize o mesmo link recebido anteriormente.' || E'\n\n'
      || 'Fetely People';

    INSERT INTO email_send_log (message_id, template_name, recipient_email, status)
    VALUES (_message_id, 'cadastro-recebido', _email_recipient, 'pending');

    PERFORM enqueue_email(
      'transactional_emails',
      jsonb_build_object(
        'message_id', _message_id,
        'to', _email_recipient,
        'from', 'Fetely People <noreply@notify.fetelycorp.com.br>',
        'sender_domain', 'notify.fetelycorp.com.br',
        'subject', 'Seu cadastro foi recebido com sucesso',
        'html', _html,
        'text', _plain,
        'purpose', 'transactional',
        'label', 'cadastro-recebido',
        'idempotency_key', 'cadastro-recebido-' || _convite.id,
        'unsubscribe_token', _unsub_token,
        'queued_at', now()::text
      )
    );
  END IF;
  
  RETURN true;
END;
$function$;