import { useState, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, ArrowRight, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";
import { MODULES, MODULE_CATEGORIES } from "@/hooks/usePermissions";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin_rh: "bg-blue-100 text-blue-700 border-blue-200",
  rh: "bg-blue-100 text-blue-700 border-blue-200",
  gestor_rh: "bg-cyan-100 text-cyan-700 border-cyan-200",
  gestor_direto: "bg-teal-100 text-teal-700 border-teal-200",
  gestao_direta: "bg-teal-100 text-teal-700 border-teal-200",
  financeiro: "bg-amber-100 text-amber-700 border-amber-200",
  administrativo: "bg-slate-100 text-slate-700 border-slate-200",
  operacional: "bg-orange-100 text-orange-700 border-orange-200",
  ti: "bg-cyan-100 text-cyan-700 border-cyan-200",
  recrutamento: "bg-pink-100 text-pink-700 border-pink-200",
  recrutador: "bg-pink-100 text-pink-700 border-pink-200",
  fiscal: "bg-yellow-100 text-yellow-700 border-yellow-200",
  estagiario: "bg-violet-100 text-violet-700 border-violet-200",
  colaborador: "bg-slate-100 text-slate-700 border-slate-200",
};

const NIVEL_LABELS: Record<string, string> = {
  estagio: "estágio",
  assistente: "assistente",
  analista: "analista",
  coordenador: "coordenador",
  gerente: "gerente",
  diretor: "diretor",
};

const MATRIX_ROLES: { role: AppRole; label: string; shortLabel: string; isNew?: boolean; isLegacy?: boolean }[] = [
  { role: "super_admin", label: "Super Admin", shortLabel: "S.Admin" },
  { role: "admin_rh", label: "Admin RH (legado)", shortLabel: "Admin RH", isLegacy: true },
  { role: "rh", label: "RH", shortLabel: "RH", isNew: true },
  { role: "gestor_rh", label: "Gestor RH (legado)", shortLabel: "G.RH", isLegacy: true },
  { role: "gestor_direto", label: "Gestor Direto (legado)", shortLabel: "G.Direto", isLegacy: true },
  { role: "gestao_direta", label: "Gestão Direta", shortLabel: "Gestão", isNew: true },
  { role: "financeiro", label: "Financeiro", shortLabel: "Financ." },
  { role: "administrativo", label: "Administrativo", shortLabel: "Admin.", isNew: true },
  { role: "operacional", label: "Operacional", shortLabel: "Operac.", isNew: true },
  { role: "ti", label: "TI", shortLabel: "TI", isNew: true },
  { role: "recrutamento", label: "Recrutamento", shortLabel: "Recrut.", isNew: true },
  { role: "recrutador", label: "Recrutador (legado)", shortLabel: "Recr.L", isLegacy: true },
  { role: "fiscal", label: "Fiscal", shortLabel: "Fiscal" },
  { role: "estagiario", label: "Estagiário", shortLabel: "Estag.", isNew: true },
  { role: "colaborador", label: "Colaborador", shortLabel: "Colab." },
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

interface RolePermissionRow {
  role_name: string;
  module: string;
  permission: string;
  granted: boolean;
  nivel_minimo: string | null;
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
        .select("role_name, module, permission, granted, nivel_minimo")
        .eq("granted", true);
      if (error) throw error;
      setLastUpdated(new Date());
      return (data || []) as RolePermissionRow[];
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
    const grantedMap = new Map<string, string | null>();
    modulePerms.forEach((p) => grantedMap.set(p.permission, p.nivel_minimo));
    const lines = allPermsForModule.map((p) => {
      const has = grantedMap.has(p);
      const nivel = has ? grantedMap.get(p) : null;
      const suffix = nivel ? ` (mín. ${NIVEL_LABELS[nivel] || nivel})` : "";
      return `${PERMISSION_LABELS[p] || p} ${has ? "✓" : "✗"}${suffix}`;
    });
    return `${roleLabel} em ${moduleLabel}:\n${lines.join("\n")}`;
  };

  const formattedTime = lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Group MODULES by category preserving MODULE_CATEGORIES order
  const moduleGroups = MODULE_CATEGORIES
    .map((cat) => ({
      category: cat,
      modules: MODULES.filter((m) => m.category === cat.key),
    }))
    .filter((g) => g.modules.length > 0);

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
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <p className="font-semibold">Matriz atualizada com 16 perfis e 6 níveis hierárquicos</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-800/90 dark:text-blue-300/90">
              <li>Perfis marcados como <span className="font-medium">Legado</span> serão substituídos pelos novos equivalentes (rh, gestao_direta, ti, recrutamento).</li>
              <li>Perfis <span className="font-medium">Novos</span> suportam granularidade por nível (ex.: "Fechar competência" só a partir de Coordenador).</li>
              <li>Passe o mouse nas células para ver detalhes de nível mínimo exigido.</li>
            </ul>
          </div>
        </div>
        <div className="overflow-x-auto">
          <TooltipProvider delayDuration={200}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground min-w-[200px] sticky left-0 bg-background z-10">Módulo</th>
                  {MATRIX_ROLES.map((r) => (
                    <th key={r.role} className="text-center py-2 px-2 font-medium min-w-[90px]">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[r.role] || ""}`}>
                          {r.shortLabel}
                        </Badge>
                        {r.isNew && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-emerald-400 text-emerald-700">
                            Nova
                          </Badge>
                        )}
                        {r.isLegacy && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-400 text-amber-700">
                            Legado
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {roleCounts?.[r.role] ?? 0} {(roleCounts?.[r.role] ?? 0) === 1 ? "usuário" : "usuários"}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moduleGroups.map((group) => (
                  <Fragment key={`group-${group.category.key}`}>
                    <tr>
                      <td colSpan={MATRIX_ROLES.length + 1} className="pt-4 pb-1 sticky left-0 bg-background">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${group.category.color}`}>
                          {group.category.label}
                        </span>
                      </td>
                    </tr>
                    {group.modules.map((mod) => (
                      <tr key={mod.key} className="border-b border-muted/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pr-4 font-medium sticky left-0 bg-background">{mod.label}</td>
                        {MATRIX_ROLES.map((r) => {
                          const level = getLevel(r.role, mod.key);
                          const tip = getTooltipContent(r.role, mod.key, r.label, mod.label);
                          return (
                            <td key={r.role} className="text-center py-2.5 px-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`inline-block h-3.5 w-3.5 rounded-full cursor-default ${getDot(level)}`} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[320px] whitespace-pre-line text-xs">
                                  {tip}
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
