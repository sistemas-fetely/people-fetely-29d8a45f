import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Loader2, Copy, Trash2, MoreHorizontal, Send, Clock, CheckCircle2,
  XCircle, Search, RefreshCw, ExternalLink, Eye, Mail, Lock, CalendarIcon,
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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParametros } from "@/hooks/useParametros";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface LiderOption {
  profile_id: string;
  user_id: string;
  nome: string;
  cargo: string;
  tipo: "clt" | "pj";
}

const PRAZO_OPTIONS = [
  { value: "3", label: "3 dias" },
  { value: "7", label: "7 dias" },
  { value: "15", label: "15 dias" },
  { value: "30", label: "30 dias" },
];

const initialForm = {
  nome: "",
  email: "",
  tipo: "clt",
  cargo: "",
  departamento: "",
  grupo_acesso_id: "",
  lider_direto_id: "",
  salario_previsto: "",
  data_inicio_prevista: undefined as Date | undefined,
  prazo_dias: "7",
  observacoes_colaborador: "",
};

export default function ConvitesCadastro() {
  const navigate = useNavigate();
  const { user, hasAnyRole } = useAuth();
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Convite | null>(null);
  const [viewTarget, setViewTarget] = useState<Convite | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [liderSearch, setLiderSearch] = useState("");

  const { data: departamentos } = useParametros("departamento");
  const { data: cargos } = useParametros("cargo");

  const canSeeSensitive = hasAnyRole(["super_admin", "admin_rh"]);

  // Fetch grupos de acesso
  const [gruposAcesso, setGruposAcesso] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("grupos_acesso").select("*").eq("ativo", true).order("nome").then(({ data }) => {
      setGruposAcesso((data || []) as any[]);
    });
  }, []);

  // Fetch líderes (colaboradores + PJ ativos com user_id)
  const [lideres, setLideres] = useState<LiderOption[]>([]);
  useEffect(() => {
    const fetchLideres = async () => {
      const [cltRes, pjRes] = await Promise.all([
        supabase.from("colaboradores_clt").select("user_id, nome_completo, cargo").eq("status", "ativo").not("user_id", "is", null),
        supabase.from("contratos_pj").select("user_id, contato_nome, tipo_servico").eq("status", "ativo").not("user_id", "is", null),
      ]);
      const options: LiderOption[] = [];
      // Get profiles for mapping
      const userIds = [
        ...(cltRes.data || []).map(c => c.user_id),
        ...(pjRes.data || []).map(c => c.user_id),
      ].filter(Boolean);
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, user_id").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p.id]));
        
        for (const c of cltRes.data || []) {
          const pid = profileMap.get(c.user_id!);
          if (pid) options.push({ profile_id: pid, user_id: c.user_id!, nome: c.nome_completo, cargo: c.cargo, tipo: "clt" });
        }
        for (const c of pjRes.data || []) {
          const pid = profileMap.get(c.user_id!);
          if (pid) options.push({ profile_id: pid, user_id: c.user_id!, nome: c.contato_nome, cargo: c.tipo_servico, tipo: "pj" });
        }
      }
      setLideres(options);
    };
    fetchLideres();
  }, []);

  const filteredLideres = useMemo(() => {
    if (!liderSearch) return lideres;
    const s = liderSearch.toLowerCase();
    return lideres.filter(l => l.nome.toLowerCase().includes(s) || l.cargo.toLowerCase().includes(s));
  }, [lideres, liderSearch]);

  const filteredGrupos = useMemo(() => {
    return gruposAcesso.filter(g => g.tipo_colaborador === form.tipo || g.tipo_colaborador === "ambos");
  }, [gruposAcesso, form.tipo]);

  // Reset grupo when tipo changes
  useEffect(() => {
    const currentGroup = gruposAcesso.find(g => g.id === form.grupo_acesso_id);
    if (currentGroup && currentGroup.tipo_colaborador !== form.tipo && currentGroup.tipo_colaborador !== "ambos") {
      setForm(f => ({ ...f, grupo_acesso_id: "" }));
    }
  }, [form.tipo, form.grupo_acesso_id, gruposAcesso]);

  const expirationDate = useMemo(() => {
    return addDays(new Date(), parseInt(form.prazo_dias));
  }, [form.prazo_dias]);

  const canSubmit = form.nome.trim() && form.email.trim() && form.tipo && form.cargo && form.grupo_acesso_id;

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
    if (!canSubmit) { toast.error("Preencha todos os campos obrigatórios"); return; }
    setSaving(true);
    try {
      const prazoDias = parseInt(form.prazo_dias);
      const expiraEm = addDays(new Date(), prazoDias).toISOString();

      const insertData: any = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        tipo: form.tipo,
        cargo: form.cargo || null,
        departamento: form.departamento || null,
        criado_por: user?.id || null,
        grupo_acesso_id: form.grupo_acesso_id || null,
        lider_direto_id: form.lider_direto_id || null,
        data_inicio_prevista: form.data_inicio_prevista ? format(form.data_inicio_prevista, "yyyy-MM-dd") : null,
        prazo_dias: prazoDias,
        observacoes_colaborador: form.observacoes_colaborador.trim() || null,
        expira_em: expiraEm,
      };

      if (canSeeSensitive && form.salario_previsto) {
        insertData.salario_previsto = parseFloat(form.salario_previsto);
      }

      const { data, error } = await supabase
        .from("convites_cadastro")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // If líder direto selected, send notification
      if (form.lider_direto_id) {
        const lider = lideres.find(l => l.profile_id === form.lider_direto_id);
        if (lider) {
          const dataInicioText = form.data_inicio_prevista
            ? format(form.data_inicio_prevista, "dd/MM/yyyy")
            : "data a definir";
          
          await supabase.from("notificacoes_rh").insert({
            tipo: "novo_colaborador_time",
            titulo: "Novo colaborador chegando para o seu time",
            mensagem: `Um novo colaborador está chegando para o seu time: ${form.nome.trim()}, previsto para ${dataInicioText}`,
            link: "/convites-cadastro",
            user_id: lider.user_id,
          });
        }
      }

      toast.success("Convite criado com sucesso!");
      setFormOpen(false);
      setForm(initialForm);
      setLiderSearch("");
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

      const { error: updateError } = await supabase
        .from("convites_cadastro")
        .update({ status: "email_enviado" })
        .eq("id", convite.id);
      
      if (updateError) console.error("Erro ao atualizar status do convite:", updateError);

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
            <p className="text-2xl font-bold text-info">{emailEnviadoCount}</p>
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

      {/* New Invite Dialog — Improved */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setForm(initialForm); setLiderSearch(""); } setFormOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Novo Convite de Pré-Cadastro</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
            <div className="space-y-6 py-4">
              {/* Section 1: Dados Básicos */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados Básicos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Colaborador/Prestador *</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                  </div>
                </div>
                <div>
                  <Label>Tipo de Contratação *</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clt">CLT</SelectItem>
                      <SelectItem value="pj">PJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Section 2: Dados da Vaga */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados da Vaga</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Cargo *</Label>
                    {cargos && cargos.length > 0 ? (
                      <Select value={form.cargo} onValueChange={(v) => setForm({ ...form, cargo: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                        <SelectContent>
                          {cargos.map((c) => <SelectItem key={c.valor} value={c.valor}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Cargo previsto" />
                    )}
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
                </div>
                <div>
                  <Label>Líder Direto</Label>
                  <Select value={form.lider_direto_id} onValueChange={(v) => setForm({ ...form, lider_direto_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sem líder direto por enquanto" /></SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <Input
                          placeholder="Buscar por nome ou cargo..."
                          value={liderSearch}
                          onChange={(e) => setLiderSearch(e.target.value)}
                          className="h-8"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <SelectItem value="none">Sem líder direto por enquanto</SelectItem>
                      {filteredLideres.map((l) => (
                        <SelectItem key={l.profile_id} value={l.profile_id}>
                          {l.nome} — {l.cargo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grupo de Acesso *</Label>
                  <Select value={form.grupo_acesso_id} onValueChange={(v) => setForm({ ...form, grupo_acesso_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o grupo de acesso" /></SelectTrigger>
                    <SelectContent>
                      {filteredGrupos.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Define o role automático ao ativar o colaborador</p>
                </div>
              </div>

              {/* Section 3: Dados Sensíveis (only super_admin / admin_rh) */}
              {canSeeSensitive && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Dados Sensíveis
                  </h3>
                  <div>
                    <Label className="flex items-center gap-2">
                      {form.tipo === "clt" ? "Salário Base (R$)" : "Valor Mensal (R$)"}
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Dado sensível
                      </span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.salario_previsto}
                      onChange={(e) => setForm({ ...form, salario_previsto: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                </div>
              )}

              {/* Section 4: Configurações do Convite */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Configurações do Convite</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Início Prevista</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !form.data_inicio_prevista && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.data_inicio_prevista ? format(form.data_inicio_prevista, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.data_inicio_prevista}
                          onSelect={(d) => setForm({ ...form, data_inicio_prevista: d })}
                          locale={ptBR}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Prazo do Convite</Label>
                    <Select value={form.prazo_dias} onValueChange={(v) => setForm({ ...form, prazo_dias: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRAZO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Expira em: {format(expirationDate, "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Observações para o colaborador</Label>
                  <Textarea
                    value={form.observacoes_colaborador}
                    onChange={(e) => setForm({ ...form, observacoes_colaborador: e.target.value })}
                    placeholder="Instruções ou informações que serão exibidas na ficha pública de pré-cadastro..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 pb-6 pt-2 border-t">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !canSubmit}>
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
