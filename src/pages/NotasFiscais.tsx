import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useParametros } from "@/hooks/useParametros";
import {
  FileText, Search, MoreHorizontal, Eye, Edit, Trash2, Plus, Loader2,
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

const defaultStatusMap: Record<string, string> = {
  pendente: "Pendente", aprovada: "Aprovada", enviada_pagamento: "Enviada para Pagamento", paga: "Paga", cancelada: "Cancelada", vencida: "Vencida",
};
const statusStyles: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-0",
  aprovada: "bg-info/10 text-info border-0",
  enviada_pagamento: "bg-primary/10 text-primary border-0",
  paga: "bg-success/10 text-success border-0",
  cancelada: "bg-destructive/10 text-destructive border-0",
  vencida: "bg-destructive/10 text-destructive border-0",
};

interface NotaComContrato {
  id: string;
  numero: string;
  serie: string | null;
  valor: number;
  data_emissao: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  competencia: string;
  descricao: string | null;
  arquivo_url: string | null;
  status: string;
  observacoes: string | null;
  contrato_id: string;
  contrato_nome: string;
  contrato_cnpj: string;
  pagamento_data_prevista: string | null;
  pagamento_forma: string | null;
}

interface ContratoPJOption {
  id: string;
  label: string;
}

export default function NotasFiscais() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: statusParams } = useParametros("status_nota_fiscal");
  const statusMap = useMemo(() => {
    if (statusParams && statusParams.length > 0) {
      return Object.fromEntries(statusParams.map((p) => [p.valor, p.label]));
    }
    return defaultStatusMap;
  }, [statusParams]);
  const [notas, setNotas] = useState<NotaComContrato[]>([]);
  const [contratos, setContratos] = useState<ContratoPJOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterContrato, setFilterContrato] = useState("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editNota, setEditNota] = useState<NotaComContrato | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotaComContrato | null>(null);

  const fetchData = async () => {
    const [{ data: nfs }, { data: cps }, { data: pags }] = await Promise.all([
      supabase.from("notas_fiscais_pj").select("*").order("data_emissao", { ascending: false }),
      supabase.from("contratos_pj").select("id, razao_social, nome_fantasia, cnpj").order("razao_social"),
      supabase.from("pagamentos_pj").select("nota_fiscal_id, data_prevista, forma_pagamento"),
    ]);

    const contratoMap = new Map((cps || []).map((c) => [c.id, c]));
    const pagMap = new Map((pags || []).map((p: any) => [p.nota_fiscal_id, p]));
    const mapped: NotaComContrato[] = (nfs || []).map((n: any) => {
      const c = contratoMap.get(n.contrato_id);
      const pag = pagMap.get(n.id);
      return {
        ...n,
        contrato_nome: c ? (c.nome_fantasia || c.razao_social) : "—",
        contrato_cnpj: c?.cnpj || "—",
        pagamento_data_prevista: pag?.data_prevista || null,
        pagamento_forma: pag?.forma_pagamento || null,
      };
    });
    setNotas(mapped);
    setContratos((cps || []).map((c) => ({ id: c.id, label: c.nome_fantasia || c.razao_social })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Handle ?edit=<id> query param from detail page
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && notas.length > 0) {
      const found = notas.find((n) => n.id === editId);
      if (found) {
        setEditNota(found);
        setFormOpen(true);
        setSearchParams({}, { replace: true });
      }
    }
  }, [notas, searchParams]);

  const filtered = notas.filter((n) => {
    const matchSearch =
      n.numero.toLowerCase().includes(search.toLowerCase()) ||
      n.contrato_nome.toLowerCase().includes(search.toLowerCase()) ||
      n.competencia.includes(search);
    const matchStatus = filterStatus === "todos" || n.status === filterStatus;
    const matchContrato = filterContrato === "todos" || n.contrato_id === filterContrato;
    return matchSearch && matchStatus && matchContrato;
  });

  const totalPendentes = notas.filter((n) => ["pendente", "aprovada", "enviada_pagamento"].includes(n.status)).length;
  const totalPagas = notas.filter((n) => n.status === "paga").length;
  const totalValor = notas.reduce((acc, n) => acc + Number(n.valor), 0);
  const totalValorPago = notas.filter((n) => n.status === "paga").reduce((acc, n) => acc + Number(n.valor), 0);
  const totalValorPendente = notas.filter((n) => ["pendente", "aprovada", "enviada_pagamento"].includes(n.status)).reduce((acc, n) => acc + Number(n.valor), 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("notas_fiscais_pj").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Nota fiscal excluída"); fetchData(); }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notas Fiscais</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão de notas fiscais de todos os contratos PJ</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditNota(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova NF
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <Card className="card-shadow"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">{notas.length}</p><p className="text-xs text-muted-foreground">Total NFs</p></div>
        </CardContent></Card>
        <Card className="card-shadow"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning"><FileText className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">{totalPendentes}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
        </CardContent></Card>
        <Card className="card-shadow"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><FileText className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">R$ {totalValorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground">Total Pago</p></div>
        </CardContent></Card>
        <Card className="card-shadow"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><FileText className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">R$ {totalValorPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground">A Pagar</p></div>
        </CardContent></Card>
      </div>

      {/* Filters + Table */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por número, contrato ou competência..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
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
                  <TableHead className="font-semibold">Número</TableHead>
                  <TableHead className="font-semibold">Contrato</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Competência</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Emissão</TableHead>
                  <TableHead className="font-semibold">Valor</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Vencimento</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Forma Pgto</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma nota fiscal encontrada.</TableCell></TableRow>
                ) : filtered.map((n) => (
                  <TableRow key={n.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/notas-fiscais/${n.id}`)}>
                    <TableCell className="font-medium">{n.numero}{n.serie ? `/${n.serie}` : ""}</TableCell>
                    <TableCell className="text-sm">{n.contrato_nome}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{n.competencia}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{format(parseISO(n.data_emissao), "dd/MM/yyyy")}</TableCell>
                    <TableCell>R$ {Number(n.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{n.data_vencimento ? format(parseISO(n.data_vencimento), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell capitalize">{n.pagamento_forma || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={statusStyles[n.status] || ""}>{statusMap[n.status] || n.status}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/contratos-pj/${n.contrato_id}`)}><Eye className="mr-2 h-4 w-4" /> Ver Contrato</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditNota(n); setFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(n)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">Mostrando {filtered.length} de {notas.length} notas fiscais</p>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {formOpen && (
        <NotaFiscalFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          nota={editNota}
          contratos={contratos}
          onSaved={fetchData}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Excluir a nota fiscal <strong>{deleteTarget?.numero}</strong>?</AlertDialogDescription>
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

function NotaFiscalFormDialog({ open, onClose, nota, contratos, onSaved }: {
  open: boolean; onClose: () => void; nota: NotaComContrato | null; contratos: ContratoPJOption[]; onSaved: () => void;
}) {
  const { data: statusParams } = useParametros("status_nota_fiscal");
  const statusMap = useMemo(() => {
    if (statusParams && statusParams.length > 0) {
      return Object.fromEntries(statusParams.map((p) => [p.valor, p.label]));
    }
    return defaultStatusMap;
  }, [statusParams]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contrato_id: nota?.contrato_id || "",
    numero: nota?.numero || "", serie: nota?.serie || "", valor: nota?.valor?.toString() || "",
    data_emissao: nota?.data_emissao || "", data_vencimento: nota?.data_vencimento || "",
    competencia: nota?.competencia || "", descricao: nota?.descricao || "",
    status: nota?.status || "pendente", observacoes: nota?.observacoes || "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.contrato_id || !form.numero.trim() || !form.data_emissao || !form.valor || !form.competencia) {
      toast.error("Preencha os campos obrigatórios"); return;
    }
    setSaving(true);
    const normalizedStatus = form.status === "enviada_p_pagamento" ? "enviada_pagamento" : form.status;
    const payload = {
      contrato_id: form.contrato_id, numero: form.numero.trim(), serie: form.serie.trim() || null,
      valor: Number(form.valor), data_emissao: form.data_emissao,
      data_vencimento: form.data_vencimento || null, competencia: form.competencia.trim(),
      descricao: form.descricao.trim() || null, status: normalizedStatus, observacoes: form.observacoes.trim() || null,
    };
    const previousStatus = nota?.status === "enviada_p_pagamento" ? "enviada_pagamento" : nota?.status;
    const isChangingToEnviada = normalizedStatus === "enviada_pagamento" && previousStatus !== "enviada_pagamento";
    try {
      let notaId = nota?.id;
      if (nota) {
        const { error } = await supabase.from("notas_fiscais_pj").update(payload as any).eq("id", nota.id);
        if (error) throw error;
        toast.success("Nota fiscal atualizada!");
      } else {
        const { data: inserted, error } = await supabase.from("notas_fiscais_pj").insert(payload as any).select("id").single();
        if (error) throw error;
        notaId = inserted?.id;
        toast.success("Nota fiscal cadastrada!");
      }

      if (notaId) {
        const { data: existingPagamento, error: existingPagamentoError } = await supabase
          .from("pagamentos_pj")
          .select("id")
          .eq("nota_fiscal_id", notaId)
          .limit(1)
          .maybeSingle();
        if (existingPagamentoError) throw existingPagamentoError;

        if (existingPagamento) {
          const { error: syncError } = await supabase
            .from("pagamentos_pj")
            .update({ status: normalizedStatus } as any)
            .eq("nota_fiscal_id", notaId);
          if (syncError) throw syncError;
        } else if (isChangingToEnviada) {
          const { data: contrato, error: contratoError } = await supabase
            .from("contratos_pj")
            .select("forma_pagamento")
            .eq("id", form.contrato_id)
            .single();
          if (contratoError) throw contratoError;

          const pagPayload = {
            contrato_id: form.contrato_id,
            nota_fiscal_id: notaId,
            valor: Number(form.valor),
            competencia: form.competencia.trim(),
            data_prevista: form.data_vencimento || form.data_emissao,
            forma_pagamento: contrato?.forma_pagamento || "transferencia",
            status: normalizedStatus,
            observacoes: `Pagamento gerado automaticamente a partir da NF ${form.numero.trim()}`,
          };
          const { error: pagError } = await supabase.from("pagamentos_pj").insert(pagPayload as any);
          if (pagError) throw pagError;
          toast.success("Pagamento PJ criado automaticamente!");
        }
      }

      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{nota ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}</DialogTitle></DialogHeader>
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
          <div><Label>Número *</Label><Input value={form.numero} onChange={(e) => set("numero", e.target.value)} /></div>
          <div><Label>Série</Label><Input value={form.serie} onChange={(e) => set("serie", e.target.value)} /></div>
          <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => set("valor", e.target.value)} /></div>
          <div><Label>Competência *</Label><Input value={form.competencia} onChange={(e) => set("competencia", e.target.value)} placeholder="MM/AAAA" /></div>
          <div><Label>Data Emissão *</Label><Input type="date" value={form.data_emissao} onChange={(e) => set("data_emissao", e.target.value)} /></div>
          <div><Label>Data Vencimento</Label><Input type="date" value={form.data_vencimento} onChange={(e) => set("data_vencimento", e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} rows={2} /></div>
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
