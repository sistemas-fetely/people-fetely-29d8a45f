import { useState, useCallback, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  Shield, ShieldCheck, Plus, Save, Trash2, Settings2,
  Eye, FilePlus, Pencil, Trash, Mail, CheckCircle, Lock, FileDown, Send,
  RotateCcw, AlertTriangle, Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  MODULES, MODULE_CATEGORIES, CRUD_PERMISSIONS, SPECIAL_PERMISSIONS,
  getColaboradorTipoForCategory, type RolePermission,
} from "@/hooks/usePermissions";

// ─── Action metadata ────────────────────────────────────────
const ACOES_ESPECIAIS_POR_MODULO: Record<string, string[]> = {
  ferias: ["aprovar"],
  notas_fiscais: ["aprovar", "enviar_email"],
  folha_pagamento: ["fechar", "exportar"],
  pagamentos_pj: ["aprovar", "exportar"],
  convites: ["enviar"],
  relatorios: ["exportar"],
};

const ACAO_LABELS: Record<string, string> = {
  view: "Ver",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  aprovar: "Aprovar",
  fechar: "Fechar",
  exportar: "Exportar",
  enviar: "Enviar",
  enviar_email: "E-mail",
};

const ACAO_ICONES: Record<string, React.ReactNode> = {
  view: <Eye className="h-3 w-3" />,
  create: <FilePlus className="h-3 w-3" />,
  edit: <Pencil className="h-3 w-3" />,
  delete: <Trash className="h-3 w-3" />,
  aprovar: <CheckCircle className="h-3 w-3" />,
  fechar: <Lock className="h-3 w-3" />,
  exportar: <FileDown className="h-3 w-3" />,
  enviar: <Send className="h-3 w-3" />,
  enviar_email: <Mail className="h-3 w-3" />,
};

function getAcoesDoModulo(moduleKey: string): string[] {
  const base = ["view", "create", "edit", "delete"];
  const especiais = ACOES_ESPECIAIS_POR_MODULO[moduleKey] || [];
  return [...base, ...especiais];
}

// Módulos sensíveis (mesma referência usada na Matriz)
const MODULOS_SENSIVEIS = new Set([
  "folha_pagamento", "pagamentos_pj", "notas_fiscais",
  "colaboradores", "contratos_pj", "usuarios",
]);

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
  diretoria_executiva: "Diretoria Executiva",
  rh: "RH",
  gestao_direta: "Gestão Direta",
  financeiro: "Financeiro",
  administrativo: "Administrativo",
  operacional: "Operacional",
  ti: "TI",
  recrutamento: "Recrutamento",
  fiscal: "Fiscal",
  estagiario: "Estagiário",
  colaborador: "Colaborador",
};

const NIVEIS = [
  { value: "any", label: "Qualquer nível" },
  { value: "estagio", label: "Estágio" },
  { value: "assistente", label: "Assistente" },
  { value: "analista", label: "Analista" },
  { value: "coordenador", label: "Coordenador" },
  { value: "gerente", label: "Gerente" },
  { value: "diretor", label: "Diretor" },
];

const NIVEL_SHORT: Record<string, string> = {
  estagio: "EST", assistente: "ASS", analista: "ANA",
  coordenador: "COO", gerente: "GER", diretor: "DIR",
};

// Roles que aceitam níveis (não faz sentido para super_admin / colaborador comum)
const ROLES_COM_NIVEIS = new Set([
  "rh", "ti", "financeiro", "administrativo", "operacional", "fiscal",
  "recrutamento", "gestao_direta",
]);

// (Roles legadas foram aposentadas. Mantemos sets vazios para compat de código.)
const NEW_ROLES = new Set<string>();
const LEGACY_ROLES = new Set<string>();


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

// ─── Permission Cell (toggle + nivel select) ──────────────
function PermissionCell({
  granted,
  nivel,
  locked,
  showNivel,
  onToggle,
  onNivelChange,
}: {
  granted: boolean;
  nivel: string | null;
  locked?: boolean;
  showNivel: boolean;
  onToggle: (v: boolean) => void;
  onNivelChange: (n: string | null) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Switch
        checked={granted}
        disabled={locked}
        onCheckedChange={onToggle}
        className="scale-75"
      />
      {granted && showNivel && !locked && (
        <Select
          value={nivel ?? "any"}
          onValueChange={(v) => onNivelChange(v === "any" ? null : v)}
        >
          <SelectTrigger className="h-6 w-[92px] text-[10px] px-1.5 gap-1">
            {nivel && <Zap className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any" className="text-xs">Qualquer</SelectItem>
            <SelectItem value="estagio" className="text-xs">Estágio+</SelectItem>
            <SelectItem value="assistente" className="text-xs">Assistente+</SelectItem>
            <SelectItem value="analista" className="text-xs">Analista+</SelectItem>
            <SelectItem value="coordenador" className="text-xs">Coord.+</SelectItem>
            <SelectItem value="gerente" className="text-xs">Gerente+</SelectItem>
            <SelectItem value="diretor" className="text-xs">Diretor</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ─── Module Row (one expanded line per module) ─────────────
function ModuleRow({
  mod,
  tipo,
  localPermissions,
  localNiveis,
  togglePermission,
  setNivelMinimo,
  isSuperAdminRole,
  showNivel,
}: {
  mod: typeof MODULES[number];
  tipo: string;
  localPermissions: Map<string, boolean>;
  localNiveis: Map<string, string | null>;
  togglePermission: (mod: string, perm: string, tipo: string) => void;
  setNivelMinimo: (mod: string, perm: string, tipo: string, nivel: string | null) => void;
  isSuperAdminRole: boolean;
  showNivel: boolean;
}) {
  const acoes = getAcoesDoModulo(mod.key);
  const sensivel = MODULOS_SENSIVEIS.has(mod.key);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-stretch">
        {/* Module name */}
        <div className="p-3 bg-muted/30 border-b md:border-b-0 md:border-r flex flex-col justify-center gap-1.5">
          <p className="text-sm font-medium leading-tight">{mod.label}</p>
          {sensivel && (
            <Badge variant="outline" className="w-fit text-[9px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">
              🔐 Sensível
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="p-3 flex flex-wrap gap-x-4 gap-y-3">
          {acoes.map((acao) => {
            const key = `${mod.key}:${acao}:${tipo}`;
            const granted = localPermissions.get(key) || false;
            const nivel = localNiveis.get(key) ?? null;
            return (
              <div key={acao} className="flex flex-col items-center gap-1 min-w-[92px]">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  {ACAO_ICONES[acao]} {ACAO_LABELS[acao]}
                </div>
                <PermissionCell
                  granted={granted}
                  nivel={nivel}
                  locked={isSuperAdminRole}
                  showNivel={showNivel}
                  onToggle={(v) => {
                    togglePermission(mod.key, acao, tipo);
                    if (!v) setNivelMinimo(mod.key, acao, tipo, null);
                  }}
                  onNivelChange={(n) => setNivelMinimo(mod.key, acao, tipo, n)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function ConfigurarPerfisTab() {
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
        .eq("is_system", true)
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

  const savedNiveisRef = useRef<Map<string, string | null>>(new Map());
  const [localNiveis, setLocalNiveis] = useState<Map<string, string | null>>(new Map());

  const loadRolePermissions = useCallback((roleName: string) => {
    const map = new Map<string, boolean>();
    const niveis = new Map<string, string | null>();
    permissions
      .filter((p) => p.role_name === roleName)
      .forEach((p) => {
        const k = `${p.module}:${p.permission}:${p.colaborador_tipo}`;
        map.set(k, p.granted);
        niveis.set(k, (p as any).nivel_minimo ?? null);
      });
    setLocalPermissions(map);
    setLocalNiveis(niveis);
    savedPermissionsRef.current = new Map(map);
    savedNiveisRef.current = new Map(niveis);
    setIsDirty(false);
  }, [permissions]);

  const selectRole = (roleName: string) => {
    if (isDirty && selectedRole && selectedRole !== roleName) {
      setDiscardTarget(roleName);
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

  const setNivelMinimo = (module: string, permission: string, tipo: string, nivel: string | null) => {
    const key = `${module}:${permission}:${tipo}`;
    const newMap = new Map(localNiveis);
    newMap.set(key, nivel);
    setLocalNiveis(newMap);
    setIsDirty(true);
  };

  const resetToSaved = () => {
    setLocalPermissions(new Map(savedPermissionsRef.current));
    setLocalNiveis(new Map(savedNiveisRef.current));
    setIsDirty(false);
    setResetConfirm(false);
    toast.success("Permissões restauradas para o estado salvo");
  };

  const savePermissions = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      const updates = Array.from(localPermissions.entries()).map(([key, granted]) => {
        const [module, permission, colaborador_tipo] = key.split(":");
        const nivel_minimo = localNiveis.get(key) ?? null;
        return { role_name: selectedRole, module, permission, granted, colaborador_tipo, nivel_minimo };
      });

      for (const u of updates) {
        const { error } = await supabase
          .from("role_permissions")
          .upsert(
            {
              role_name: u.role_name as any,
              module: u.module,
              permission: u.permission,
              granted: u.granted,
              colaborador_tipo: u.colaborador_tipo,
              nivel_minimo: u.nivel_minimo as any,
            },
            { onConflict: "role_name,module,permission,colaborador_tipo" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions-config"] });
      savedPermissionsRef.current = new Map(localPermissions);
      savedNiveisRef.current = new Map(localNiveis);
      setIsDirty(false);
      toast.success("Permissões salvas com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao salvar permissões"),
  });

  const createRole = useMutation({
    mutationFn: async () => {
      const slug = newRole.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      if (!slug) throw new Error("Nome inválido");

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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-muted-foreground">
          <Lock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Apenas Super Admin pode configurar perfis de acesso</p>
        </div>
      </div>
    );
  }

  const showNivelColumn = ROLES_COM_NIVEIS.has(selectedRole ?? "");

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Defina as permissões de cada perfil do sistema</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Perfil
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="flex border rounded-lg min-h-[500px]">
        {/* Left: Role list */}
        <div className="w-[280px] border-r shrink-0 overflow-y-auto p-4 space-y-2 max-h-[calc(100vh-20rem)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">Perfis Ativos</p>
          {roles.map((role) => (
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
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{ROLE_LABELS[role.name] || role.name}</p>
                        {NEW_ROLES.has(role.name) && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-emerald-400 text-emerald-700 shrink-0">
                            Nova
                          </Badge>
                        )}
                        {LEGACY_ROLES.has(role.name) && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-400 text-amber-700 shrink-0">
                            Legado
                          </Badge>
                        )}
                      </div>
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
        </div>

        {/* Right: Permission editor */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-20rem)]">
          {selectedRole && currentRole ? (
            <div className="p-6 space-y-6">
              {/* Header with unsaved indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold">{ROLE_LABELS[currentRole.name] || currentRole.name}</h2>
                      {NEW_ROLES.has(currentRole.name) && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-400 text-emerald-700">
                          Nova
                        </Badge>
                      )}
                      {LEGACY_ROLES.has(currentRole.name) && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-700">
                          Legado
                        </Badge>
                      )}
                      {isDirty && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Alterações não salvas
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{currentRole.description}</p>
                    {ROLES_COM_NIVEIS.has(currentRole.name) && (
                      <p className="text-[11px] text-muted-foreground mt-1 italic">
                        Esta role suporta níveis: Estágio, Assistente, Analista, Coordenador, Gerente, Diretor.
                      </p>
                    )}
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
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Switch checked className="scale-75 pointer-events-none" /> Permitido
                </span>
                <span className="flex items-center gap-1.5">
                  <Switch checked={false} className="scale-75 pointer-events-none" /> Sem acesso
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-amber-500" /> Com nível mínimo
                </span>
              </div>

              {/* Render module categories dynamically */}
              {MODULE_CATEGORIES.map((cat) => {
                const catModules = MODULES.filter((m) => m.category === cat.key);
                if (catModules.length === 0) return null;
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className={`text-sm font-bold uppercase tracking-wider ${cat.color}`}>{cat.label}</h3>
                      <Separator className="flex-1" />
                    </div>
                    <div className="space-y-2">
                      {catModules.map((mod) => (
                        <ModuleRow
                          key={mod.key}
                          mod={mod}
                          tipo="all"
                          localPermissions={localPermissions}
                          localNiveis={localNiveis}
                          togglePermission={togglePermission}
                          setNivelMinimo={setNivelMinimo}
                          isSuperAdminRole={isSuperAdminRole}
                          showNivel={showNivelColumn}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
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
            <AlertDialogAction onClick={resetToSaved}>
              Resetar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
