
-- Step 1: Add user_id column to contratos_pj
ALTER TABLE public.contratos_pj ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Step 2: Add RLS policy for PJ user to view own contract
CREATE POLICY "PJ user can view own contract"
ON public.contratos_pj
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Step 3: Add RLS policies for PJ user on dependent tables
CREATE POLICY "PJ user can view own ferias_periodos_pj"
ON public.ferias_periodos_pj
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM contratos_pj c
  WHERE c.id = ferias_periodos_pj.contrato_id AND c.user_id = auth.uid()
));

CREATE POLICY "PJ user can view own ferias_pj"
ON public.ferias_pj
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM contratos_pj c
  WHERE c.id = ferias_pj.contrato_id AND c.user_id = auth.uid()
));

CREATE POLICY "PJ user can view own notas_fiscais_pj"
ON public.notas_fiscais_pj
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM contratos_pj c
  WHERE c.id = notas_fiscais_pj.contrato_id AND c.user_id = auth.uid()
));

CREATE POLICY "PJ user can view own pagamentos_pj"
ON public.pagamentos_pj
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM contratos_pj c
  WHERE c.id = pagamentos_pj.contrato_id AND c.user_id = auth.uid()
));

-- Step 4: Update get_user_colaborador_tipo to use user_id instead of created_by
CREATE OR REPLACE FUNCTION public.get_user_colaborador_tipo(_user_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    -- Priority 1: explicit setting on profile
    (SELECT CASE p.colaborador_tipo
      WHEN 'clt' THEN ARRAY['clt']
      WHEN 'pj' THEN ARRAY['pj']
      WHEN 'ambos' THEN ARRAY['clt','pj']
      ELSE NULL
    END
    FROM profiles p WHERE p.user_id = _user_id AND p.colaborador_tipo IS NOT NULL),
    -- Priority 2: auto-detect from tables
    (SELECT ARRAY(
      SELECT DISTINCT tipo FROM (
        SELECT 'clt' AS tipo FROM colaboradores_clt WHERE user_id = _user_id
        UNION ALL
        SELECT 'pj' AS tipo FROM contratos_pj WHERE user_id = _user_id
      ) sub
    )),
    -- Fallback
    ARRAY[]::text[]
  )
$function$;
