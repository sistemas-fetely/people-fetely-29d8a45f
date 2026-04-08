
-- Create posicoes table for org chart
CREATE TABLE public.posicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo_cargo TEXT NOT NULL,
  nivel_hierarquico INTEGER NOT NULL DEFAULT 1,
  departamento TEXT NOT NULL,
  area TEXT,
  filial TEXT DEFAULT 'Matriz',
  status TEXT NOT NULL DEFAULT 'vaga_aberta' CHECK (status IN ('ocupado', 'vaga_aberta', 'previsto')),
  id_pai UUID REFERENCES public.posicoes(id) ON DELETE SET NULL,
  colaborador_id UUID REFERENCES public.colaboradores_clt(id) ON DELETE SET NULL,
  contrato_pj_id UUID REFERENCES public.contratos_pj(id) ON DELETE SET NULL,
  salario_previsto NUMERIC,
  centro_custo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posicoes ENABLE ROW LEVEL SECURITY;

-- Super admin and HR can do everything
CREATE POLICY "Super admin and HR can manage posicoes"
ON public.posicoes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role));

-- Gestor direto can view
CREATE POLICY "Gestor direto can view posicoes"
ON public.posicoes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor_direto'::app_role));

-- Financeiro can view
CREATE POLICY "Financeiro can view posicoes"
ON public.posicoes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role));

-- Colaborador can view
CREATE POLICY "Colaborador can view posicoes"
ON public.posicoes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'colaborador'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_posicoes_updated_at
BEFORE UPDATE ON public.posicoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Recursive function to get org tree
CREATE OR REPLACE FUNCTION public.get_organograma_tree()
RETURNS TABLE (
  id UUID,
  titulo_cargo TEXT,
  nivel_hierarquico INTEGER,
  departamento TEXT,
  area TEXT,
  filial TEXT,
  status TEXT,
  id_pai UUID,
  colaborador_id UUID,
  contrato_pj_id UUID,
  salario_previsto NUMERIC,
  centro_custo TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  depth INTEGER,
  path UUID[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT p.id, p.titulo_cargo, p.nivel_hierarquico, p.departamento, p.area, p.filial,
           p.status, p.id_pai, p.colaborador_id, p.contrato_pj_id, p.salario_previsto,
           p.centro_custo, p.created_at, p.updated_at,
           0 AS depth,
           ARRAY[p.id] AS path
    FROM posicoes p
    WHERE p.id_pai IS NULL
    UNION ALL
    SELECT p.id, p.titulo_cargo, p.nivel_hierarquico, p.departamento, p.area, p.filial,
           p.status, p.id_pai, p.colaborador_id, p.contrato_pj_id, p.salario_previsto,
           p.centro_custo, p.created_at, p.updated_at,
           t.depth + 1,
           t.path || p.id
    FROM posicoes p
    INNER JOIN tree t ON p.id_pai = t.id
  )
  SELECT * FROM tree ORDER BY path;
$$;
