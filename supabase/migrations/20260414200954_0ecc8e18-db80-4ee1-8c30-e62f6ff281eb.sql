
-- 1. Criar tabela cargos
CREATE TABLE IF NOT EXISTS public.cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  nivel TEXT NOT NULL,
  departamento TEXT,
  tipo_contrato TEXT NOT NULL DEFAULT 'ambos',
  is_clevel BOOLEAN DEFAULT false,
  protege_salario BOOLEAN DEFAULT false,
  faixa_clt_f1_min NUMERIC, faixa_clt_f1_max NUMERIC,
  faixa_clt_f2_min NUMERIC, faixa_clt_f2_max NUMERIC,
  faixa_clt_f3_min NUMERIC, faixa_clt_f3_max NUMERIC,
  faixa_clt_f4_min NUMERIC, faixa_clt_f4_max NUMERIC,
  faixa_clt_f5_min NUMERIC, faixa_clt_f5_max NUMERIC,
  faixa_pj_f1_min NUMERIC, faixa_pj_f1_max NUMERIC,
  faixa_pj_f2_min NUMERIC, faixa_pj_f2_max NUMERIC,
  faixa_pj_f3_min NUMERIC, faixa_pj_f3_max NUMERIC,
  faixa_pj_f4_min NUMERIC, faixa_pj_f4_max NUMERIC,
  faixa_pj_f5_min NUMERIC, faixa_pj_f5_max NUMERIC,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Validation triggers instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_cargo_nivel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.nivel NOT IN ('jr','pl','sr','coordenacao','especialista','c_level') THEN
    RAISE EXCEPTION 'nível de cargo inválido: %', NEW.nivel;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cargo_nivel
BEFORE INSERT OR UPDATE ON public.cargos
FOR EACH ROW EXECUTE FUNCTION public.validate_cargo_nivel();

CREATE OR REPLACE FUNCTION public.validate_cargo_tipo_contrato()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tipo_contrato NOT IN ('clt','pj','ambos') THEN
    RAISE EXCEPTION 'tipo_contrato de cargo inválido: %', NEW.tipo_contrato;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cargo_tipo_contrato
BEFORE INSERT OR UPDATE ON public.cargos
FOR EACH ROW EXECUTE FUNCTION public.validate_cargo_tipo_contrato();

-- updated_at trigger
CREATE TRIGGER update_cargos_updated_at
BEFORE UPDATE ON public.cargos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RLS
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view cargos"
ON public.cargos FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admin can manage cargos"
ON public.cargos FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'super_admin'::app_role) OR
  public.has_role(auth.uid(),'admin_rh'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(),'super_admin'::app_role) OR
  public.has_role(auth.uid(),'admin_rh'::app_role)
);

-- 3. Popular tabela cargos
INSERT INTO public.cargos (nome,nivel,departamento,tipo_contrato,is_clevel,protege_salario,
  faixa_clt_f1_min,faixa_clt_f1_max,faixa_clt_f2_min,faixa_clt_f2_max,faixa_clt_f3_min,faixa_clt_f3_max,faixa_clt_f4_min,faixa_clt_f4_max,faixa_clt_f5_min,faixa_clt_f5_max,
  faixa_pj_f1_min,faixa_pj_f1_max,faixa_pj_f2_min,faixa_pj_f2_max,faixa_pj_f3_min,faixa_pj_f3_max,faixa_pj_f4_min,faixa_pj_f4_max,faixa_pj_f5_min,faixa_pj_f5_max)
VALUES
('CEO','c_level','Diretoria','ambos',true,true, null,null,null,null,null,null,null,null,null,null, null,null,null,null,null,null,null,null,null,null),
('COO','c_level','Diretoria','ambos',true,true, 18000,25000,25001,35000,35001,45000,45001,60000,60001,85000, 22000,30000,30001,40000,40001,52000,52001,65000,65001,90000),
('CFO','c_level','Financeiro','ambos',true,true, 18000,25000,25001,33000,33001,42000,42001,55000,55001,80000, 22000,30000,30001,40000,40001,50000,50001,65000,65001,85000),
('CMO','c_level','Marketing','ambos',true,true, 15000,22000,22001,30000,30001,40000,40001,52000,52001,75000, 18000,26000,26001,35000,35001,45000,45001,58000,58001,80000),
('Coordenador de Designer','coordenacao','Design','ambos',false,false, 6000,8000,8001,10500,10501,13500,13501,17000,17001,22000, 7500,10000,10001,13500,13501,17000,17001,21000,21001,28000),
('Coordenador de Produto','coordenacao','Produto','ambos',false,false, 6000,8000,8001,10500,10501,13500,13501,17000,17001,22000, 7500,10000,10001,13500,13501,17000,17001,21000,21001,28000),
('Coordenador de Branding','coordenacao','Marketing','ambos',false,false, 6000,8000,8001,10500,10501,13500,13501,17000,17001,22000, 7500,10000,10001,13500,13501,17000,17001,21000,21001,28000),
('Coordenador de Logística','coordenacao','Logística','clt',false,false, 4500,6000,6001,7800,7801,10000,10001,13000,13001,17000, null,null,null,null,null,null,null,null,null,null),
('Analista Design Jr','jr','Design','ambos',false,false, 2200,2900,2901,3700,3701,4800,4801,6200,6201,8200, 2800,3700,3701,4700,4701,6200,6201,8000,8001,11000),
('Analista de Design Pl','pl','Design','ambos',false,false, 3200,4200,4201,5400,5401,7000,7001,9000,9001,12000, 4000,5300,5301,6800,6801,8800,8801,11500,11501,16000),
('Analista de Design Sr','sr','Design','ambos',false,false, 4500,6000,6001,7800,7801,10000,10001,13000,13001,17000, 6000,8000,8001,10500,10501,13500,13501,17000,17001,23000),
('Analista de Branding Jr','jr','Marketing','ambos',false,false, 2200,2900,2901,3700,3701,4800,4801,6200,6201,8200, 2800,3700,3701,4700,4701,6200,6201,8000,8001,11000),
('Analista de Branding Pl','pl','Marketing','ambos',false,false, 3200,4200,4201,5400,5401,7000,7001,9000,9001,12000, 4000,5300,5301,6800,6801,8800,8801,11500,11501,16000),
('Analista de Produto Jr','jr','Produto','ambos',false,false, 2200,2900,2901,3700,3701,4800,4801,6200,6201,8200, 2800,3700,3701,4700,4701,6200,6201,8000,8001,11000),
('Analista de Produto Pl','pl','Produto','ambos',false,false, 3500,4500,4501,5800,5801,7500,7501,10000,10001,13000, 4500,6000,6001,7800,7801,10000,10001,13000,13001,17000),
('Analista de Produto Sr','sr','Produto','ambos',false,false, 5000,6500,6501,8500,8501,11000,11001,14000,14001,18000, 6500,8500,8501,11000,11001,14000,14001,18000,18001,24000),
('Analista RH Jr','jr','RH','ambos',false,false, 2500,3200,3201,4000,4001,5000,5001,6500,6501,8500, 3000,3900,3901,5000,5001,6500,6501,8500,8501,11000),
('Analista RH Pl','pl','RH','ambos',false,false, 3500,4500,4501,5500,5501,7000,7001,9000,9001,12000, 4500,5800,5801,7500,7501,9500,9501,12000,12001,16000),
('Analista Comercial Jr','jr','Comercial','clt',false,false, 2500,3200,3201,4000,4001,5200,5201,6800,6801,9000, null,null,null,null,null,null,null,null,null,null),
('Analista Comercial Pl','pl','Comercial','clt',false,false, 3500,4500,4501,5800,5801,7500,7501,10000,10001,13000, null,null,null,null,null,null,null,null,null,null),
('Especialista Key Account','especialista','Comercial','ambos',false,false, 5000,6500,6501,8500,8501,11000,11001,14000,14001,18000, 6500,8500,8501,11000,11001,14000,14001,18000,18001,24000),
('Analista de Marketing Pl','pl','Marketing','ambos',false,false, 3500,4500,4501,5800,5801,7500,7501,10000,10001,13000, 4500,6000,6001,7800,7801,10000,10001,13000,13001,17000),
('Social Media / Content','especialista','Marketing','ambos',false,false, 2500,3500,3501,4500,4501,6000,6001,8000,8001,11000, 3000,4200,4201,5500,5501,7500,7501,10000,10001,14000),
('Analista de Sistemas Pl','pl','TI','ambos',false,false, 5000,6500,6501,8500,8501,11000,11001,14000,14001,18000, 6500,8500,8501,11000,11001,14000,14001,18000,18001,25000),
('Supervisor de Produção','especialista','Operacional','clt',false,false, 3500,4500,4501,5800,5801,7500,7501,10000,10001,13000, null,null,null,null,null,null,null,null,null,null),
('Analista de Logística Pl','pl','Logística','clt',false,false, 2800,3600,3601,4600,4601,6000,6001,7800,7801,10500, null,null,null,null,null,null,null,null,null,null),
('Analista de Qualidade Pl','pl','Qualidade','clt',false,false, 3000,3900,3901,5000,5001,6500,6501,8500,8501,11500, null,null,null,null,null,null,null,null,null,null)
ON CONFLICT (nome) DO NOTHING;

-- 4. Adicionar cargo_id em colaboradores_clt
ALTER TABLE public.colaboradores_clt 
ADD COLUMN IF NOT EXISTS cargo_id UUID REFERENCES public.cargos(id);

UPDATE public.colaboradores_clt c
SET cargo_id = cg.id
FROM public.cargos cg
WHERE c.cargo = cg.nome AND c.cargo_id IS NULL;

-- 5. Adicionar cargo_id em contratos_pj
ALTER TABLE public.contratos_pj
ADD COLUMN IF NOT EXISTS cargo_id UUID REFERENCES public.cargos(id);

UPDATE public.contratos_pj cp
SET cargo_id = cg.id
FROM public.cargos cg
WHERE cp.tipo_servico = cg.nome AND cp.cargo_id IS NULL;

-- 6. Adicionar cargo_id em vagas
ALTER TABLE public.vagas
ADD COLUMN IF NOT EXISTS cargo_id UUID REFERENCES public.cargos(id);

UPDATE public.vagas v
SET cargo_id = cg.id
FROM public.cargos cg
WHERE v.titulo = cg.nome AND v.cargo_id IS NULL;
