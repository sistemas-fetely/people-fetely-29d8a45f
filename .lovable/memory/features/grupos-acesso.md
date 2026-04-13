---
name: Grupos de Acesso
description: Auto-assigns portal roles to employees upon activation via grupos_acesso table and create-portal-access edge function
type: feature
---
- Table `grupos_acesso`: nome, tipo_colaborador (clt/pj/ambos), role_automatico, is_system, ativo
- 5 system groups: Colaborador CLT, Colaborador PJ, Gestor Direto, Admin RH, Financeiro
- `convites_cadastro.grupo_acesso_id` links invite to access group
- Edge Function `create-portal-access`: action=activate (creates auth user, assigns role, sends welcome email) / action=revoke (bans user, records revogado_em)
- ColaboradorDetalhe calls activate on status→ativo, revoke on status→desligado
- ContratoPJDetalhe calls activate on status→ativo, revoke on status→encerrado
- UI: Parametros page tab "Grupos de Acesso" at /parametros?modulo=grupos_acesso
- Transactional email template: boas-vindas-portal (sends temp password + portal link)
