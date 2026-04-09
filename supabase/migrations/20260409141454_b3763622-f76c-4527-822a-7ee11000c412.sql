
-- Step 1: Delete incorrect dashboard entries stored as clt/pj instead of 'all'
DELETE FROM role_permissions
WHERE module IN ('dashboard', 'organograma', 'movimentacoes', 'convites')
  AND colaborador_tipo IN ('clt', 'pj');

-- Step 2: Insert missing 'all' rows for general modules across all roles
INSERT INTO role_permissions (role_name, module, permission, colaborador_tipo, granted)
SELECT cr.name, m.module, p.permission, 'all', 
  CASE WHEN cr.name IN ('super_admin', 'gestor_rh') THEN true ELSE false END
FROM custom_roles cr
CROSS JOIN (VALUES ('dashboard'), ('organograma'), ('movimentacoes'), ('convites')) AS m(module)
CROSS JOIN (VALUES ('view'), ('create'), ('edit'), ('delete')) AS p(permission)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_name = cr.name AND rp.module = m.module AND rp.permission = p.permission AND rp.colaborador_tipo = 'all'
);

-- Step 3: Add RLS policy for super_admin to INSERT into role_permissions
CREATE POLICY "Super admin can insert role_permissions"
ON public.role_permissions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Step 4: Add RLS policy for super_admin to UPDATE role_permissions
CREATE POLICY "Super admin can update role_permissions"
ON public.role_permissions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
