-- Drop the old unique constraint that doesn't include colaborador_tipo
ALTER TABLE public.role_permissions
DROP CONSTRAINT IF EXISTS role_permissions_role_name_module_permission_key;

-- Create new unique constraint including colaborador_tipo
ALTER TABLE public.role_permissions
ADD CONSTRAINT role_permissions_role_module_perm_tipo_key
UNIQUE (role_name, module, permission, colaborador_tipo);