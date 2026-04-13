import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Shield, Lock } from "lucide-react";

interface GrupoAcesso {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_colaborador: string;
  role_automatico: string;
  is_system: boolean;
  ativo: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  colaborador: "Colaborador",
  gestor_direto: "Gestor Direto",
  gestor_rh: "Gestor RH",
  admin_rh: "Admin RH",
  financeiro: "Financeiro",
  super_admin: "Super Admin",
};

const TIPO_LABELS: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  ambos: "CLT + PJ",
};

export default function GruposAcessoTab() {
  const { roles } = useAuth();
  const canEdit = roles.includes("super_admin") || roles.includes("admin_rh");
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editGrupo, setEditGrupo] = useState<GrupoAcesso | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GrupoAcesso | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoColaborador, setTipoColaborador] = useState("ambos");
  const [roleAutomatico, setRoleAutomatico] = useState("colaborador");

  const fetchGrupos = async () => {
    const { data, error } = await supabase
      .from("grupos_acesso")
      .select("*")
      .order("is_system", { ascending: false })
      .order("nome");
    if (error) toast.error(error.message);
    else setGrupos((data || []) as unknown as GrupoAcesso[]);
    setLoading(false);
  };

  useEffect(() => { fetchGrupos(); }, []);

  const openNew = () => {
    setEditGrupo(null);
    setNome("");
    setDescricao("");
    setTipoColaborador("ambos");
    setRoleAutomatico("colaborador");
    setFormOpen(true);
  };

  const openEdit = (g: GrupoAcesso) => {
    setEditGrupo(g);
    setNome(g.nome);
    setDescricao(g.descricao || "");
    setTipoColaborador(g.tipo_colaborador);
    setRoleAutomatico(g.role_automatico);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      if (editGrupo) {
        const updateData: any = {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          tipo_colaborador: tipoColaborador,
          role_automatico: roleAutomatico,
        };
        const { error } = await supabase
          .from("grupos_acesso")
          .update(updateData)
          .eq("id", editGrupo.id);
        if (error) throw error;
        toast.success("Grupo atualizado!");
      } else {
        const { error } = await supabase
          .from("grupos_acesso")
          .insert({
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            tipo_colaborador: tipoColaborador,
            role_automatico: roleAutomatico,
          } as any);
        if (error) throw error;
        toast.success("Grupo criado!");
      }
      setFormOpen(false);
      fetchGrupos();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (g: GrupoAcesso) => {
    const { error } = await supabase
      .from("grupos_acesso")
      .update({ ativo: !g.ativo } as any)
      .eq("id", g.id);
    if (error) toast.error(error.message);
    else fetchGrupos();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("grupos_acesso").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Grupo removido"); fetchGrupos(); }
    setDeleteTarget(null);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Grupos de Acesso</CardTitle>
            <p className="text-sm text-muted-foreground">
              Define automaticamente o perfil de cada colaborador no portal
            </p>
          </div>
          {canEdit && (
            <Button onClick={openNew} className="gap-2" size="sm">
              <Plus className="h-4 w-4" /> Novo Grupo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Role Automático</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum grupo cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  grupos.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {g.is_system ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Shield className="h-3.5 w-3.5 text-primary" />}
                          <span className="font-medium">{g.nome}</span>
                          {g.is_system && <Badge variant="secondary" className="text-[10px]">Sistema</Badge>}
                        </div>
                        {g.descricao && <p className="text-xs text-muted-foreground mt-0.5">{g.descricao}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TIPO_LABELS[g.tipo_colaborador] || g.tipo_colaborador}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary border-0">
                          {ROLE_LABELS[g.role_automatico] || g.role_automatico}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={g.ativo}
                          onCheckedChange={() => handleToggleAtivo(g)}
                          disabled={!canEdit}
                        />
                      </TableCell>
                      <TableCell>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {!g.is_system && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(g)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editGrupo ? "Editar Grupo" : "Novo Grupo de Acesso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Analista Financeiro" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do grupo" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Colaborador</Label>
              <Select value={tipoColaborador} onValueChange={setTipoColaborador}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                  <SelectItem value="ambos">CLT + PJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role Automático</Label>
              <Select value={roleAutomatico} onValueChange={setRoleAutomatico}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O role atribuído automaticamente quando o colaborador é ativado
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              O grupo "{deleteTarget?.nome}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
