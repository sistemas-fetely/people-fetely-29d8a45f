
CREATE TABLE IF NOT EXISTS public.pcs_faixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  f1_min NUMERIC, f1_max NUMERIC,
  f2_min NUMERIC, f2_max NUMERIC,
  f3_min NUMERIC, f3_max NUMERIC,
  f4_min NUMERIC, f4_max NUMERIC,
  f5_min NUMERIC, f5_max NUMERIC,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_pcs_faixas_tipo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.tipo NOT IN ('clt', 'pj') THEN
    RAISE EXCEPTION 'tipo inválido: %. Deve ser clt ou pj', NEW.tipo;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_pcs_faixas_tipo
BEFORE INSERT OR UPDATE ON public.pcs_faixas
FOR EACH ROW EXECUTE FUNCTION public.validate_pcs_faixas_tipo();

ALTER TABLE public.pcs_faixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view pcs_faixas"
ON public.pcs_faixas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'super_admin') OR
  public.has_role(auth.uid(),'admin_rh') OR
  public.has_role(auth.uid(),'gestor_rh')
);

INSERT INTO public.pcs_faixas
(cargo,tipo,f1_min,f1_max,f2_min,f2_max,f3_min,f3_max,f4_min,f4_max,f5_min,f5_max)
VALUES
('Analista Design Jr','clt',2200,2900,2901,3700,3701,4800,4801,6200,6201,8200),
('Analista Design Jr','pj',2800,3700,3701,4700,4701,6200,6201,8000,8001,11000),
('Analista de Design Pl','clt',3200,4200,4201,5400,5401,7000,7001,9000,9001,12000),
('Analista de Design Pl','pj',4000,5300,5301,6800,6801,8800,8801,11500,11501,16000),
('Analista de Design Sr','clt',4500,6000,6001,7800,7801,10000,10001,13000,13001,17000),
('Coordenador de Designer','clt',6000,8000,8001,10500,10501,13500,13501,17000,17001,22000),
('Coordenador de Designer','pj',7500,10000,10001,13500,13501,17000,17001,21000,21001,28000),
('Analista de Branding Jr','clt',2200,2900,2901,3700,3701,4800,4801,6200,6201,8200),
('Analista de Branding Jr','pj',2800,3700,3701,4700,4701,6200,6201,8000,8001,11000),
('Analista de Branding Pl','clt',3200,4200,4201,5400,5401,7000,7001,9000,9001,12000),
('Analista de Produto Jr','clt',2200,2900,2901,3700,3701,4800,4801,6200,6201,8200),
('Analista de Produto Pl','clt',3500,4500,4501,5800,5801,7500,7501,10000,10001,13000),
('Analista de Produto Sr','clt',5000,6500,6501,8500,8501,11000,11001,14000,14001,18000),
('Analista RH Pl','clt',3500,4500,4501,5500,5501,7000,7001,9000,9001,12000),
('Analista RH Jr','clt',2500,3200,3201,4000,4001,5000,5001,6500,6501,8500),
('Analista Comercial Jr','clt',2500,3200,3201,4000,4001,5200,5201,6800,6801,9000),
('Analista Comercial Pl','clt',3500,4500,4501,5800,5801,7500,7501,10000,10001,13000),
('Especialista Key Account','clt',5000,6500,6501,8500,8501,11000,11001,14000,14001,18000),
('Especialista Key Account','pj',6500,8500,8501,11000,11001,14000,14001,18000,18001,24000),
('Social Media / Content','clt',2500,3500,3501,4500,4501,6000,6001,8000,8001,11000),
('Social Media / Content','pj',3000,4200,4201,5500,5501,7500,7501,10000,10001,14000),
('Analista de Sistemas Pl','clt',5000,6500,6501,8500,8501,11000,11001,14000,14001,18000),
('Analista de Sistemas Pl','pj',6500,8500,8501,11000,11001,14000,14001,18000,18001,25000),
('Supervisor de Produção','clt',3500,4500,4501,5800,5801,7500,7501,10000,10001,13000),
('COO','clt',18000,25000,25001,35000,35001,45000,45001,60000,60001,85000),
('COO','pj',22000,30000,30001,40000,40001,52000,52001,65000,65001,90000);
