-- Habilitar pg_net para chamadas HTTP assíncronas
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Adicionar campo para rastrear envio de email
ALTER TABLE public.contas_pagar_receber
  ADD COLUMN IF NOT EXISTS email_enviado_em TIMESTAMPTZ;

COMMENT ON COLUMN public.contas_pagar_receber.email_enviado_em IS 'Quando o email de aprovação foi enviado';

-- Trigger function: enviar email quando conta é aprovada
CREATE OR REPLACE FUNCTION public.enviar_email_apos_aprovacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_id BIGINT;
  v_url TEXT := 'https://vaxzorhqzvsnkutrlvfr.supabase.co/functions/v1/enviar-email-conta-aprovada';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheHpvcmhxenZzbmt1dHJsdmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MDM5MzEsImV4cCI6MjA5MTE3OTkzMX0.swcTnDGewlzfN_a2EIHOcy59T55Xs1rmmH8B_1rmi7s';
BEGIN
  IF NEW.status = 'aprovado'
     AND (OLD.status IS NULL OR OLD.status != 'aprovado')
     AND NEW.email_enviado_em IS NULL THEN

    SELECT net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := jsonb_build_object('contaId', NEW.id)
    ) INTO job_id;

    RAISE NOTICE 'Email job criado: %', job_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_email_apos_aprovacao ON public.contas_pagar_receber;

CREATE TRIGGER trigger_email_apos_aprovacao
  AFTER INSERT OR UPDATE OF status ON public.contas_pagar_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.enviar_email_apos_aprovacao();

COMMENT ON FUNCTION public.enviar_email_apos_aprovacao IS 'Envia email quando conta é aprovada via Edge Function';