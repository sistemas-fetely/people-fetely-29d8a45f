
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Super admin bypasses everything
    CASE WHEN public.has_role(_user_id, 'super_admin') THEN true
    ELSE EXISTS (
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
    END
$$;
