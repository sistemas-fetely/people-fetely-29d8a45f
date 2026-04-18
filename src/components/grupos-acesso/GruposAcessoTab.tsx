import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Shield, Users, UserPlus, Search, X } from "lucide-react";
import { DrawerUsuario } from "@/components/DrawerUsuario";

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

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Acesso total ao sistema.",
  diretoria_executiva: "Visibilidade executiva total — vê tudo, mas não configura.",
  rh: "Recursos Humanos. Acesso conforme nível.",
  gestao_direta: "Liderança de time. Acessa o time conforme organograma.",
  financeiro: "Folha, NF, pagamentos PJ.",
  administrativo: "Administrativo geral.",
  operacional: "Ponto, turnos, NRs.",
  ti: "Ativos, acessos e documentação.",
  recrutamento: "Recrutamento e Seleção.",
  fiscal: "NF-e e integração fiscal.",
  estagiario: "Estágio em qualquer área.",
  colaborador: "Portal self-service.",
};

const NIVEIS = [
  { value: "estagio", label: "Estágio" },
  { value: "assistente", label: "Assistente" },
  { value: "analista", label: "Analista" },
  { value: "coordenador", label: "Coordenador" },
  { value: "gerente", label: "Gerente" },
  { value: "diretor", label: "Diretor" },
];

const ROLES_COM_NIVEL = new Set([
  "rh", "gestao_direta", "financeiro", "administrativo",
  "operacional", "ti", "recrutamento", "fiscal", "estagiario",
]);

interface UsuarioInfo {
  user_id: string;
  nome: string;
  nivel: string | null;
}

interface CustomRoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

interface UserRoleRow {
  user_id: string;
  role: string;
  nivel: string | null;
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function GruposAcessoTab() {
  const { roles: myRoles } = useAuth();
  const isSuperAdmin = myRoles.includes("super_admin");

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<CustomRoleRow[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [busca, setBusca] = useState("");
  const [drawerUsuarioId, setDrawerUsuarioId] = useState<string | null>(null);

  // Atribuição
  const [atribuirOpen, setAtribuirOpen] = useState(false);
  const [roleAlvo, setRoleAlvo] = useState<string | null>(null);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<Set<string>>(new Set());
  const [nivelSelecionado, setNivelSelecionado] = useState<string>("");
  const [salvando, setSalvando] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [rRoles, rUserRoles, rProfiles] = await Promise.all([
      supabase.from("custom_roles").select("*").eq("is_system", true).order("name"),
      supabase.from("user_roles").select("user_id, role, nivel"),
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    if (rRoles.error) toast.error(rRoles.error.message);
    if (rUserRoles.error) toast.error(rUserRoles.error.message);
    if (rProfiles.error) toast.error(rProfiles.error.message);

    setRoles((rRoles.data ?? []) as CustomRoleRow[]);
    setUserRoles((rUserRoles.data ?? []) as UserRoleRow[]);
    setProfiles((rProfiles.data ?? []) as { user_id: string; full_name: string | null }[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const usuariosPorRole = useMemo(() => {
    const map = new Map<string, UsuarioInfo[]>();
    for (const ur of userRoles) {
      const nome = profiles.find((p) => p.user_id === ur.user_id)?.full_name ?? "Sem nome";
      const arr = map.get(ur.role) ?? [];
      arr.push({ user_id: ur.user_id, nome, nivel: ur.nivel });
      map.set(ur.role, arr);
    }
    return map;
  }, [userRoles, profiles]);

  const rolesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => {
      const label = (ROLE_LABELS[r.name] || r.name).toLowerCase();
      const desc = (r.description || ROLE_DESCRIPTIONS[r.name] || "").toLowerCase();
      return label.includes(q) || desc.includes(q) || r.name.includes(q);
    });
  }, [roles, busca]);

  function abrirAtribuir(roleName: string) {
    setRoleAlvo(roleName);
    const jaTem = new Set((usuariosPorRole.get(roleName) ?? []).map((u) => u.user_id));
    setUsuariosSelecionados(jaTem);
    setNivelSelecionado("");
    setAtribuirOpen(true);
  }

  async function salvarAtribuicao() {
    if (!roleAlvo) return;
    setSalvando(true);
    try {
      const atuais = new Set((usuariosPorRole.get(roleAlvo) ?? []).map((u) => u.user_id));
      const adicionar = [...usuariosSelecionados].filter((u) => !atuais.has(u));
      const remover = [...atuais].filter((u) => !usuariosSelecionados.has(u));

      if (adicionar.length > 0) {
        const rows = adicionar.map((user_id) => ({
          user_id,
          role: roleAlvo as never,
          nivel: ROLES_COM_NIVEL.has(roleAlvo) && nivelSelecionado ? (nivelSelecionado as never) : null,
        }));
        const { error } = await supabase.from("user_roles").insert(rows);
        if (error) throw error;
      }
      if (remover.length > 0) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("role", roleAlvo as never)
          .in("user_id", remover);
        if (error) throw error;
      }
      toast.success("Atribuições salvas!");
      setAtribuirOpen(false);
      fetchAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Grupos de Acesso
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada grupo (perfil) define o que um conjunto de usuários pode fazer no sistema.
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar perfil..."
              className="pl-8"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesFiltrados.map((role) => {
              const usuarios = usuariosPorRole.get(role.name) ?? [];
              return (
                <Card key={role.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm">{ROLE_LABELS[role.name] || role.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {role.description || ROLE_DESCRIPTIONS[role.name] || "—"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px] gap-1">
                        <Users className="h-3 w-3" />
                        {usuarios.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Usuários com esse perfil:</p>
                    {usuarios.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhum usuário atribuído ainda.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {usuarios.map((u) => (
                          <button
                            key={u.user_id}
                            type="button"
                            onClick={() => setDrawerUsuarioId(u.user_id)}
                            className="w-full flex items-center gap-2 text-xs hover:text-primary hover:underline transition-colors text-left"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px]">{getInitials(u.nome)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate flex-1">{u.nome}</span>
                            {u.nivel && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0">{u.nivel}</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {isSuperAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 mt-3"
                        onClick={() => abrirAtribuir(role.name)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Atribuir usuários
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={atribuirOpen} onOpenChange={setAtribuirOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Atribuir usuários</DialogTitle>
            <DialogDescription>
              Perfil <strong>{roleAlvo ? (ROLE_LABELS[roleAlvo] || roleAlvo) : ""}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {roleAlvo && ROLES_COM_NIVEL.has(roleAlvo) && (
              <div className="space-y-1.5">
                <Label className="text-xs">Nível para novos atribuídos</Label>
                <Select value={nivelSelecionado || "none"} onValueChange={(v) => setNivelSelecionado(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Sem nível" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem nível</SelectItem>
                    {NIVEIS.map((n) => (
                      <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Aplicado apenas aos usuários adicionados nesta sessão.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Usuários</Label>
              <div className="border rounded-md max-h-72 overflow-y-auto divide-y">
                {profiles.length === 0 && (
                  <p className="text-xs text-muted-foreground p-3">Nenhum usuário cadastrado.</p>
                )}
                {profiles.map((p) => {
                  const checked = usuariosSelecionados.has(p.user_id);
                  return (
                    <label
                      key={p.user_id}
                      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setUsuariosSelecionados((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(p.user_id); else next.delete(p.user_id);
                            return next;
                          });
                        }}
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">{getInitials(p.full_name ?? "?")}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1 truncate">{p.full_name ?? "Sem nome"}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAtribuirOpen(false)}>Cancelar</Button>
            <Button onClick={salvarAtribuicao} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DrawerUsuario
        userId={drawerUsuarioId}
        open={!!drawerUsuarioId}
        onOpenChange={(open) => !open && setDrawerUsuarioId(null)}
      />
    </div>
  );
}
