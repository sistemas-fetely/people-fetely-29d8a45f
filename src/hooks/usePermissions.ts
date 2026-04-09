import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RolePermission {
  role_name: string;
  module: string;
  permission: string;
  granted: boolean;
  colaborador_tipo: string;
}

const MODULES = [
  // Geral
  { key: "dashboard", label: "Dashboard", category: "geral" },
  { key: "organograma", label: "Organograma", category: "geral" },
  { key: "movimentacoes", label: "Movimentações", category: "geral" },
  { key: "recrutamento", label: "Recrutamento", category: "geral" },
  { key: "avaliacoes", label: "Avaliações", category: "geral" },
  { key: "treinamentos", label: "Treinamentos", category: "geral" },
  { key: "relatorios", label: "Relatórios", category: "geral" },
  // CLT
  { key: "colaboradores", label: "Colaboradores", category: "clt" },
  { key: "folha_pagamento", label: "Folha de Pagamento", category: "clt" },
  { key: "ferias", label: "Férias", category: "clt" },
  { key: "beneficios", label: "Benefícios", category: "clt" },
  // PJ
  { key: "contratos_pj", label: "Contratos", category: "pj" },
  { key: "notas_fiscais", label: "Notas Fiscais", category: "pj" },
  { key: "pagamentos_pj", label: "Pagamentos", category: "pj" },
  // Administração
  { key: "convites", label: "Convites de Cadastro", category: "admin" },
  { key: "parametros", label: "Parâmetros", category: "admin" },
  { key: "usuarios", label: "Gerenciar Usuários", category: "admin" },
] as const;

const MODULE_CATEGORIES = [
  { key: "geral", label: "Geral", color: "text-foreground" },
  { key: "clt", label: "CLT", color: "text-blue-700 dark:text-blue-400" },
  { key: "pj", label: "PJ", color: "text-emerald-700 dark:text-emerald-400" },
  { key: "admin", label: "Administração", color: "text-amber-700 dark:text-amber-400" },
] as const;

const CRUD_PERMISSIONS = [
  { key: "view", label: "Visualizar" },
  { key: "create", label: "Criar" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Deletar" },
] as const;

const SPECIAL_PERMISSIONS = [
  { key: "enviar_email", label: "Enviar por Email", module: "notas_fiscais" },
  { key: "aprovar", label: "Aprovar", module: "ferias" },
  { key: "fechar", label: "Fechar Competência", module: "folha_pagamento" },
  { key: "exportar", label: "Exportar", module: "folha_pagamento" },
  { key: "enviar", label: "Enviar Convite", module: "convites" },
] as const;

/** Returns the colaborador_tipo expected for a given module category */
function getColaboradorTipoForCategory(category: string): string {
  if (category === "clt") return "clt";
  if (category === "pj") return "pj";
  return "all";
}

export { MODULES, MODULE_CATEGORIES, CRUD_PERMISSIONS, SPECIAL_PERMISSIONS, getColaboradorTipoForCategory };

export function usePermissions() {
  const { user } = useAuth();

  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc("get_user_roles", { _user_id: user.id });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ["role-permissions-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role_name, module, permission, granted, colaborador_tipo");
      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!user?.id,
  });

  // Detect user's tipo based on tables (cached)
  const { data: userTipos = [] } = useQuery({
    queryKey: ["user-colaborador-tipo", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const results: string[] = [];
      const [cltRes, pjRes] = await Promise.all([
        supabase.from("colaboradores_clt").select("id").eq("user_id", user.id).limit(1),
        supabase.from("contratos_pj").select("id").eq("created_by", user.id).limit(1),
      ]);
      if (cltRes.data?.length) results.push("clt");
      if (pjRes.data?.length) results.push("pj");
      return results;
    },
    enabled: !!user?.id,
  });

  const isSuperAdmin = userRoles.includes("super_admin" as any);

  const hasPermission = (module: string, permission: string): boolean => {
    // Super Admin bypasses all permission checks
    if (isSuperAdmin) return true;
    if (!userRoles.length || !allPermissions.length) return false;
    return allPermissions.some(
      (p) =>
        userRoles.includes(p.role_name as any) &&
        p.module === module &&
        p.permission === permission &&
        p.granted &&
        (p.colaborador_tipo === "all" || userTipos.includes(p.colaborador_tipo))
    );
  };

  const canView = (module: string) => hasPermission(module, "view");
  const canCreate = (module: string) => hasPermission(module, "create");
  const canEdit = (module: string) => hasPermission(module, "edit");
  const canDelete = (module: string) => hasPermission(module, "delete");

  return {
    userRoles,
    userTipos,
    allPermissions,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    isLoading: !allPermissions.length && !!user?.id,
  };
}
