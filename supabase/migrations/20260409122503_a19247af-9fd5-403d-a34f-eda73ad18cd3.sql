
-- Add colaborador_tipo to profiles
ALTER TABLE public.profiles
ADD COLUMN colaborador_tipo text DEFAULT NULL;

-- Update function to prioritize explicit profile setting
CREATE OR REPLACE FUNCTION public.get_user_colaborador_tipo(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
        SELECT 'pj' AS tipo FROM contratos_pj WHERE created_by = _user_id
      ) sub
    )),
    -- Fallback
    ARRAY[]::text[]
  )
$$;
