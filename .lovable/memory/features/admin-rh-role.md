---
name: admin_rh role and auto gestor_direto
description: admin_rh role added to app_role enum; gestor_direto auto-assigned via trigger on gestor_direto_id
type: feature
---
- admin_rh: full RH management + sensitive data access (salary, bank data)
- gestor_direto auto-assignment: trigger on colaboradores_clt.gestor_direto_id and contratos_pj.gestor_direto_id
- user_roles.atribuido_manualmente column protects manual gestor_direto from auto-removal
- contratos_pj now has gestor_direto_id column (references profiles)
- GerenciarUsuarios shows "(auto)" badge for auto-assigned gestor_direto, with Switch to toggle manual flag
