import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin_rh: "bg-blue-100 text-blue-700 border-blue-200",
  gestor_rh: "bg-cyan-100 text-cyan-700 border-cyan-200",
  gestor_direto: "bg-teal-100 text-teal-700 border-teal-200",
  financeiro: "bg-amber-100 text-amber-700 border-amber-200",
  colaborador: "bg-slate-100 text-slate-700 border-slate-200",
};

const MATRIX_ROLES: { role: AppRole; label: string; shortLabel: string }[] = [
  { role: "super_admin", label: "Super Admin", shortLabel: "S.Admin" },
  { role: "admin_rh", label: "Admin RH", shortLabel: "Admin RH" },
  { role: "gestor_rh", label: "Gestor RH", shortLabel: "Gestor RH" },
  { role: "gestor_direto", label: "Gestor Direto", shortLabel: "G.Direto" },
  { role: "financeiro", label: "Financeiro", shortLabel: "Financeiro" },
  { role: "colaborador", label: "Colaborador", shortLabel: "Colab." },
];

interface ModuleGroup {
  group: string;
  modules: { value: string; label: string }[];
}

const MODULE_GROUPS: ModuleGroup[] = [
  {
    group: "Gestão de Pessoas",
    modules: [
      { value: "dashboard", label: "Dashboard" },
      { value: "pessoas", label: "Pessoas" },
      { value: "colaboradores", label: "Colaboradores CLT" },
      { value: "contratos_pj", label: "Contratos PJ" },
      { value: "organograma", label: "Organograma" },
    ],
  },
  {
    group: "Operações RH",
    modules: [
      { value: "convites", label: "Convites" },
      { value: "onboarding", label: "Onboarding" },
      { value: "ferias", label: "Férias" },
      { value: "beneficios", label: "Benefícios" },
      { value: "movimentacoes", label: "Movimentações" },
    ],
  },
  {
    group: "Financeiro",
    modules: [
      { value: "folha_pagamento", label: "Folha de Pagamento" },
      { value: "notas_fiscais", label: "Notas Fiscais" },
      { value: "pagamentos_pj", label: "Pagamentos PJ" },
    ],
  },
  {
    group: "Administração",
    modules: [
      { value: "parametros", label: "Parâmetros" },
      { value: "usuarios", label: "Usuários" },
    ],
  },
  {
    group: "Futuros",
    modules: [
      { value: "recrutamento", label: "Recrutamento" },
      { value: "avaliacoes", label: "Avaliações" },
      { value: "treinamentos", label: "Treinamentos" },
      { value: "relatorios", label: "Relatórios" },
    ],
  },
];

const ALL_PERMISSIONS = ["view", "create", "edit", "delete", "aprovar", "enviar", "exportar", "fechar", "enviar_email"];
const PERMISSION_LABELS: Record<string, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar",
  delete: "Deletar",
  aprovar: "Aprovar",
  enviar: "Enviar",
  exportar: "Exportar",
  fechar: "Fechar",
  enviar_email: "Enviar E-mail",
};

type PermLevel = "full" | "partial" | "none" | "super";

function getDot(level: PermLevel) {
  switch (level) {
    case "super": return "bg-purple-500";
    case "full": return "bg-emerald-500";
    case "partial": return "bg-amber-400";
    case "none": return "border-2 border-muted-foreground/30 bg-transparent";
  }
}

interface RolePermission {
  role_name: string;
  module: string;
  permission: string;
  granted: boolean;
}

interface MatrizPermissoesProps {
  onNavigateToPerfis?: () => void;
}

export default function MatrizPermissoes({ onNavigateToPerfis }: MatrizPermissoesProps) {
  const { roles: myRoles } = useAuth();
  const isSuperAdmin = myRoles.includes("super_admin");
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data: todasPermissoes, isLoading, isFetching } = useQuery({
    queryKey: ["all-role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role_name, module, permission, granted")
        .eq("granted", true);
      if (error) throw error;
      setLastUpdated(new Date());
      return (data || []) as RolePermission[];
    },
    refetchInterval: 30000,
  });

  const { data: roleCounts } = useQuery({
    queryKey: ["role-user-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r) => { counts[r.role] = (counts[r.role] || 0) + 1; });
      return counts;
    },
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["all-role-permissions"] });
    queryClient.invalidateQueries({ queryKey: ["role-user-counts"] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const perms = todasPermissoes || [];

  const getModulePerms = (roleName: string, moduleName: string) =>
    perms.filter((p) => p.role_name === roleName && p.module === moduleName);

  const getAllModulePermNames = (moduleName: string) => {
    const found = new Set<string>();
    perms.forEach((p) => { if (p.module === moduleName) found.add(p.permission); });
    return ALL_PERMISSIONS.filter((p) => found.has(p));
  };

  const getLevel = (roleName: string, moduleName: string): PermLevel => {
    if (roleName === "super_admin") return "super";
    const modulePerms = getModulePerms(roleName, moduleName);
    if (modulePerms.length === 0) return "none";
    const hasView = modulePerms.some((p) => p.permission === "view");
    const hasCreate = modulePerms.some((p) => p.permission === "create");
    const hasEdit = modulePerms.some((p) => p.permission === "edit");
    if (hasView && hasCreate && hasEdit) return "full";
    return "partial";
  };

  const getTooltipContent = (roleName: string, moduleName: string, roleLabel: string, moduleLabel: string) => {
    if (roleName === "super_admin") return `${roleLabel}: Acesso total a ${moduleLabel}`;
    const modulePerms = getModulePerms(roleName, moduleName);
    const allPermsForModule = getAllModulePermNames(moduleName);
    if (allPermsForModule.length === 0) return `${roleLabel}: Sem permissões definidas para ${moduleLabel}`;
    const grantedSet = new Set(modulePerms.map((p) => p.permission));
    const lines = allPermsForModule.map(
      (p) => `${PERMISSION_LABELS[p] || p} ${grantedSet.has(p) ? "✓" : "✗"}`
    );
    return `${roleLabel} em ${moduleLabel}:\n${lines.join(" | ")}`;
  };

  const formattedTime = lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg">Matriz de Permissões</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                Atualizado em {formattedTime} • Atualiza automaticamente a cada 30s
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRefresh}
                disabled={isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          {isSuperAdmin && onNavigateToPerfis && (
            <Button variant="outline" size="sm" className="gap-2" onClick={onNavigateToPerfis}>
              Editar permissões <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded-full bg-purple-500" /> Super Admin
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" /> Acesso completo
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-400" /> Acesso parcial
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-muted-foreground/30" /> Sem acesso
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <TooltipProvider delayDuration={200}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground min-w-[180px]">Módulo</th>
                  {MATRIX_ROLES.map((r) => (
                    <th key={r.role} className="text-center py-2 px-2 font-medium min-w-[90px]">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[r.role] || ""}`}>
                          {r.shortLabel}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {roleCounts?.[r.role] ?? 0} {(roleCounts?.[r.role] ?? 0) === 1 ? "usuário" : "usuários"}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULE_GROUPS.map((group) => (
                  <>
                    <tr key={`group-${group.group}`}>
                      <td colSpan={MATRIX_ROLES.length + 1} className="pt-4 pb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.group}
                        </span>
                      </td>
                    </tr>
                    {group.modules.map((mod) => (
                      <tr key={mod.value} className="border-b border-muted/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pr-4 font-medium">{mod.label}</td>
                        {MATRIX_ROLES.map((r) => {
                          const level = getLevel(r.role, mod.value);
                          const tip = getTooltipContent(r.role, mod.value, r.label, mod.label);
                          return (
                            <td key={r.role} className="text-center py-2.5 px-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`inline-block h-3.5 w-3.5 rounded-full cursor-default ${getDot(level)}`} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[280px] whitespace-pre-line text-xs">
                                  {tip}
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
