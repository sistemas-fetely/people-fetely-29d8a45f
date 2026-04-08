import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Building2, FileText, CreditCard, Plus, MoreHorizontal, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";

const statusContratoMap: Record<string, string> = {
  rascunho: "Rascunho", ativo: "Ativo", suspenso: "Suspenso", encerrado: "Encerrado", renovado: "Renovado",
};
const statusContratoStyles: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground border-0", ativo: "bg-success/10 text-success border-0",
  suspenso: "bg-warning/10 text-warning border-0", encerrado: "bg-destructive/10 text-destructive border-0",
  renovado: "bg-info/10 text-info border-0",
};

const statusNFMap: Record<string, string> = { pendente: "Pendente", paga: "Paga", cancelada: "Cancelada", vencida: "Vencida" };
const statusNFStyles: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-0", paga: "bg-success/10 text-success border-0",
  cancelada: "bg-destructive/10 text-destructive border-0", vencida: "bg-destructive/10 text-destructive border-0",
};

const statusPagMap: Record<string, string> = { pendente: "Pendente", pago: "Pago", cancelado: "Cancelado" };
const statusPagStyles: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-0", pago: "bg-success/10 text-success border-0",
  cancelado: "bg-destructive/10 text-destructive border-0",
};

interface ContratoPJ {
  id: string; cnpj: string; razao_social: string; nome_fantasia: string | null;
  inscricao_municipal: string | null; inscricao_estadual: string | null;
  contato_nome: string; contato_telefone: string | null; contato_email: string | null;
  objeto: string | null; tipo_servico: string; departamento: string;
  valor_mensal: number; forma_pagamento: string; dia_vencimento: number | null;
  data_inicio: string; data_fim: string | null; renovacao_automatica: boolean;
  banco_nome: string | null; banco_codigo: string | null; agencia: string | null;
  conta: string | null; tipo_conta: string | null; chave_pix: string | null;
  status: string; observacoes: string | null;
}

interface NotaFiscal {
  id: string; contrato_id: string; numero: string; serie: string | null;
  valor: number; data_emissao: string; data_vencimento: string | null;
  data_pagamento: string | null; competencia: string; descricao: string | null;
  arquivo_url: string | null; status: string; observacoes: string | null;
}

interface PagamentoPJ {
  id: string; contrato_id: string; nota_fiscal_id: string | null;
  valor: number; data_pagamento: string | null; data_prevista: string;
  competencia: string; forma_pagamento: string; comprovante_url: string | null;
  observacoes: string | null; status: string;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

// ─── Tab: Dados do Contrato ───
function TabDados({ contrato }: { contrato: ContratoPJ }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">DADOS DA EMPRESA</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoItem label="CNPJ" value={contrato.cnpj} />
          <InfoItem label="Razão Social" value={contrato.razao_social} />
          <InfoItem label="Nome Fantasia" value={contrato.nome_fantasia} />
          <InfoItem label="Inscrição Municipal" value={contrato.inscricao_municipal} />
          <InfoItem label="Inscrição Estadual" value={contrato.inscricao_estadual} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">CONTATO</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoItem label="Responsável" value={contrato.contato_nome} />
          <InfoItem label="Telefone" value={contrato.contato_telefone} />
          <InfoItem label="Email" value={contrato.contato_email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">CONTRATO</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoItem label="Tipo de Serviço" value={contrato.tipo_servico} />
          <InfoItem label="Departamento" value={contrato.departamento} />
          <InfoItem label="Valor Mensal" value={`R$ ${Number(contrato.valor_mensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
          <InfoItem label="Forma de Pagamento" value={contrato.forma_pagamento} />
          <InfoItem label="Dia Vencimento" value={contrato.dia_vencimento} />
          <InfoItem label="Status" value={<Badge variant="outline" className={statusContratoStyles[contrato.status] || ""}>{statusContratoMap[contrato.status] || contrato.status}</Badge>} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">VIGÊNCIA</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoItem label="Início" value={format(parseISO(contrato.data_inicio), "dd/MM/yyyy")} />
          <InfoItem label="Fim" value={contrato.data_fim ? format(parseISO(contrato.data_fim), "dd/MM/yyyy") : "Indeterminado"} />
          <InfoItem label="Renovação Automática" value={contrato.renovacao_automatica ? "Sim" : "Não"} />
        </CardContent>
      </Card>

      {(contrato.banco_nome || contrato.chave_pix) && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">DADOS BANCÁRIOS</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoItem label="Banco" value={contrato.banco_nome && `${contrato.banco_nome}${contrato.banco_codigo ? ` (${contrato.banco_codigo})` : ""}`} />
            <InfoItem label="Agência" value={contrato.agencia} />
            <InfoItem label="Conta" value={contrato.conta && `${contrato.conta}${contrato.tipo_conta ? ` (${contrato.tipo_conta})` : ""}`} />
            <InfoItem label="Chave PIX" value={contrato.chave_pix} />
          </CardContent>
        </Card>
      )}

      {(contrato.objeto || contrato.observacoes) && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">DETALHES</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contrato.objeto && <InfoItem label="Objeto do Contrato" value={contrato.objeto} />}
            {contrato.observacoes && <InfoItem label="Observações" value={contrato.observacoes} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Notas Fiscais ───
function TabNotasFiscais({ contratoId }: { contratoId: string }) {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editNota, setEditNota] = useState<NotaFiscal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotaFiscal | null>(null);

  const fetchNotas = async () => {
    const { data } = await supabase
      .from("notas_fiscais_pj")
      .select("*")
      .eq("contrato_id", contratoId)
      .order("data_emissao", { ascending: false });
    setNotas((data as NotaFiscal[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotas(); }, [contratoId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("notas_fiscais_pj").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Nota fiscal excluída"); fetchNotas(); }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Notas Fiscais</h3>
        <Button size="sm" className="gap-2" onClick={() => { setEditNota(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova NF
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Número</TableHead>
                <TableHead className="font-semibold">Competência</TableHead>
                <TableHead className="font-semibold">Emissão</TableHead>
                <TableHead className="font-semibold">Valor</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : notas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma nota fiscal cadastrada.</TableCell></TableRow>
              ) : notas.map((n) => (
                <TableRow key={n.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/notas-fiscais/${n.id}`)}>
                  <TableCell className="font-medium">{n.numero}{n.serie ? `/${n.serie}` : ""}</TableCell>
                  <TableCell>{n.competencia}</TableCell>
                  <TableCell>{format(parseISO(n.data_emissao), "dd/MM/yyyy")}</TableCell>
                  <TableCell>R$ {Number(n.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell><Badge variant="outline" className={statusNFStyles[n.status] || ""}>{statusNFMap[n.status] || n.status}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditNota(n); setFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(n)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {formOpen && <NotaFiscalForm open={formOpen} onClose={() => setFormOpen(false)} nota={editNota} contratoId={contratoId} onSaved={fetchNotas} />}

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

function NotaFiscalForm({ open, onClose, nota, contratoId, onSaved }: {
  open: boolean; onClose: () => void; nota: NotaFiscal | null; contratoId: string; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    numero: nota?.numero || "", serie: nota?.serie || "", valor: nota?.valor?.toString() || "",
    data_emissao: nota?.data_emissao || "", data_vencimento: nota?.data_vencimento || "",
    competencia: nota?.competencia || "", descricao: nota?.descricao || "",
    status: nota?.status || "pendente", observacoes: nota?.observacoes || "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.numero.trim() || !form.data_emissao || !form.valor || !form.competencia) {
      toast.error("Preencha os campos obrigatórios"); return;
    }
    setSaving(true);
    const payload = {
      contrato_id: contratoId, numero: form.numero.trim(), serie: form.serie.trim() || null,
      valor: Number(form.valor), data_emissao: form.data_emissao,
      data_vencimento: form.data_vencimento || null, competencia: form.competencia.trim(),
      descricao: form.descricao.trim() || null, status: form.status, observacoes: form.observacoes.trim() || null,
    };
    try {
      if (nota) {
        const { error } = await supabase.from("notas_fiscais_pj").update(payload as any).eq("id", nota.id);
        if (error) throw error;
        toast.success("Nota fiscal atualizada!");
      } else {
        const { error } = await supabase.from("notas_fiscais_pj").insert(payload as any);
        if (error) throw error;
        toast.success("Nota fiscal cadastrada!");
      }
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{nota ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
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
                {Object.entries(statusNFMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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

// ─── Tab: Pagamentos ───
function TabPagamentos({ contratoId }: { contratoId: string }) {
  const [pagamentos, setPagamentos] = useState<PagamentoPJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editPag, setEditPag] = useState<PagamentoPJ | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PagamentoPJ | null>(null);

  const fetchPagamentos = async () => {
    const { data } = await supabase
      .from("pagamentos_pj")
      .select("*")
      .eq("contrato_id", contratoId)
      .order("data_prevista", { ascending: false });
    setPagamentos((data as PagamentoPJ[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPagamentos(); }, [contratoId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("pagamentos_pj").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Pagamento excluído"); fetchPagamentos(); }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Pagamentos</h3>
        <Button size="sm" className="gap-2" onClick={() => { setEditPag(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo Pagamento
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Competência</TableHead>
                <TableHead className="font-semibold">Data Prevista</TableHead>
                <TableHead className="font-semibold">Data Pagamento</TableHead>
                <TableHead className="font-semibold">Valor</TableHead>
                <TableHead className="font-semibold">Forma</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : pagamentos.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum pagamento cadastrado.</TableCell></TableRow>
              ) : pagamentos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.competencia}</TableCell>
                  <TableCell>{format(parseISO(p.data_prevista), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{p.data_pagamento ? format(parseISO(p.data_pagamento), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell>R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-sm">{p.forma_pagamento}</TableCell>
                  <TableCell><Badge variant="outline" className={statusPagStyles[p.status] || ""}>{statusPagMap[p.status] || p.status}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditPag(p); setFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {formOpen && <PagamentoForm open={formOpen} onClose={() => setFormOpen(false)} pagamento={editPag} contratoId={contratoId} onSaved={fetchPagamentos} />}

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

function PagamentoForm({ open, onClose, pagamento, contratoId, onSaved }: {
  open: boolean; onClose: () => void; pagamento: PagamentoPJ | null; contratoId: string; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    valor: pagamento?.valor?.toString() || "", data_prevista: pagamento?.data_prevista || "",
    data_pagamento: pagamento?.data_pagamento || "", competencia: pagamento?.competencia || "",
    forma_pagamento: pagamento?.forma_pagamento || "transferencia",
    status: pagamento?.status || "pendente", observacoes: pagamento?.observacoes || "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.valor || !form.data_prevista || !form.competencia) {
      toast.error("Preencha os campos obrigatórios"); return;
    }
    setSaving(true);
    const payload = {
      contrato_id: contratoId, valor: Number(form.valor), data_prevista: form.data_prevista,
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
          <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => set("valor", e.target.value)} /></div>
          <div><Label>Competência *</Label><Input value={form.competencia} onChange={(e) => set("competencia", e.target.value)} placeholder="MM/AAAA" /></div>
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
                {Object.entries(statusPagMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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

// ─── Main Page ───
export default function ContratoPJDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState<ContratoPJ | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!id) return;
      const { data, error } = await supabase.from("contratos_pj").select("*").eq("id", id).single();
      if (error || !data) { toast.error("Contrato não encontrado"); navigate("/contratos-pj"); return; }
      setContrato(data as ContratoPJ);
      setLoading(false);
    }
    fetch();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!contrato) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contratos-pj")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {contrato.nome_fantasia || contrato.razao_social}
              </h1>
              <Badge variant="outline" className={statusContratoStyles[contrato.status] || ""}>
                {statusContratoMap[contrato.status] || contrato.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{contrato.cnpj} · {contrato.tipo_servico} · {contrato.departamento}</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => navigate(`/contratos-pj?edit=${contrato.id}`)}>
          <Edit className="h-4 w-4" /> Editar Contrato
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="dados" className="gap-2"><Building2 className="h-4 w-4" /> Dados</TabsTrigger>
          <TabsTrigger value="notas" className="gap-2"><FileText className="h-4 w-4" /> Notas Fiscais</TabsTrigger>
          <TabsTrigger value="pagamentos" className="gap-2"><CreditCard className="h-4 w-4" /> Pagamentos</TabsTrigger>
        </TabsList>
        <TabsContent value="dados" className="mt-6">
          <TabDados contrato={contrato} />
        </TabsContent>
        <TabsContent value="notas" className="mt-6">
          <TabNotasFiscais contratoId={contrato.id} />
        </TabsContent>
        <TabsContent value="pagamentos" className="mt-6">
          <TabPagamentos contratoId={contrato.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
