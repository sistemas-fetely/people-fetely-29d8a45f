import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Briefcase, Plus, Search, MoreHorizontal, Eye, Edit, Trash2,
  FileCheck, FileClock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useParametros } from "@/hooks/useParametros";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";

const statusMap: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  renovado: "Renovado",
};

const statusStyles: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground border-0",
  ativo: "bg-success/10 text-success border-0",
  suspenso: "bg-warning/10 text-warning border-0",
  encerrado: "bg-destructive/10 text-destructive border-0",
  renovado: "bg-info/10 text-info border-0",
};

interface ContratoPJ {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
  contato_nome: string;
  contato_telefone: string | null;
  contato_email: string | null;
  objeto: string | null;
  tipo_servico: string;
  departamento: string;
  valor_mensal: number;
  forma_pagamento: string;
  dia_vencimento: number | null;
  data_inicio: string;
  data_fim: string | null;
  renovacao_automatica: boolean;
  banco_nome: string | null;
  banco_codigo: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  chave_pix: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
}

function ContratoPJForm({
  open, onClose, contrato, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  contrato: ContratoPJ | null;
  onSaved: () => void;
}) {
  const { data: tiposServico, isLoading: loadingTipos } = useParametros("tipo_servico");
  const { data: formasPagamento, isLoading: loadingFormas } = useParametros("forma_pagamento");
  const { data: departamentos, isLoading: loadingDepts } = useParametros("departamento");

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cnpj: contrato?.cnpj || "",
    razao_social: contrato?.razao_social || "",
    nome_fantasia: contrato?.nome_fantasia || "",
    inscricao_municipal: contrato?.inscricao_municipal || "",
    inscricao_estadual: contrato?.inscricao_estadual || "",
    contato_nome: contrato?.contato_nome || "",
    contato_telefone: contrato?.contato_telefone || "",
    contato_email: contrato?.contato_email || "",
    objeto: contrato?.objeto || "",
    tipo_servico: contrato?.tipo_servico || "",
    departamento: contrato?.departamento || "",
    valor_mensal: contrato?.valor_mensal?.toString() || "",
    forma_pagamento: contrato?.forma_pagamento || "transferencia",
    dia_vencimento: contrato?.dia_vencimento?.toString() || "10",
    data_inicio: contrato?.data_inicio || "",
    data_fim: contrato?.data_fim || "",
    renovacao_automatica: contrato?.renovacao_automatica || false,
    banco_nome: contrato?.banco_nome || "",
    banco_codigo: contrato?.banco_codigo || "",
    agencia: contrato?.agencia || "",
    conta: contrato?.conta || "",
    tipo_conta: contrato?.tipo_conta || "corrente",
    chave_pix: contrato?.chave_pix || "",
    observacoes: contrato?.observacoes || "",
    status: contrato?.status || "rascunho",
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.cnpj.trim()) { toast.error("CNPJ é obrigatório"); return; }
    if (!form.razao_social.trim()) { toast.error("Razão Social é obrigatória"); return; }
    if (!form.contato_nome.trim()) { toast.error("Nome do contato é obrigatório"); return; }
    if (!form.tipo_servico) { toast.error("Tipo de serviço é obrigatório"); return; }
    if (!form.departamento) { toast.error("Departamento é obrigatório"); return; }
    if (!form.valor_mensal) { toast.error("Valor mensal é obrigatório"); return; }
    if (!form.data_inicio) { toast.error("Data de início é obrigatória"); return; }

    setSaving(true);
    const payload = {
      cnpj: form.cnpj.trim(),
      razao_social: form.razao_social.trim(),
      nome_fantasia: form.nome_fantasia.trim() || null,
      inscricao_municipal: form.inscricao_municipal.trim() || null,
      inscricao_estadual: form.inscricao_estadual.trim() || null,
      contato_nome: form.contato_nome.trim(),
      contato_telefone: form.contato_telefone.trim() || null,
      contato_email: form.contato_email.trim() || null,
      objeto: form.objeto.trim() || null,
      tipo_servico: form.tipo_servico,
      departamento: form.departamento,
      valor_mensal: Number(form.valor_mensal),
      forma_pagamento: form.forma_pagamento,
      dia_vencimento: Number(form.dia_vencimento) || 10,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim || null,
      renovacao_automatica: form.renovacao_automatica,
      banco_nome: form.banco_nome.trim() || null,
      banco_codigo: form.banco_codigo.trim() || null,
      agencia: form.agencia.trim() || null,
      conta: form.conta.trim() || null,
      tipo_conta: form.tipo_conta || null,
      chave_pix: form.chave_pix.trim() || null,
      observacoes: form.observacoes.trim() || null,
      status: form.status,
    };

    try {
      if (contrato) {
        const { error } = await supabase.from("contratos_pj").update(payload as any).eq("id", contrato.id);
        if (error) throw error;
        toast.success("Contrato atualizado!");
      } else {
        const { error } = await supabase.from("contratos_pj").insert(payload as any);
        if (error) throw error;
        toast.success("Contrato cadastrado!");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contrato ? "Editar Contrato PJ" : "Novo Contrato PJ"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Dados da Empresa */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">DADOS DA EMPRESA</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>CNPJ *</Label>
                <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label>Razão Social *</Label>
                <Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} />
              </div>
              <div>
                <Label>Nome Fantasia</Label>
                <Input value={form.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} />
              </div>
              <div>
                <Label>Inscrição Municipal</Label>
                <Input value={form.inscricao_municipal} onChange={(e) => set("inscricao_municipal", e.target.value)} />
              </div>
              <div>
                <Label>Inscrição Estadual</Label>
                <Input value={form.inscricao_estadual} onChange={(e) => set("inscricao_estadual", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">CONTATO</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Nome do Responsável *</Label>
                <Input value={form.contato_nome} onChange={(e) => set("contato_nome", e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.contato_telefone} onChange={(e) => set("contato_telefone", e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.contato_email} onChange={(e) => set("contato_email", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contrato */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">CONTRATO</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Tipo de Serviço *</Label>
                {loadingTipos ? <Loader2 className="h-4 w-4 animate-spin mt-2" /> : (
                  <Select value={form.tipo_servico} onValueChange={(v) => set("tipo_servico", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(tiposServico || []).map((t) => (
                        <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>Departamento *</Label>
                {loadingDepts ? <Loader2 className="h-4 w-4 animate-spin mt-2" /> : (
                  <Select value={form.departamento} onValueChange={(v) => set("departamento", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(departamentos || []).map((d) => (
                        <SelectItem key={d.id} value={d.label}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>Valor Mensal (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => set("valor_mensal", e.target.value)} />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                {loadingFormas ? <Loader2 className="h-4 w-4 animate-spin mt-2" /> : (
                  <Select value={form.forma_pagamento} onValueChange={(v) => set("forma_pagamento", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(formasPagamento || []).map((f) => (
                        <SelectItem key={f.id} value={f.valor}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>Dia do Vencimento</Label>
                <Input type="number" min="1" max="31" value={form.dia_vencimento} onChange={(e) => set("dia_vencimento", e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Vigência */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">VIGÊNCIA</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Data de Início *</Label>
                <Input type="date" value={form.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} />
              </div>
              <div>
                <Label>Data de Fim</Label>
                <Input type="date" value={form.data_fim} onChange={(e) => set("data_fim", e.target.value)} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={form.renovacao_automatica} onCheckedChange={(v) => set("renovacao_automatica", v)} />
                <Label className="cursor-pointer">Renovação automática</Label>
              </div>
            </div>
          </div>

          {/* Dados Bancários */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">DADOS BANCÁRIOS DO PRESTADOR</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Banco</Label>
                <Input value={form.banco_nome} onChange={(e) => set("banco_nome", e.target.value)} />
              </div>
              <div>
                <Label>Código Banco</Label>
                <Input value={form.banco_codigo} onChange={(e) => set("banco_codigo", e.target.value)} />
              </div>
              <div>
                <Label>Agência</Label>
                <Input value={form.agencia} onChange={(e) => set("agencia", e.target.value)} />
              </div>
              <div>
                <Label>Conta</Label>
                <Input value={form.conta} onChange={(e) => set("conta", e.target.value)} />
              </div>
              <div>
                <Label>Tipo de Conta</Label>
                <Select value={form.tipo_conta} onValueChange={(v) => set("tipo_conta", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chave PIX</Label>
                <Input value={form.chave_pix} onChange={(e) => set("chave_pix", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Objeto e Observações */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">DETALHES</h3>
            <div className="space-y-4">
              <div>
                <Label>Objeto do Contrato</Label>
                <Textarea value={form.objeto} onChange={(e) => set("objeto", e.target.value)} placeholder="Descrição do escopo dos serviços..." rows={3} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ContratosPJ() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contratos, setContratos] = useState<ContratoPJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [formOpen, setFormOpen] = useState(searchParams.get("novo") === "true");
  const [editContrato, setEditContrato] = useState<ContratoPJ | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContratoPJ | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContratos = async () => {
    const { data } = await supabase
      .from("contratos_pj")
      .select("*")
      .order("razao_social");
    setContratos((data as ContratoPJ[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchContratos(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("contratos_pj").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Contrato excluído");
      setContratos((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const [viewContrato, setViewContrato] = useState<ContratoPJ | null>(null);

  const openNew = () => { setEditContrato(null); setFormOpen(true); };
  const openEdit = (c: ContratoPJ) => { setEditContrato(c); setFormOpen(true); };

  const totalAtivos = contratos.filter((c) => c.status === "ativo").length;
  const totalValor = contratos
    .filter((c) => c.status === "ativo")
    .reduce((sum, c) => sum + Number(c.valor_mensal), 0);

  const filtered = contratos.filter((c) => {
    const matchSearch =
      c.razao_social.toLowerCase().includes(search.toLowerCase()) ||
      (c.nome_fantasia || "").toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj.includes(search) ||
      c.contato_nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos PJ</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão de contratos de prestadores de serviço</p>
        </div>
        <Button className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contratos.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAtivos}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <FileClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">Valor mensal ativo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empresa, CNPJ ou contato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(statusMap).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Empresa</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">CNPJ</TableHead>
                  <TableHead className="font-semibold">Serviço</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Departamento</TableHead>
                  <TableHead className="font-semibold">Valor Mensal</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Vigência</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum contrato encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setViewContrato(c)}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{c.nome_fantasia || c.razao_social}</p>
                          {c.nome_fantasia && (
                            <p className="text-xs text-muted-foreground">{c.razao_social}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell font-mono">{c.cnpj}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-0">{c.tipo_servico}</Badge>
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">{c.departamento}</TableCell>
                      <TableCell className="text-sm font-medium">
                        R$ {Number(c.valor_mensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[c.status] || ""}>
                          {statusMap[c.status] || c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                        {format(parseISO(c.data_inicio), "dd/MM/yyyy")}
                        {c.data_fim && ` — ${format(parseISO(c.data_fim), "dd/MM/yyyy")}`}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(c)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Mostrando {filtered.length} de {contratos.length} contratos
            </p>
          </div>
        </CardContent>
      </Card>

      {formOpen && (
        <ContratoPJForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          contrato={editContrato}
          onSaved={fetchContratos}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contrato de <strong>{deleteTarget?.razao_social}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
