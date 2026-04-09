
-- Add colaborador_tipo column to role_permissions
ALTER TABLE public.role_permissions
ADD COLUMN colaborador_tipo text NOT NULL DEFAULT 'all';

-- Create function to detect user's colaborador type
CREATE OR REPLACE FUNCTION public.get_user_colaborador_tipo(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT DISTINCT tipo FROM (
      SELECT 'clt' AS tipo FROM colaboradores_clt WHERE user_id = _user_id
      UNION ALL
      SELECT 'pj' AS tipo FROM contratos_pj WHERE created_by = _user_id
    ) sub
  )
$$;

-- Update has_permission to consider colaborador_tipo
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_name = ur.role::text
    WHERE ur.user_id = _user_id
      AND rp.module = _module
      AND rp.permission = _permission
      AND rp.granted = true
      AND (rp.colaborador_tipo = 'all'
           OR rp.colaborador_tipo = ANY(public.get_user_colaborador_tipo(_user_id)))
  )
$$;
