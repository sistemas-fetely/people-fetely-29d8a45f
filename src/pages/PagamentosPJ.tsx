import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard, Search, MoreHorizontal, Eye, Edit, Trash2, Plus, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const formatCompetencia = (c: string) => {
  if (/^\d{4}-\d{2}$/.test(c)) return format(parseISO(`${c}-01`), "MM/yyyy");
  if (/^\d{6}$/.test(c)) return `${c.slice(0, 2)}/${c.slice(2)}`;
  return c;
};

const statusMap: Record<string, string> = {
  pendente: "Pendente", aprovada: "Aprovada", enviada_pagamento: "Enviada para Pagamento",
  paga: "Paga", pago: "Pago", cancelada: "Cancelada", cancelado: "Cancelado", vencida: "Vencida",
};
const statusStyles: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-0",
  aprovada: "bg-info/10 text-info border-0",
  enviada_pagamento: "bg-primary/10 text-primary border-0",
  paga: "bg-success/10 text-success border-0",
  pago: "bg-success/10 text-success border-0",
  cancelada: "bg-destructive/10 text-destructive border-0",
  cancelado: "bg-destructive/10 text-destructive border-0",
  vencida: "bg-destructive/10 text-destructive border-0",
};

interface PagamentoComContrato {
  id: string;
  contrato_id: string;
  nota_fiscal_id: string | null;
  valor: number;
  data_pagamento: string | null;
  data_prevista: string;
  competencia: string;
  forma_pagamento: string;
  comprovante_url: string | null;
  observacoes: string | null;
  status: string;
  contrato_nome: string;
  nf_numero: string | null;
}

interface ContratoPJOption {
  id: string;
  label: string;
}

export default function PagamentosPJ() {
  const navigate = useNavigate();
  const [pagamentos, setPagamentos] = useState<PagamentoComContrato[]>([]);
  const [contratos, setContratos] = useState<ContratoPJOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterContrato, setFilterContrato] = useState("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editPag, setEditPag] = useState<PagamentoComContrato | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PagamentoComContrato | null>(null);

  const fetchData = async () => {
    const [{ data: pags }, { data: cps }] = await Promise.all([
      supabase.from("pagamentos_pj").select("*, notas_fiscais_pj(numero)").order("data_prevista", { ascending: false }),
      supabase.from("contratos_pj").select("id, razao_social, nome_fantasia").order("razao_social"),
    ]);

    const contratoMap = new Map((cps || []).map((c) => [c.id, c]));
    const mapped: PagamentoComContrato[] = (pags || []).map((p: any) => {
      const c = contratoMap.get(p.contrato_id);
      return { ...p, contrato_nome: c ? (c.nome_fantasia || c.razao_social) : "—", nf_numero: p.notas_fiscais_pj?.numero || null };
    });
    setPagamentos(mapped);
    setContratos((cps || []).map((c) => ({ id: c.id, label: c.nome_fantasia || c.razao_social })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = pagamentos.filter((p) => {
    const matchSearch =
      p.contrato_nome.toLowerCase().includes(search.toLowerCase()) ||
      p.competencia.includes(search);
    const matchStatus = filterStatus === "todos" || p.status === filterStatus;
    const matchContrato = filterContrato === "todos" || p.contrato_id === filterContrato;
    return matchSearch && matchStatus && matchContrato;
  });

  const pendingStatuses = ["pendente", "aprovada", "enviada_pagamento"];
  const paidStatuses = ["paga", "pago"];

  const totalPendentes = pagamentos.filter((p) => pendingStatuses.includes(p.status)).length;
  const totalPagos = pagamentos.filter((p) => paidStatuses.includes(p.status)).length;
  const totalValorPago = pagamentos.filter((p) => paidStatuses.includes(p.status)).reduce((acc, p) => acc + Number(p.valor), 0);
  const totalValorPendente = pagamentos.filter((p) => pendingStatuses.includes(p.status)).reduce((acc, p) => acc + Number(p.valor), 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("pagamentos_pj").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Pagamento excluído"); fetchData(); }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagamentos PJ</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de pagamentos a prestadores de serviço</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditPag(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo Pagamento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <Card className="card-shadow"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">{pagamentos.length}</p><p className="text-xs text-muted-foreground">Total</p></div>
        </CardContent></Card>
        <Card className="card-shadow"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning"><CreditCard className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">{totalPendentes}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
        </CardContent></Card>
        <Card className="card-shadow"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><CreditCard className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">R$ {totalValorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground">Total Pago</p></div>
        </CardContent></Card>
        <Card className="card-shadow"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><CreditCard className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">R$ {totalValorPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground">A Pagar</p></div>
        </CardContent></Card>
      </div>

      {/* Filters + Table */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por contrato ou competência..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filterContrato} onValueChange={setFilterContrato}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Contrato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Contratos</SelectItem>
                {contratos.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Contrato</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Nº NF</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Competência</TableHead>
                  <TableHead className="font-semibold">Data Prevista</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Data Pgto</TableHead>
                  <TableHead className="font-semibold">Valor</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Forma</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum pagamento encontrado.</TableCell></TableRow>
                ) : filtered.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/pagamentos-pj/${p.contrato_id}`)}>
                    <TableCell className="font-medium text-sm">{p.contrato_nome}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{p.nf_numero || "—"}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{formatCompetencia(p.competencia)}</TableCell>
                    <TableCell className="text-sm">{format(parseISO(p.data_prevista), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{p.data_pagamento ? format(parseISO(p.data_pagamento), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{p.forma_pagamento}</TableCell>
                    <TableCell><Badge variant="outline" className={statusStyles[p.status] || ""}>{statusMap[p.status] || p.status}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/contratos-pj/${p.contrato_id}`)}><Eye className="mr-2 h-4 w-4" /> Ver Contrato</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditPag(p); setFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">Mostrando {filtered.length} de {pagamentos.length} pagamentos</p>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {formOpen && (
        <PagamentoFormDialog open={formOpen} onClose={() => setFormOpen(false)} pagamento={editPag} contratos={contratos} onSaved={fetchData} />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Excluir este pagamento?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PagamentoFormDialog({ open, onClose, pagamento, contratos, onSaved }: {
  open: boolean; onClose: () => void; pagamento: PagamentoComContrato | null; contratos: ContratoPJOption[]; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contrato_id: pagamento?.contrato_id || "",
    valor: pagamento?.valor?.toString() || "", data_prevista: pagamento?.data_prevista || "",
    data_pagamento: pagamento?.data_pagamento || "", competencia: pagamento?.competencia || "",
    forma_pagamento: pagamento?.forma_pagamento || "transferencia",
    status: pagamento?.status || "pendente", observacoes: pagamento?.observacoes || "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.contrato_id || !form.valor || !form.data_prevista || !form.competencia) {
      toast.error("Preencha os campos obrigatórios"); return;
    }
    setSaving(true);
    const payload = {
      contrato_id: form.contrato_id, valor: Number(form.valor), data_prevista: form.data_prevista,
      data_pagamento: form.data_pagamento || null, competencia: form.competencia.trim(),
      forma_pagamento: form.forma_pagamento, status: form.status,
      observacoes: form.observacoes.trim() || null,
    };
    try {
      if (pagamento) {
        const { error } = await supabase.from("pagamentos_pj").update(payload as any).eq("id", pagamento.id);
        if (error) throw error;
        toast.success("Pagamento atualizado!");
      } else {
        const { error } = await supabase.from("pagamentos_pj").insert(payload as any);
        if (error) throw error;
        toast.success("Pagamento cadastrado!");
      }
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{pagamento ? "Editar Pagamento" : "Novo Pagamento"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label>Contrato *</Label>
            <Select value={form.contrato_id} onValueChange={(v) => set("contrato_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
              <SelectContent>
                {contratos.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => set("valor", e.target.value)} /></div>
          <div><Label>Competência *</Label><Input type="month" value={form.competencia} onChange={(e) => set("competencia", e.target.value)} /></div>
          <div><Label>Data Prevista *</Label><Input type="date" value={form.data_prevista} onChange={(e) => set("data_prevista", e.target.value)} /></div>
          <div><Label>Data Pagamento</Label><Input type="date" value={form.data_pagamento} onChange={(e) => set("data_pagamento", e.target.value)} /></div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={form.forma_pagamento} onValueChange={(v) => set("forma_pagamento", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
