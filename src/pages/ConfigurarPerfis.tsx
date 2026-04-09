import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { MODULES, CRUD_PERMISSIONS, SPECIAL_PERMISSIONS, type RolePermission } from "@/hooks/usePermissions";

const PERMISSION_ICONS: Record<string, React.ReactNode> = {
  view: <Eye className="h-3.5 w-3.5" />,
  create: <FilePlus className="h-3.5 w-3.5" />,
  edit: <Pencil className="h-3.5 w-3.5" />,
  delete: <Trash className="h-3.5 w-3.5" />,
  enviar_email: <Mail className="h-3.5 w-3.5" />,
  aprovar: <CheckCircle className="h-3.5 w-3.5" />,
  fechar: <Lock className="h-3.5 w-3.5" />,
  exportar: <FileDown className="h-3.5 w-3.5" />,
  enviar: <Send className="h-3.5 w-3.5" />,
};

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

export default function ConfigurarPerfis() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomRole | null>(null);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [localPermissions, setLocalPermissions] = useState<Map<string, boolean>>(new Map());
  const [isDirty, setIsDirty] = useState(false);

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

  // When a role is selected, populate local state
  const selectRole = (roleName: string) => {
    setSelectedRole(roleName);
    setIsDirty(false);
    const map = new Map<string, boolean>();
    permissions
      .filter((p) => p.role_name === roleName)
      .forEach((p) => map.set(`${p.module}:${p.permission}`, p.granted));
    setLocalPermissions(map);
  };

  const togglePermission = (module: string, permission: string) => {
    const key = `${module}:${permission}`;
    const newMap = new Map(localPermissions);
    newMap.set(key, !newMap.get(key));
    setLocalPermissions(newMap);
    setIsDirty(true);
  };

  const toggleModuleAll = (module: string, allPerms: string[]) => {
    const allGranted = allPerms.every((p) => localPermissions.get(`${module}:${p}`));
    const newMap = new Map(localPermissions);
    allPerms.forEach((p) => newMap.set(`${module}:${p}`, !allGranted));
    setLocalPermissions(newMap);
    setIsDirty(true);
  };

  const savePermissions = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      const updates = Array.from(localPermissions.entries()).map(([key, granted]) => {
        const [module, permission] = key.split(":");
        return { role_name: selectedRole, module, permission, granted };
      });

      // Batch upsert
      for (const u of updates) {
        const { error } = await supabase
          .from("role_permissions")
          .update({ granted: u.granted })
          .eq("role_name", u.role_name)
          .eq("module", u.module)
          .eq("permission", u.permission);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions-config"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions-all"] });
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

      // Create default permissions (all false)
      const perms: { role_name: string; module: string; permission: string; granted: boolean }[] = [];
      for (const mod of MODULES) {
        for (const perm of CRUD_PERMISSIONS) {
          perms.push({ role_name: slug, module: mod.key, permission: perm.key, granted: false });
        }
      }
      for (const sp of SPECIAL_PERMISSIONS) {
        perms.push({ role_name: slug, module: sp.module, permission: sp.key, granted: false });
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
      if (selectedRole === deleteConfirm?.name) setSelectedRole(null);
      toast.success("Perfil removido com sucesso!");
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Erro ao remover perfil"),
  });

  const currentRole = roles.find((r) => r.name === selectedRole);

  const getModuleSpecialPerms = (moduleKey: string) =>
    SPECIAL_PERMISSIONS.filter((sp) => sp.module === moduleKey);

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Role list */}
        <div className="space-y-2">
          {roles.map((role) => (
            <Card
              key={role.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedRole === role.name ? "ring-2 ring-primary" : ""
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
                      <p className="text-sm font-medium truncate">{role.name}</p>
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

        {/* Permission editor */}
        {selectedRole && currentRole ? (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{currentRole.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{currentRole.description}</p>
                  </div>
                </div>
                <Button
                  className="gap-2"
                  disabled={!isDirty || savePermissions.isPending}
                  onClick={() => savePermissions.mutate()}
                >
                  <Save className="h-4 w-4" />
                  {savePermissions.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedRole === "colaborador" && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>Premissa básica:</strong> O colaborador só tem acesso às suas próprias informações.
                    Todas as permissões de visualização abaixo se aplicam exclusivamente aos dados do próprio usuário,
                    garantidas pelas regras de segurança do banco de dados (RLS).
                  </div>
                </div>
              )}
              {selectedRole === "gestor_direto" && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>Premissa básica:</strong> O gestor direto tem acesso às suas próprias informações e às de todos os seus liderados conforme o organograma.
                    As permissões de visualização abaixo se estendem à equipe sob sua gestão,
                    garantidas pelas regras de segurança do banco de dados (RLS).
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {MODULES.map((mod) => {
                  const specialPerms = getModuleSpecialPerms(mod.key);
                  const allPermsKeys = [
                    ...CRUD_PERMISSIONS.map((p) => p.key),
                    ...specialPerms.map((p) => p.key),
                  ];
                  const allGranted = allPermsKeys.every(
                    (p) => localPermissions.get(`${mod.key}:${p}`)
                  );
                  const someGranted = allPermsKeys.some(
                    (p) => localPermissions.get(`${mod.key}:${p}`)
                  );

                  return (
                    <div key={mod.key} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allGranted}
                            // @ts-ignore
                            indeterminate={someGranted && !allGranted}
                            onCheckedChange={() => toggleModuleAll(mod.key, allPermsKeys)}
                          />
                          <span className="text-sm font-semibold">{mod.label}</span>
                        </div>
                        <Badge variant={someGranted ? "default" : "outline"} className="text-[10px]">
                          {allPermsKeys.filter((p) => localPermissions.get(`${mod.key}:${p}`)).length}/{allPermsKeys.length}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {CRUD_PERMISSIONS.map((perm) => {
                          const granted = localPermissions.get(`${mod.key}:${perm.key}`) || false;
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                                granted
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              <Switch
                                className="scale-75"
                                checked={granted}
                                onCheckedChange={() => togglePermission(mod.key, perm.key)}
                              />
                              {PERMISSION_ICONS[perm.key]}
                              {perm.label}
                            </label>
                          );
                        })}
                        {specialPerms.map((sp) => {
                          const granted = localPermissions.get(`${mod.key}:${sp.key}`) || false;
                          return (
                            <label
                              key={sp.key}
                              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                                granted
                                  ? "bg-accent/80 border-accent text-accent-foreground"
                                  : "hover:bg-muted/50 border-dashed"
                              }`}
                            >
                              <Switch
                                className="scale-75"
                                checked={granted}
                                onCheckedChange={() => togglePermission(mod.key, sp.key)}
                              />
                              {PERMISSION_ICONS[sp.key]}
                              {sp.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center min-h-[400px]">
            <div className="text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione um perfil para configurar suas permissões</p>
            </div>
          </Card>
        )}
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
    </div>
  );
}
