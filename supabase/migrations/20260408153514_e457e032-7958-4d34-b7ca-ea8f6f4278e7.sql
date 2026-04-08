
-- Drop generated saldo columns and recreate as regular
ALTER TABLE public.ferias_periodos DROP COLUMN saldo;
ALTER TABLE public.ferias_periodos ADD COLUMN saldo integer DEFAULT 30;

ALTER TABLE public.ferias_periodos_pj DROP COLUMN saldo;
ALTER TABLE public.ferias_periodos_pj ADD COLUMN saldo integer DEFAULT 30;

-- Initialize saldo = dias_direito for all existing periods
UPDATE public.ferias_periodos SET saldo = dias_direito;
UPDATE public.ferias_periodos_pj SET saldo = dias_direito;

-- Function to recalculate CLT period balances
CREATE OR REPLACE FUNCTION public.recalcular_saldo_ferias_clt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _periodo_id uuid;
  _gozados integer;
  _vendidos integer;
  _direito integer;
BEGIN
  _periodo_id := COALESCE(NEW.periodo_id, OLD.periodo_id);

  SELECT COALESCE(SUM(dias), 0) INTO _gozados
  FROM ferias_programacoes
  WHERE periodo_id = _periodo_id AND tipo = 'gozo' AND status NOT IN ('cancelada');

  SELECT COALESCE(SUM(dias), 0) INTO _vendidos
  FROM ferias_programacoes
  WHERE periodo_id = _periodo_id AND tipo = 'abono_pecuniario' AND status NOT IN ('cancelada');

  SELECT dias_direito INTO _direito FROM ferias_periodos WHERE id = _periodo_id;

  UPDATE ferias_periodos
  SET dias_gozados = _gozados,
      dias_vendidos = _vendidos,
      saldo = _direito - _gozados - _vendidos,
      status = CASE
        WHEN (_gozados + _vendidos) >= _direito THEN 'completo'
        WHEN (_gozados + _vendidos) > 0 THEN 'parcial'
        WHEN periodo_fim < CURRENT_DATE THEN 'vencido'
        ELSE 'em_aberto'
      END
  WHERE id = _periodo_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for CLT
DROP TRIGGER IF EXISTS trg_recalcular_saldo_ferias_clt ON public.ferias_programacoes;
CREATE TRIGGER trg_recalcular_saldo_ferias_clt
AFTER INSERT OR UPDATE OR DELETE ON public.ferias_programacoes
FOR EACH ROW EXECUTE FUNCTION public.recalcular_saldo_ferias_clt();

-- Function to recalculate PJ period balances
CREATE OR REPLACE FUNCTION public.recalcular_saldo_ferias_pj()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _periodo_id uuid;
  _gozados integer;
  _direito integer;
BEGIN
  _periodo_id := COALESCE(NEW.periodo_pj_id, OLD.periodo_pj_id);
  IF _periodo_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(dias), 0) INTO _gozados
  FROM ferias_pj WHERE periodo_pj_id = _periodo_id AND status NOT IN ('cancelada');

  SELECT dias_direito INTO _direito FROM ferias_periodos_pj WHERE id = _periodo_id;

  UPDATE ferias_periodos_pj
  SET dias_gozados = _gozados,
      saldo = _direito - _gozados,
      status = CASE
        WHEN _gozados >= _direito THEN 'completo'
        WHEN _gozados > 0 THEN 'parcial'
        WHEN periodo_fim < CURRENT_DATE THEN 'vencido'
        ELSE 'em_aberto'
      END
  WHERE id = _periodo_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for PJ
DROP TRIGGER IF EXISTS trg_recalcular_saldo_ferias_pj ON public.ferias_pj;
CREATE TRIGGER trg_recalcular_saldo_ferias_pj
AFTER INSERT OR UPDATE OR DELETE ON public.ferias_pj
FOR EACH ROW EXECUTE FUNCTION public.recalcular_saldo_ferias_pj();

-- Recalculate existing CLT data
DO $$
DECLARE r RECORD; _goz int; _vend int; _dir int;
BEGIN
  FOR r IN SELECT DISTINCT periodo_id FROM ferias_programacoes LOOP
    SELECT COALESCE(SUM(dias),0) INTO _goz FROM ferias_programacoes WHERE periodo_id = r.periodo_id AND tipo = 'gozo' AND status NOT IN ('cancelada');
    SELECT COALESCE(SUM(dias),0) INTO _vend FROM ferias_programacoes WHERE periodo_id = r.periodo_id AND tipo = 'abono_pecuniario' AND status NOT IN ('cancelada');
    SELECT dias_direito INTO _dir FROM ferias_periodos WHERE id = r.periodo_id;
    UPDATE ferias_periodos SET dias_gozados = _goz, dias_vendidos = _vend, saldo = _dir - _goz - _vend WHERE id = r.periodo_id;
  END LOOP;
  FOR r IN SELECT DISTINCT periodo_pj_id FROM ferias_pj WHERE periodo_pj_id IS NOT NULL LOOP
    SELECT COALESCE(SUM(dias),0) INTO _goz FROM ferias_pj WHERE periodo_pj_id = r.periodo_pj_id AND status NOT IN ('cancelada');
    SELECT dias_direito INTO _dir FROM ferias_periodos_pj WHERE id = r.periodo_pj_id;
    UPDATE ferias_periodos_pj SET dias_gozados = _goz, saldo = _dir - _goz WHERE id = r.periodo_pj_id;
  END LOOP;
END $$;
