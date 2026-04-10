import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Loader2, Copy, Trash2, MoreHorizontal, Send, Clock, CheckCircle2,
  XCircle, Search, RefreshCw, ExternalLink, Eye, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { useParametros } from "@/hooks/useParametros";

const statusStyles: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700 border-0",
  email_enviado: "bg-sky-100 text-sky-700 border-0",
  preenchido: "bg-emerald-100 text-emerald-700 border-0",
  cadastrado: "bg-blue-100 text-blue-700 border-0",
  expirado: "bg-muted text-muted-foreground border-0",
  cancelado: "bg-muted text-muted-foreground border-0",
};
const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  email_enviado: "Email Enviado",
  preenchido: "Preenchido",
  cadastrado: "Cadastrado",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

interface Convite {
  id: string;
  token: string;
  tipo: string;
  nome: string;
  email: string;
  cargo: string | null;
  departamento: string | null;
  status: string;
  expira_em: string;
  preenchido_em: string | null;
  created_at: string;
  dados_preenchidos: any;
}

export default function ConvitesCadastro() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Convite | null>(null);
  const [viewTarget, setViewTarget] = useState<Convite | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", tipo: "clt", cargo: "", departamento: "" });

  const { data: departamentos } = useParametros("departamento");

  const fetchConvites = async () => {
    const { data, error } = await supabase
      .from("convites_cadastro")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setConvites((data || []) as unknown as Convite[]);
    setLoading(false);
  };

  useEffect(() => { fetchConvites(); }, []);

  const handleCreate = async () => {
    if (!form.nome || !form.email) { toast.error("Nome e email são obrigatórios"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("convites_cadastro")
        .insert({
          nome: form.nome.trim(),
          email: form.email.trim(),
          tipo: form.tipo,
          cargo: form.cargo.trim() || null,
          departamento: form.departamento || null,
          criado_por: user?.id || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success("Convite criado com sucesso!");
      setFormOpen(false);
      setForm({ nome: "", email: "", tipo: "clt", cargo: "", departamento: "" });
      fetchConvites();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("convites_cadastro").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Convite excluído"); fetchConvites(); }
    setDeleteTarget(null);
  };

  const getLink = (token: string) => `${window.location.origin}/cadastro/${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getLink(token));
    toast.success("Link copiado para a área de transferência!");
  };

  const sendEmail = async (convite: Convite) => {
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "convite-cadastro",
          recipientEmail: convite.email,
          idempotencyKey: `convite-${convite.id}-${Date.now()}`,
          templateData: {
            nome: convite.nome,
            tipo: convite.tipo,
            cargo: convite.cargo || undefined,
            departamento: convite.departamento || undefined,
            link: getLink(convite.token),
          },
        },
      });
      if (error) throw error;

      // Update status to email_enviado
      const { error: updateError } = await supabase
        .from("convites_cadastro")
        .update({ status: "email_enviado" })
        .eq("id", convite.id);
      
      if (updateError) {
        console.error("Erro ao atualizar status do convite:", updateError);
      }

      setConvites((prev) =>
        prev.map((c) => (c.id === convite.id ? { ...c, status: "email_enviado" } : c))
      );

      toast.success(`E-mail enviado para ${convite.email}!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar e-mail");
    }
  };

  const filtered = convites.filter((c) => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Check expired convites
  const now = new Date();
  const pendentesCount = convites.filter(c => c.status === "pendente" && new Date(c.expira_em) > now).length;
  const emailEnviadoCount = convites.filter(c => c.status === "email_enviado").length;
  const preenchidosCount = convites.filter(c => c.status === "preenchido").length;
  const expiradosCount = convites.filter(c => c.status === "expirado" || (c.status === "pendente" && new Date(c.expira_em) <= now)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Convites de Pré-Cadastro</h1>
          <p className="text-muted-foreground text-sm mt-1">Gere links para colaboradores preencherem seus dados antes da admissão</p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Novo Convite
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="border-l-[3px] border-l-amber-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Pendentes</p>
            <p className="text-2xl font-bold">{pendentesCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-sky-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Email Enviado</p>
            <p className="text-2xl font-bold text-sky-600">{emailEnviadoCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-emerald-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Preenchidos</p>
            <p className="text-2xl font-bold text-success">{preenchidosCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-muted">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Expirados</p>
            <p className="text-2xl font-bold text-muted-foreground">{expiradosCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Nenhum convite encontrado</TableCell></TableRow>
                  ) : filtered.map((c) => {
                    const expired = c.status === "pendente" && new Date(c.expira_em) <= now;
                    const displayStatus = expired ? "expirado" : c.status;
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/convites-cadastro/${c.id}`)}
                      >
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell className="text-sm">{c.email}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{c.tipo.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-sm">{c.cargo || "—"}</TableCell>
                        <TableCell className="text-sm">{c.departamento || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusStyles[displayStatus] || ""}>
                            {statusLabels[displayStatus] || displayStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{format(parseISO(c.created_at), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-sm">{format(parseISO(c.expira_em), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => copyLink(c.token)} className="gap-2"><Copy className="h-4 w-4" /> Copiar Link</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => sendEmail(c)} className="gap-2"><Mail className="h-4 w-4" /> Enviar E-mail</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(getLink(c.token), '_blank')} className="gap-2"><ExternalLink className="h-4 w-4" /> Abrir Link</DropdownMenuItem>
                              {c.status === "preenchido" && (
                                <DropdownMenuItem onClick={() => setViewTarget(c)} className="gap-2"><Eye className="h-4 w-4" /> Ver Dados</DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setDeleteTarget(c)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Invite Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Convite de Pré-Cadastro</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do Colaborador/Prestador *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Tipo de Contratação</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cargo</Label>
              <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Cargo previsto" />
            </div>
            <div>
              <Label>Departamento</Label>
              {departamentos && departamentos.length > 0 ? (
                <Select value={form.departamento} onValueChange={(v) => setForm({ ...form, departamento: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {departamentos.map((d) => <SelectItem key={d.valor} value={d.valor}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} placeholder="Departamento" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">O convite expira automaticamente em 7 dias.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Gerar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Convite</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o convite de <strong>{deleteTarget?.nome}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Data Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Dados Preenchidos — {viewTarget?.nome}</DialogTitle></DialogHeader>
          {viewTarget?.dados_preenchidos ? (
            <div className="space-y-3">
              {Object.entries(viewTarget.dados_preenchidos as Record<string, any>).map(([key, value]) => {
                if (key === "dependentes" && Array.isArray(value)) {
                  return (
                    <div key={key}>
                      <p className="text-sm font-semibold mt-4 mb-2">Dependentes ({value.length})</p>
                      {value.map((dep: any, i: number) => (
                        <Card key={i} className="mb-2">
                          <CardContent className="p-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {Object.entries(dep).map(([dk, dv]) => (
                                <div key={dk}>
                                  <span className="text-xs text-muted-foreground">{dk.replace(/_/g, " ")}: </span>
                                  <span className="font-medium">{String(dv || "—")}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                }
                if (value === null || value === undefined || value === "") return null;
                return (
                  <div key={key} className="flex justify-between text-sm border-b pb-1">
                    <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
