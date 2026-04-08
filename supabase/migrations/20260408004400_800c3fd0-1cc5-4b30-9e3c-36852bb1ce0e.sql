
CREATE TABLE public.colaborador_departamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores_clt(id) ON DELETE CASCADE,
  departamento TEXT NOT NULL,
  percentual_rateio NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id, departamento)
);

ALTER TABLE public.colaborador_departamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin and HR can manage colaborador_departamentos"
ON public.colaborador_departamentos FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role));

CREATE POLICY "Gestor direto can view colaborador_departamentos"
ON public.colaborador_departamentos FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_direto'::app_role));

CREATE POLICY "Colaborador can view own departamentos"
ON public.colaborador_departamentos FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM colaboradores_clt c
  WHERE c.id = colaborador_departamentos.colaborador_id AND c.user_id = auth.uid()
));

CREATE TRIGGER update_colaborador_departamentos_updated_at
BEFORE UPDATE ON public.colaborador_departamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_departamento_rateio()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(percentual_rateio), 0) INTO total
  FROM public.colaborador_departamentos
  WHERE colaborador_id = NEW.colaborador_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  total := total + NEW.percentual_rateio;
  IF total > 100.01 THEN
    RAISE EXCEPTION 'Soma dos percentuais ultrapassa 100%%. Atual: %', total;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_rateio_before_insert_update
BEFORE INSERT OR UPDATE ON public.colaborador_departamentos
FOR EACH ROW EXECUTE FUNCTION public.validate_departamento_rateio();
