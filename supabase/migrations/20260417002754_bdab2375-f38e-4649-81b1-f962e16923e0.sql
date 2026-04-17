ALTER TABLE public.ti_ativos
ADD COLUMN IF NOT EXISTS em_manutencao BOOLEAN DEFAULT false;

DROP TRIGGER IF EXISTS ti_ativos_condicao_change ON public.ti_ativos;

CREATE OR REPLACE FUNCTION public.ti_ativos_condicao_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.condicao = 'inativo' AND (OLD.condicao IS NULL OR OLD.condicao != 'inativo') THEN
    NEW.status = 'descartado';
    NEW.em_manutencao = false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ti_ativos_condicao_change
  BEFORE UPDATE ON public.ti_ativos
  FOR EACH ROW
  EXECUTE FUNCTION public.ti_ativos_condicao_trigger();