
-- Function to auto-create ferias periodo on new colaborador
CREATE OR REPLACE FUNCTION public.auto_criar_periodo_ferias()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ferias_periodos (
    colaborador_id,
    periodo_inicio,
    periodo_fim,
    dias_direito,
    status
  ) VALUES (
    NEW.id,
    NEW.data_admissao,
    (NEW.data_admissao::date + INTERVAL '365 days')::date,
    30,
    'em_aberto'
  );
  RETURN NEW;
END;
$$;

-- Trigger on colaboradores_clt insert
CREATE TRIGGER trg_auto_criar_periodo_ferias
AFTER INSERT ON public.colaboradores_clt
FOR EACH ROW
EXECUTE FUNCTION public.auto_criar_periodo_ferias();
