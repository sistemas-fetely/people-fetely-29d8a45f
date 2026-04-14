import { useState, useCallback, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield, ShieldCheck, Plus, ArrowLeft, Save, Trash2, Settings2,
  Eye, FilePlus, Pencil, Trash, Mail, CheckCircle, Lock, FileDown, Send,
  Users, Building2, RotateCcw, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  MODULES, MODULE_CATEGORIES, CRUD_PERMISSIONS, SPECIAL_PERMISSIONS,
  getColaboradorTipoForCategory, type RolePermission,
} from "@/hooks/usePermissions";

// ─── Constants ──────────────────────────────────────────────
const PERMISSION_ICONS: Record<string, React.ReactNode> = {
  view: <Eye className="h-3 w-3" />,
  create: <FilePlus className="h-3 w-3" />,
  edit: <Pencil className="h-3 w-3" />,
  delete: <Trash className="h-3 w-3" />,
  enviar_email: <Mail className="h-3 w-3" />,
  aprovar: <CheckCircle className="h-3 w-3" />,
  fechar: <Lock className="h-3 w-3" />,
  exportar: <FileDown className="h-3 w-3" />,
  enviar: <Send className="h-3 w-3" />,
};

const PERMISSION_SHORT: Record<string, string> = {
  view: "Ver", create: "Criar", edit: "Editar", delete: "Deletar",
  enviar_email: "Email", aprovar: "Aprovar", fechar: "Fechar", exportar: "Exportar", enviar: "Enviar",
};

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin_rh: "Admin RH",
  admin_ti: "Admin TI",
  gestor_rh: "Gestor RH",
  gestor_direto: "Gestor Direto",
  colaborador: "Colaborador",
  financeiro: "Financeiro",
  fiscal: "Fiscal",
  operacional: "Operacional",
  recrutador: "Recrutador",
};

const FUTURE_ROLES = ["admin_ti", "recrutador", "fiscal", "operacional"];
const FUTURE_ROLE_MODULES: Record<string, string> = {
  admin_ti: "Módulo TI",
  recrutador: "Módulo Recrutamento",
  fiscal: "Integração ERP",
  operacional: "Unidade Fabril",
};

const isFutureRole = (name: string) => FUTURE_ROLES.includes(name);

// ─── Matrix Cell ────────────────────────────────────────────
function PermissionDot({
  granted, locked, onClick, label,
}: { granted: boolean; locked?: boolean; onClick?: () => void; label: string }) {
  if (locked) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-7 h-7">
              <div className="w-4 h-4 rounded-full bg-purple-500 shadow-sm" />
            </div>
          </TooltipTrigger>
          <TooltipContent><p className="text-xs">{label} (bloqueado)</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className="flex items-center justify-center w-7 h-7 hover:bg-muted/50 rounded transition-colors"
          >
            {granted ? (
              <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm ring-2 ring-emerald-200" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent><p className="text-xs">{label}: {granted ? "Ativo" : "Inativo"}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Permission Matrix Table ────────────────────────────────
function PermissionMatrix({
  modules,
  tipo,
  localPermissions,
  togglePermission,
  isSuperAdminRole,
}: {
  modules: typeof MODULES[number][];
  tipo: string;
  localPermissions: Map<string, boolean>;
  togglePermission: (mod: string, perm: string, tipo: string) => void;
  isSuperAdminRole: boolean;
}) {
  // Collect all permission columns for this set of modules
  const allSpecialPerms = new Map<string, string>();
  modules.forEach((mod) => {
    SPECIAL_PERMISSIONS
      .filter((sp) => sp.module === mod.key)
      .forEach((sp) => allSpecialPerms.set(`${mod.key}:${sp.key}`, sp.label));
  });

  // Build unique extra column headers from special perms across all modules
  const specialColumns: { key: string; label: string; shortLabel: string; moduleKey: string }[] = [];
  modules.forEach((mod) => {
    SPECIAL_PERMISSIONS
      .filter((sp) => sp.module === mod.key)
      .forEach((sp) => {
        if (!specialColumns.find((c) => c.key === sp.key && c.moduleKey === mod.key)) {
          specialColumns.push({
            key: sp.key,
            label: sp.label,
            shortLabel: PERMISSION_SHORT[sp.key] || sp.key,
            moduleKey: mod.key,
          });
        }
      });
  });

  // Unique special perm keys used across the modules (for column headers)
  const uniqueSpecialKeys: string[] = [];
  const seenKeys = new Set<string>();
  specialColumns.forEach((c) => {
    if (!seenKeys.has(c.key)) {
      seenKeys.add(c.key);
      uniqueSpecialKeys.push(c.key);
    }
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground w-[180px]">Módulo</th>
            {CRUD_PERMISSIONS.map((p) => (
              <th key={p.key} className="text-center py-2 px-1 w-[50px]">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-0.5">
                        {PERMISSION_ICONS[p.key]}
                        <span className="text-[10px] text-muted-foreground">{PERMISSION_SHORT[p.key]}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{p.label}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </th>
            ))}
            {uniqueSpecialKeys.map((key) => (
              <th key={key} className="text-center py-2 px-1 w-[50px]">
                <div className="flex flex-col items-center gap-0.5">
                  {PERMISSION_ICONS[key]}
                  <span className="text-[10px] text-muted-foreground">{PERMISSION_SHORT[key]}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map((mod) => {
            const modSpecialPerms = SPECIAL_PERMISSIONS.filter((sp) => sp.module === mod.key);
            return (
              <tr key={mod.key} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="py-1.5 pr-4">
                  <span className="font-medium text-sm">{mod.label}</span>
                </td>
                {CRUD_PERMISSIONS.map((p) => {
                  const key = `${mod.key}:${p.key}:${tipo}`;
                  const granted = localPermissions.get(key) || false;
                  return (
                    <td key={p.key} className="text-center py-1.5">
                      <PermissionDot
                        granted={granted}
                        locked={isSuperAdminRole}
                        onClick={isSuperAdminRole ? undefined : () => togglePermission(mod.key, p.key, tipo)}
                        label={`${mod.label}: ${p.label}`}
                      />
                    </td>
                  );
                })}
                {uniqueSpecialKeys.map((spKey) => {
                  const hasThis = modSpecialPerms.some((sp) => sp.key === spKey);
                  if (!hasThis) {
                    return <td key={spKey} className="text-center py-1.5"><div className="w-7 h-7" /></td>;
                  }
                  const permKey = `${mod.key}:${spKey}:${tipo}`;
                  const granted = localPermissions.get(permKey) || false;
                  return (
                    <td key={spKey} className="text-center py-1.5">
                      <PermissionDot
                        granted={granted}
                        locked={isSuperAdminRole}
                        onClick={isSuperAdminRole ? undefined : () => togglePermission(mod.key, spKey, tipo)}
                        label={`${mod.label}: ${PERMISSION_SHORT[spKey]}`}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function ConfigurarPerfis() {
  const navigate = useNavigate();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles.includes("super_admin");
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomRole | null>(null);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [localPermissions, setLocalPermissions] = useState<Map<string, boolean>>(new Map());
  const [isDirty, setIsDirty] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const savedPermissionsRef = useRef<Map<string, boolean>>(new Map());

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("is_system", { ascending: false })
        .order("name");
      if (error) throw error;
      return data as CustomRole[];
    },
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["role-permissions-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*");
      if (error) throw error;
      return data as (RolePermission & { id: string })[];
    },
  });

  const loadRolePermissions = useCallback((roleName: string) => {
    const map = new Map<string, boolean>();
    permissions
      .filter((p) => p.role_name === roleName)
      .forEach((p) => map.set(`${p.module}:${p.permission}:${p.colaborador_tipo}`, p.granted));
    setLocalPermissions(map);
    savedPermissionsRef.current = new Map(map);
    setIsDirty(false);
  }, [permissions]);

  const selectRole = (roleName: string) => {
    if (isDirty && selectedRole && selectedRole !== roleName) {
      setDiscardTarget(roleName);
      return;
    }
    if (isFutureRole(roleName)) {
      toast.info(`Este perfil será ativado quando o ${FUTURE_ROLE_MODULES[roleName] || "módulo"} estiver disponível`);
      return;
    }
    setSelectedRole(roleName);
    loadRolePermissions(roleName);
  };

  const confirmDiscard = () => {
    if (discardTarget) {
      setSelectedRole(discardTarget);
      loadRolePermissions(discardTarget);
      setDiscardTarget(null);
    }
  };

  const togglePermission = (module: string, permission: string, tipo: string) => {
    const key = `${module}:${permission}:${tipo}`;
    const newMap = new Map(localPermissions);
    newMap.set(key, !newMap.get(key));
    setLocalPermissions(newMap);
    setIsDirty(true);
  };

  const resetToSaved = () => {
    setLocalPermissions(new Map(savedPermissionsRef.current));
    setIsDirty(false);
    setResetConfirm(false);
    toast.success("Permissões restauradas para o estado salvo");
  };

  const savePermissions = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      const updates = Array.from(localPermissions.entries()).map(([key, granted]) => {
        const [module, permission, colaborador_tipo] = key.split(":");
        return { role_name: selectedRole, module, permission, granted, colaborador_tipo };
      });

      for (const u of updates) {
        const { error } = await supabase
          .from("role_permissions")
          .upsert(
            {
              role_name: u.role_name,
              module: u.module,
              permission: u.permission,
              colaborador_tipo: u.colaborador_tipo,
              granted: u.granted,
            },
            { onConflict: "role_name,module,permission,colaborador_tipo" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions-config"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions-all"] });
      savedPermissionsRef.current = new Map(localPermissions);
      toast.success("Permissões salvas com sucesso!");
      setIsDirty(false);
    },
    onError: () => toast.error("Erro ao salvar permissões"),
  });

  const createRole = useMutation({
    mutationFn: async () => {
      const slug = newRole.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      const { error: insertError } = await supabase
        .from("custom_roles")
        .insert({ name: slug, description: newRole.description || null, is_system: false });
      if (insertError) throw insertError;

      const perms: { role_name: string; module: string; permission: string; granted: boolean; colaborador_tipo: string }[] = [];
      for (const mod of MODULES) {
        const tipo = getColaboradorTipoForCategory(mod.category);
        for (const perm of CRUD_PERMISSIONS) {
          perms.push({ role_name: slug, module: mod.key, permission: perm.key, granted: false, colaborador_tipo: tipo });
        }
      }
      for (const sp of SPECIAL_PERMISSIONS) {
        const mod = MODULES.find((m) => m.key === sp.module);
        const tipo = mod ? getColaboradorTipoForCategory(mod.category) : "all";
        perms.push({ role_name: slug, module: sp.module, permission: sp.key, granted: false, colaborador_tipo: tipo });
      }
      const { error: permError } = await supabase.from("role_permissions").insert(perms);
      if (permError) throw permError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions-config"] });
      toast.success("Perfil criado com sucesso!");
      setCreateOpen(false);
      setNewRole({ name: "", description: "" });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar perfil"),
  });

  const deleteRole = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("custom_roles").delete().eq("name", name);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions-config"] });
      if (selectedRole === deleteConfirm?.name) {
        setSelectedRole(null);
        setIsDirty(false);
      }
      toast.success("Perfil removido com sucesso!");
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Erro ao remover perfil"),
  });

  const currentRole = roles.find((r) => r.name === selectedRole);
  const isSuperAdminRole = selectedRole === "super_admin";

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/sem-permissao" replace />;
  }

  const geralModules = MODULES.filter((m) => m.category === "geral");
  const cltModules = MODULES.filter((m) => m.category === "clt");
  const pjModules = MODULES.filter((m) => m.category === "pj");
  const adminModules = MODULES.filter((m) => m.category === "admin");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/gerenciar-usuarios")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Configurar Perfis de Acesso</h1>
            <p className="text-sm text-muted-foreground">Defina as permissões de cada perfil do sistema</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Perfil
        </Button>
      </div>

      {/* Two-column layout with independent scroll */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Role list */}
        <div className="w-[280px] border-r shrink-0 overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">Perfis Ativos</p>
          {roles.filter((r) => !isFutureRole(r.name)).map((role) => (
            <Card
              key={role.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedRole === role.name ? "ring-2 ring-primary bg-primary/5" : ""
              }`}
              onClick={() => selectRole(role.name)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {role.is_system ? (
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ROLE_LABELS[role.name] || role.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{role.description || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {role.is_system && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Sistema</Badge>
                    )}
                    {!role.is_system && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(role); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Future roles */}
          {roles.filter((r) => isFutureRole(r.name)).length > 0 && (
            <>
              <Separator className="my-3" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">Perfis Futuros</p>
              {roles.filter((r) => isFutureRole(r.name)).map((role) => (
                <Card
                  key={role.id}
                  className="opacity-60 border-dashed cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => selectRole(role.name)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{ROLE_LABELS[role.name] || role.name}</p>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-400 text-amber-600">Em breve</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{role.description || "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Right: Permission editor */}
        <div className="flex-1 overflow-y-auto">
          {selectedRole && currentRole ? (
            <div className="p-6 space-y-6">
              {/* Header with unsaved indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{ROLE_LABELS[currentRole.name] || currentRole.name}</h2>
                      {isDirty && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Alterações não salvas
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{currentRole.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive hover:text-destructive"
                    disabled={!isDirty}
                    onClick={() => setResetConfirm(true)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Resetar
                  </Button>
                  <Button
                    className="gap-2"
                    disabled={!isDirty || savePermissions.isPending}
                    onClick={() => savePermissions.mutate()}
                  >
                    <Save className="h-4 w-4" />
                    {savePermissions.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>

              {/* Role-specific info banners */}
              {selectedRole === "super_admin" && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>Super Admin</strong> tem acesso total ao sistema. As permissões são bloqueadas (🟣) e não podem ser editadas.
                  </div>
                </div>
              )}
              {selectedRole === "colaborador" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>Premissa básica:</strong> O colaborador só tem acesso às suas próprias informações.
                    Um colaborador CLT verá apenas os módulos CLT habilitados. Um prestador PJ verá apenas os módulos PJ habilitados.
                  </div>
                </div>
              )}
              {selectedRole === "gestor_direto" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>Premissa básica:</strong> O gestor direto acessa suas informações e as de todos os seus liderados conforme o organograma.
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500 ring-1 ring-emerald-200" /> Ativo</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" /> Inativo</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500" /> Bloqueado</span>
              </div>

              {/* Geral */}
              {geralModules.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Geral</h3>
                    <Separator className="flex-1" />
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <PermissionMatrix
                        modules={geralModules}
                        tipo="all"
                        localPermissions={localPermissions}
                        togglePermission={togglePermission}
                        isSuperAdminRole={isSuperAdminRole}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* CLT + PJ side by side */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Por Tipo de Colaborador</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* CLT */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <CardTitle className="text-sm text-blue-700 dark:text-blue-400">CLT</CardTitle>
                        <Badge variant="secondary" className="text-[9px] ml-auto">Colaboradores CLT</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <PermissionMatrix
                        modules={cltModules}
                        tipo="clt"
                        localPermissions={localPermissions}
                        togglePermission={togglePermission}
                        isSuperAdminRole={isSuperAdminRole}
                      />
                    </CardContent>
                  </Card>

                  {/* PJ */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400">PJ</CardTitle>
                        <Badge variant="secondary" className="text-[9px] ml-auto">Prestadores PJ</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <PermissionMatrix
                        modules={pjModules}
                        tipo="pj"
                        localPermissions={localPermissions}
                        togglePermission={togglePermission}
                        isSuperAdminRole={isSuperAdminRole}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Admin */}
              {adminModules.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Administração</h3>
                    <Separator className="flex-1" />
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <PermissionMatrix
                        modules={adminModules}
                        tipo="all"
                        localPermissions={localPermissions}
                        togglePermission={togglePermission}
                        isSuperAdminRole={isSuperAdminRole}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecione um perfil para configurar suas permissões</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create role dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Perfil</DialogTitle>
            <DialogDescription>O perfil será criado com todas as permissões desativadas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Perfil *</Label>
              <Input
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="Ex: Analista DP"
              />
              <p className="text-[10px] text-muted-foreground">
                Será convertido em identificador: {newRole.name
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_|_$/g, "") || "..."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="Descreva as responsabilidades deste perfil"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createRole.mutate()}
              disabled={!newRole.name.trim() || createRole.isPending}
            >
              {createRole.isPending ? "Criando..." : "Criar Perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete role confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o perfil <strong>{deleteConfirm?.name}</strong>? Todas as permissões associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteRole.mutate(deleteConfirm.name)}
              disabled={deleteRole.isPending}
            >
              {deleteRole.isPending ? "Removendo..." : "Remover Perfil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard changes confirmation */}
      <AlertDialog open={!!discardTarget} onOpenChange={(open) => !open && setDiscardTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Há alterações não salvas no perfil atual. Deseja descartá-las?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>
              Descartar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset confirmation */}
      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar permissões</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai restaurar as permissões para o último estado salvo. As alterações não salvas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={resetToSaved}
            >
              Resetar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
