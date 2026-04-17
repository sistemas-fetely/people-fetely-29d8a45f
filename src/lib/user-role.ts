/**
 * Role hierarchy for display label resolution.
 * Used by sidebars (App/TI/SNCF) to show the user's primary role.
 */
const ROLE_HIERARCHY: Array<{ role: string; label: string }> = [
  { role: "super_admin", label: "Super Admin" },
  { role: "admin_rh", label: "Admin RH" },
  { role: "gestor_rh", label: "Gestor RH" },
  { role: "admin_ti", label: "Admin TI" },
  { role: "recrutador", label: "Recrutador" },
  { role: "financeiro", label: "Financeiro" },
  { role: "fiscal", label: "Fiscal" },
  { role: "operacional", label: "Operacional" },
  { role: "gestor_direto", label: "Gestor Direto" },
  { role: "colaborador", label: "Colaborador" },
];

export function getHighestRoleLabel(roles: string[] = []): string {
  for (const h of ROLE_HIERARCHY) {
    if (roles.includes(h.role)) return h.label;
  }
  return "Usuário";
}
