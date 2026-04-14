import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2, XCircle, UserCheck, UserX, Users, UserPlus,
  Shield, ShieldCheck, ShieldAlert, Eye, EyeOff, Pencil, Trash2, Settings2, Link2,
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, string> = {
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

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Acesso total ao sistema. Único que vê salário C-Level e configura perfis.",
  admin_rh: "Gestão completa de pessoas, dados sensíveis (salário não C-Level). Cria e edita usuários.",
  admin_ti: "Gerencia acessos a sistemas e equipamentos. (Módulo TI — em breve)",
  gestor_rh: "Gestão operacional de pessoas. Sem dados financeiros, folha, parâmetros ou usuários.",
  gestor_direto: "Visualiza e aprova para seu time. Recebe tarefas de onboarding.",
  colaborador: "Portal self-service. Acessa apenas seus próprios dados.",
  financeiro: "Puramente financeiro. Folha, NF, pagamentos PJ. Sem dados operacionais de RH.",
  fiscal: "NF-e e integração ERP. Subconjunto do financeiro. (Integração ERP — em breve)",
  operacional: "Ponto, turnos e NRs da unidade fabril. (Unidade Fabril — em breve)",
  recrutador: "Gerencia vagas e candidatos. (Módulo Recrutamento — em breve)",
};

const ACTIVE_ROLES: AppRole[] = [
  "super_admin", "admin_rh", "gestor_rh", "gestor_direto", "colaborador", "financeiro"
];
const FUTURE_ROLES: AppRole[] = [
  "admin_ti", "recrutador", "fiscal", "operacional"
];
const ALL_ROLES: AppRole[] = [...ACTIVE_ROLES, ...FUTURE_ROLES];

const isFutureRole = (role: AppRole) => FUTURE_ROLES.includes(role);

async function callManageUser(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("manage-user", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function GerenciarUsuarios() {
  const navigate = useNavigate();
  const { roles: myRoles } = useAuth();
  const isSuperAdmin = myRoles.includes("super_admin");
  const isAdminRH = myRoles.includes("admin_rh");
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; name: string } | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [selectedColabTipo, setSelectedColabTipo] = useState<string>("");
  const [newUser, setNewUser] = useState({
    email: "", full_name: "", roles: ["colaborador"] as string[],
    tipo_acesso: "externo" as "vinculado" | "externo",
    colaborador_id: "", colaborador_tipo: ""
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; name: string } | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUser, setLinkUser] = useState<{ userId: string; name: string } | null>(null);
  const [linkColaboradorId, setLinkColaboradorId] = useState("");
  const [linkContratoPjId, setLinkContratoPjId] = useState("");
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: authUsers = [] } = useQuery({
    queryKey: ["admin-auth-users"],
    queryFn: async () => {
      const result = await callManageUser("list_users", {});
      return result.users || [];
    },
  });

  const { data: unlinkedCLT = [] } = useQuery({
    queryKey: ["unlinked-clt"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores_clt")
        .select("id, nome_completo, cargo")
        .is("user_id", null)
        .eq("status", "ativo");
      if (error) throw error;
      return data;
    },
  });

  const { data: unlinkedPJ = [] } = useQuery({
    queryKey: ["unlinked-pj"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos_pj")
        .select("id, contato_nome, razao_social")
        .is("user_id", null)
        .eq("status", "ativo");
      if (error) throw error;
      return data;
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      await callManageUser("create_user_standalone", {
        email: newUser.email,
        full_name: newUser.full_name,
        roles: newUser.roles,
        colaborador_id: newUser.tipo_acesso === "vinculado" && newUser.colaborador_id ? newUser.colaborador_id : undefined,
        colaborador_tipo: newUser.tipo_acesso === "vinculado" ? newUser.colaborador_tipo : "all",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-auth-users"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-clt"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-pj"] });
      toast.success("Usuário criado! Um e-mail com link de acesso foi enviado.");
      setCreateOpen(false);
      setNewUser({ email: "", full_name: "", roles: ["colaborador"], tipo_acesso: "externo", colaborador_id: "", colaborador_tipo: "" });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar usuário"),
  });

  const toggleBan = useMutation({
    mutationFn: async ({ user_id, ban }: { user_id: string; ban: boolean }) => {
      await callManageUser("toggle_ban", { user_id, ban });
    },
    onSuccess: (_, { ban }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-auth-users"] });
      toast.success(ban ? "Usuário inativado com sucesso!" : "Usuário ativado com sucesso!");
    },
    onError: () => toast.error("Erro ao atualizar status do usuário"),
  });

  const approveUser = useMutation({
    mutationFn: async (user_id: string) => {
      await callManageUser("approve", { user_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-auth-users"] });
      toast.success("Usuário aprovado com sucesso!");
    },
    onError: () => toast.error("Erro ao aprovar usuário"),
  });

  const updateRoles = useMutation({
    mutationFn: async ({ user_id, roles, colaborador_tipo }: { user_id: string; roles: AppRole[]; colaborador_tipo?: string | null }) => {
      await callManageUser("update_roles", { user_id, roles, colaborador_tipo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("Perfis atualizados com sucesso!");
      setRolesDialogOpen(false);
    },
    onError: () => toast.error("Erro ao atualizar perfis"),
  });

  const deleteUser = useMutation({
    mutationFn: async (user_id: string) => {
      await callManageUser("delete_user", { user_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-auth-users"] });
      toast.success("Usuário deletado com sucesso!");
      setDeleteConfirm(null);
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao deletar usuário"),
  });

  const linkRecord = useMutation({
    mutationFn: async ({ user_id, colaborador_id, contrato_pj_id }: { user_id: string; colaborador_id?: string; contrato_pj_id?: string }) => {
      await callManageUser("link_record", { user_id, colaborador_id, contrato_pj_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unlinked-clt"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-pj"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("Vínculo realizado com sucesso!");
      setLinkDialogOpen(false);
      setLinkColaboradorId("");
      setLinkContratoPjId("");
    },
    onError: () => toast.error("Erro ao vincular registro"),
  });

  const getUserRoles = (userId: string) =>
    allRoles.filter((r) => r.user_id === userId).map((r) => r.role);

  const getUserRoleRecord = (userId: string, role: AppRole) =>
    allRoles.find((r) => r.user_id === userId && r.role === role);

  const isGestorManual = (userId: string) => {
    const record = getUserRoleRecord(userId, "gestor_direto" as AppRole);
    return record ? (record as any).atribuido_manualmente === true : false;
  };

  const getAuthUser = (userId: string) =>
    authUsers.find((u: { id: string }) => u.id === userId);

  const openRolesDialog = (userId: string, name: string) => {
    // admin_rh cannot edit super_admin or other admin_rh users
    if (!isSuperAdmin) {
      const targetRoles = getUserRoles(userId);
      if (targetRoles.includes("super_admin") || targetRoles.includes("admin_rh")) {
        toast.error("Sem permissão para editar este usuário");
        return;
      }
    }
    setSelectedUser({ userId, name });
    setSelectedRoles(getUserRoles(userId));
    const profile = profiles.find((p) => p.user_id === userId);
    setSelectedColabTipo((profile as any)?.colaborador_tipo || "");
    setRolesDialogOpen(true);
  };

  const toggleRole = (role: AppRole) => {
    if (!isSuperAdmin && role === "super_admin") {
      toast.error("Apenas Super Admin pode atribuir este role");
      return;
    }
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleNewUserRole = (role: string) => {
    setNewUser((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const pendingCount = profiles.filter((p) => !p.approved).length;
  const approvedCount = profiles.filter((p) => p.approved).length;
  const bannedCount = authUsers.filter((u: { banned: boolean }) => u.banned).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
          <p className="text-sm text-muted-foreground">Cadastrar, ativar/inativar e gerenciar perfis de acesso</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
              <DialogDescription>O usuário receberá um e-mail com link para definir senha no primeiro acesso.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail Corporativo *</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Acesso</Label>
                <Select value={newUser.tipo_acesso} onValueChange={(v: "vinculado" | "externo") => setNewUser({ ...newUser, tipo_acesso: v, colaborador_id: "", colaborador_tipo: "" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="externo">Usuário externo (sem vínculo)</SelectItem>
                    <SelectItem value="vinculado">Colaborador vinculado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {newUser.tipo_acesso === "externo"
                    ? "Contador, advogado, consultor ou sócio com acesso ao sistema"
                    : "Vincular a um cadastro CLT ou PJ existente"}
                </p>
              </div>
              {newUser.tipo_acesso === "vinculado" && (
                <div className="space-y-2">
                  <Label>Vincular a</Label>
                  <Select value={newUser.colaborador_tipo || "none"} onValueChange={(v) => setNewUser({ ...newUser, colaborador_tipo: v === "none" ? "" : v, colaborador_id: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione...</SelectItem>
                      <SelectItem value="clt">Colaborador CLT</SelectItem>
                      <SelectItem value="pj">Contrato PJ</SelectItem>
                    </SelectContent>
                  </Select>
                  {newUser.colaborador_tipo === "clt" && (
                    <Select value={newUser.colaborador_id || "none"} onValueChange={(v) => setNewUser({ ...newUser, colaborador_id: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione...</SelectItem>
                        {unlinkedCLT.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome_completo} — {c.cargo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {newUser.colaborador_tipo === "pj" && (
                    <Select value={newUser.colaborador_id || "none"} onValueChange={(v) => setNewUser({ ...newUser, colaborador_id: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o contrato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione...</SelectItem>
                        {unlinkedPJ.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.contato_nome} — {c.razao_social}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Perfis de Acesso</Label>
                <div className="grid grid-cols-1 gap-2">
                  {ACTIVE_ROLES.filter((role) => isSuperAdmin || role !== "super_admin").map((role) => (
                    <label key={role} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                      <Checkbox
                        checked={newUser.roles.includes(role)}
                        onCheckedChange={() => toggleNewUserRole(role)}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                        <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => createUser.mutate()}
                disabled={!newUser.email || !newUser.full_name || createUser.isPending}
              >
                {createUser.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-l-[3px] border-l-blue-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Total</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              {profiles.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-emerald-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Ativos</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              {approvedCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-amber-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Pendentes</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <UserX className="h-5 w-5 text-amber-500" />
              {pendingCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-red-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Inativos</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              {bannedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2"><Users className="h-4 w-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="perfis" className="gap-2"><Shield className="h-4 w-4" /> Perfis de Acesso</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Perfis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => {
                    const roles = getUserRoles(profile.user_id);
                    const authUser = getAuthUser(profile.user_id);
                    const isBanned = authUser?.banned === true;

                    return (
                      <TableRow key={profile.id} className={isBanned ? "opacity-60" : ""}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{profile.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{authUser?.email || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const tipo = (profile as any).colaborador_tipo;
                            if (tipo === "clt") return <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">CLT</Badge>;
                            if (tipo === "pj") return <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">PJ</Badge>;
                            if (tipo === "ambos") return <div className="flex gap-1"><Badge variant="outline" className="text-xs border-blue-300 text-blue-700">CLT</Badge><Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">PJ</Badge></div>;
                            return <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">Não definido</Badge>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {roles.map((role) => (
                              <Badge
                                key={role}
                                variant="secondary"
                                className={`text-xs ${role === "gestor_direto" && !isGestorManual(profile.user_id) ? "border border-dashed border-muted-foreground/40" : ""}`}
                                title={role === "gestor_direto" ? (isGestorManual(profile.user_id) ? "Atribuído manualmente" : "Atribuído automaticamente") : undefined}
                              >
                                {ROLE_LABELS[role] || role}
                                {role === "gestor_direto" && !isGestorManual(profile.user_id) && (
                                  <span className="ml-1 text-[10px] text-muted-foreground">(auto)</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isBanned ? (
                            <Badge variant="outline" className="border-red-300 text-red-700">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inativo
                            </Badge>
                          ) : profile.approved ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 text-amber-700">
                              <XCircle className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {authUser?.last_sign_in_at
                            ? new Date(authUser.last_sign_in_at).toLocaleDateString("pt-BR", {
                                day: "2-digit", month: "2-digit", year: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "Nunca"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => openRolesDialog(profile.user_id, profile.full_name || "Usuário")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Perfis
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => {
                                setLinkUser({ userId: profile.user_id, name: profile.full_name || "Usuário" });
                                setLinkColaboradorId("");
                                setLinkContratoPjId("");
                                setLinkDialogOpen(true);
                              }}
                            >
                              <Link2 className="h-3.5 w-3.5" />
                              Vincular
                            </Button>
                            {isBanned ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 hover:text-emerald-700 gap-1"
                                onClick={() => toggleBan.mutate({ user_id: profile.user_id, ban: false })}
                                disabled={toggleBan.isPending}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Ativar
                              </Button>
                            ) : !profile.approved ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 hover:text-emerald-700 gap-1"
                                onClick={() => approveUser.mutate(profile.user_id)}
                                disabled={approveUser.isPending}
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                Aprovar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 gap-1"
                                onClick={() => toggleBan.mutate({ user_id: profile.user_id, ban: true })}
                                disabled={toggleBan.isPending}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Inativar
                              </Button>
                            )}
                            {isSuperAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive gap-1"
                                onClick={() => setDeleteConfirm({ userId: profile.user_id, name: profile.full_name || "Usuário" })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Deletar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {profiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perfis" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button className="gap-2" onClick={() => navigate("/configurar-perfis")}>
              <Settings2 className="h-4 w-4" />
              Configurar Permissões dos Perfis
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_ROLES.map((role) => {
              const usersWithRole = profiles.filter((p) =>
                getUserRoles(p.user_id).includes(role)
              );
              return (
                <Card key={role} className={`cursor-pointer hover:shadow-md transition-shadow ${isFutureRole(role) ? "border-dashed opacity-60" : ""}`} onClick={() => navigate("/configurar-perfis")}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-foreground" />
                      <CardTitle className="text-base">{ROLE_LABELS[role]}</CardTitle>
                      {isFutureRole(role) && <Badge variant="outline" className="text-[10px] border-dashed">Em breve</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        {usersWithRole.length} usuário{usersWithRole.length !== 1 ? "s" : ""}
                      </p>
                      {usersWithRole.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {usersWithRole.map((p) => {
                            const authUser = getAuthUser(p.user_id);
                            return (
                              <div key={p.id} className="flex items-center gap-2 text-sm rounded-md bg-muted/50 px-2 py-1.5">
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground">
                                  {(p.full_name || "?")[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">{p.full_name || "—"}</p>
                                  <p className="truncate text-[10px] text-muted-foreground">{authUser?.email || ""}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Nenhum usuário com este perfil</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog for editing user roles */}
      <Dialog open={rolesDialogOpen} onOpenChange={setRolesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfis de Acesso</DialogTitle>
            <DialogDescription>{selectedUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {ALL_ROLES.filter((role) => isSuperAdmin || role !== "super_admin").map((role) => {
              const isGestorDireto = role === "gestor_direto";
              const currentRecord = selectedUser ? getUserRoleRecord(selectedUser.userId, role) : null;
              const isManual = currentRecord ? (currentRecord as any).atribuido_manualmente === true : false;
              const isAutoAssigned = isGestorDireto && selectedRoles.includes(role) && !isManual;

              return (
                <div key={role} className={`rounded-md border p-3 space-y-2 ${isFutureRole(role) ? "border-dashed opacity-60" : ""}`}>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50">
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={() => toggleRole(role)}
                      disabled={isFutureRole(role)}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                      {isFutureRole(role) && <Badge variant="outline" className="ml-2 text-[10px] border-dashed">Em breve</Badge>}
                      <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                    </div>
                    {isGestorDireto && selectedRoles.includes(role) && (
                      <Badge variant="outline" className={`text-[10px] ${isAutoAssigned ? "border-dashed" : ""}`}>
                        {isAutoAssigned ? "Auto" : "Manual"}
                      </Badge>
                    )}
                  </label>
                  {isGestorDireto && selectedRoles.includes(role) && (
                    <div className="flex items-center gap-2 ml-6">
                      <Switch
                        checked={isManual}
                        onCheckedChange={async (checked) => {
                          if (!selectedUser) return;
                          const { error } = await supabase
                            .from("user_roles")
                            .update({ atribuido_manualmente: checked } as any)
                            .eq("user_id", selectedUser.userId)
                            .eq("role", "gestor_direto" as any);
                          if (error) {
                            toast.error("Erro ao atualizar flag manual");
                          } else {
                            queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
                            toast.success(checked ? "Marcado como atribuição manual" : "Marcado como atribuição automática");
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Atribuído manualmente (protege contra remoção automática)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="space-y-2 pt-2">
            <Label className="text-sm font-medium">Tipo de Colaborador</Label>
            <Select value={selectedColabTipo || "auto"} onValueChange={(v) => setSelectedColabTipo(v === "auto" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (detectar pelo cadastro)</SelectItem>
                <SelectItem value="clt">CLT</SelectItem>
                <SelectItem value="pj">PJ</SelectItem>
                <SelectItem value="ambos">Ambos (CLT + PJ)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Define quais módulos o usuário terá acesso</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolesDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  updateRoles.mutate({ user_id: selectedUser.userId, roles: selectedRoles, colaborador_tipo: selectedColabTipo || null });
                }
              }}
              disabled={updateRoles.isPending}
            >
              {updateRoles.isPending ? "Salvando..." : "Salvar Perfis"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o usuário <strong>{deleteConfirm?.name}</strong>? Esta ação é irreversível e removerá todos os dados de acesso do usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteUser.mutate(deleteConfirm.userId)}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for manual linking */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Cadastro</DialogTitle>
            <DialogDescription>
              Vincular o usuário <strong>{linkUser?.name}</strong> a um registro de colaborador CLT ou contrato PJ existente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Colaborador CLT</Label>
              <Select value={linkColaboradorId} onValueChange={setLinkColaboradorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (não vincular CLT)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {unlinkedCLT.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_completo} — {c.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contrato PJ</Label>
              <Select value={linkContratoPjId} onValueChange={setLinkContratoPjId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (não vincular PJ)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {unlinkedPJ.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contato_nome} — {c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (linkUser) {
                  linkRecord.mutate({
                    user_id: linkUser.userId,
                    colaborador_id: linkColaboradorId && linkColaboradorId !== "none" ? linkColaboradorId : undefined,
                    contrato_pj_id: linkContratoPjId && linkContratoPjId !== "none" ? linkContratoPjId : undefined,
                  });
                }
              }}
              disabled={linkRecord.isPending || (!linkColaboradorId && !linkContratoPjId) || (linkColaboradorId === "none" && linkContratoPjId === "none")}
            >
              {linkRecord.isPending ? "Vinculando..." : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
