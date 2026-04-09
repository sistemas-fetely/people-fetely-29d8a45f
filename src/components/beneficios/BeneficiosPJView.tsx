import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Award, Plus, Pencil, Trash2, Search, Heart, Bus, UtensilsCrossed,
  Shield, Smile, LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useBeneficiosPJ, useCriarBeneficioPJ, useEditarBeneficioPJ, useExcluirBeneficioPJ,
  type BeneficioPJComContrato,
} from "@/hooks/useBeneficiosPJ";

const TIPOS: Record<string, { label: string; icon: any }> = {
  vt: { label: "Vale Transporte", icon: Bus },
  vr: { label: "Vale Refeição", icon: UtensilsCrossed },
  va: { label: "Vale Alimentação", icon: UtensilsCrossed },
  plano_saude: { label: "Plano de Saúde", icon: Heart },
  plano_odontologico: { label: "Plano Odontológico", icon: Smile },
  seguro_vida: { label: "Seguro de Vida", icon: Shield },
  outros: { label: "Outros", icon: LifeBuoy },
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  suspenso: { label: "Suspenso", variant: "secondary" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

function formatCurrency(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  canManage: boolean;
  isAdmin: boolean;
}

export function BeneficiosPJView({ canManage, isAdmin }: Props) {
  const { data: beneficios = [], isLoading } = useBeneficiosPJ();
  const criarMut = useCriarBeneficioPJ();
  const editarMut = useEditarBeneficioPJ();
  const excluirMut = useExcluirBeneficioPJ();

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BeneficioPJComContrato | null>(null);

  const [formContratoId, setFormContratoId] = useState("");
  const [formTipo, setFormTipo] = useState("plano_saude");
  const [formDescricao, setFormDescricao] = useState("");
  const [formOperadora, setFormOperadora] = useState("");
  const [formNumeroCartao, setFormNumeroCartao] = useState("");
  const [formValorEmpresa, setFormValorEmpresa] = useState(0);
  const [formValorDesconto, setFormValorDesconto] = useState(0);
  const [formDataInicio, setFormDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [formDataFim, setFormDataFim] = useState("");
  const [formStatus, setFormStatus] = useState("ativo");
  const [formObs, setFormObs] = useState("");

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos_pj_select_beneficios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos_pj")
        .select("id, contato_nome, departamento, tipo_servico")
        .eq("status", "ativo")
        .order("contato_nome");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    return beneficios.filter((b) => {
      const matchBusca =
        (b.contrato?.contato_nome ?? "").toLowerCase().includes(busca.toLowerCase()) ||
        (b.operadora ?? "").toLowerCase().includes(busca.toLowerCase()) ||
        (b.contrato?.departamento ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchTipo = filtroTipo === "todos" || b.tipo === filtroTipo;
      return matchBusca && matchTipo;
    });
  }, [beneficios, busca, filtroTipo]);

  const totalAtivos = beneficios.filter((b) => b.status === "ativo").length;
  const custoEmpresa = beneficios.filter((b) => b.status === "ativo").reduce((s, b) => s + Number(b.valor_empresa), 0);
  const descontoTotal = beneficios.filter((b) => b.status === "ativo").reduce((s, b) => s + Number(b.valor_desconto), 0);
  const contratosComBeneficio = new Set(beneficios.filter((b) => b.status === "ativo").map((b) => b.contrato_id)).size;

  const resetForm = () => {
    setFormContratoId(""); setFormTipo("plano_saude"); setFormDescricao(""); setFormOperadora("");
    setFormNumeroCartao(""); setFormValorEmpresa(0); setFormValorDesconto(0);
    setFormDataInicio(new Date().toISOString().slice(0, 10)); setFormDataFim("");
    setFormStatus("ativo"); setFormObs(""); setEditing(null);
  };

  const openNew = () => { resetForm(); setShowForm(true); };

  const openEdit = (b: BeneficioPJComContrato) => {
    setEditing(b); setFormContratoId(b.contrato_id); setFormTipo(b.tipo);
    setFormDescricao(b.descricao || ""); setFormOperadora(b.operadora || "");
    setFormNumeroCartao(b.numero_cartao || ""); setFormValorEmpresa(Number(b.valor_empresa));
    setFormValorDesconto(Number(b.valor_desconto)); setFormDataInicio(b.data_inicio);
    setFormDataFim(b.data_fim || ""); setFormStatus(b.status); setFormObs(b.observacoes || "");
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editing) {
      editarMut.mutate({
        id: editing.id, tipo: formTipo, descricao: formDescricao || null,
        operadora: formOperadora || null, numero_cartao: formNumeroCartao || null,
        valor_empresa: formValorEmpresa, valor_desconto: formValorDesconto,
        data_inicio: formDataInicio, data_fim: formDataFim || null,
        status: formStatus, observacoes: formObs || null,
      }, { onSuccess: () => { setShowForm(false); resetForm(); } });
    } else {
      if (!formContratoId) return;
      criarMut.mutate({
        contrato_id: formContratoId, tipo: formTipo,
        descricao: formDescricao || undefined, operadora: formOperadora || undefined,
        numero_cartao: formNumeroCartao || undefined, valor_empresa: formValorEmpresa,
        valor_desconto: formValorDesconto, data_inicio: formDataInicio,
        data_fim: formDataFim || undefined, observacoes: formObs || undefined,
      }, { onSuccess: () => { setShowForm(false); resetForm(); } });
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Benefícios Ativos", value: totalAtivos, color: "text-blue-600 bg-blue-50" },
          { label: "Prestadores", value: contratosComBeneficio, color: "text-green-600 bg-green-50" },
          { label: "Custo Empresa/mês", value: formatCurrency(custoEmpresa), color: "text-orange-600 bg-orange-50" },
          { label: "Desconto Prestador/mês", value: formatCurrency(descontoTotal), color: "text-red-600 bg-red-50" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className={`rounded-lg p-2 ${k.color}`}><Award className="h-4 w-4" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar prestador ou operadora..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPOS).map(([key, t]) => (<SelectItem key={key} value={key}>{t.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canManage && (<Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Benefício</Button>)}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prestador</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Operadora</TableHead>
              <TableHead className="text-right">Valor Empresa</TableHead>
              <TableHead className="text-right">Desconto</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 9 : 8} className="text-center text-muted-foreground py-8">
                  {isLoading ? "Carregando..." : "Nenhum benefício encontrado"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => {
                const tipoInfo = TIPOS[b.tipo] || TIPOS.outros;
                const TipoIcon = tipoInfo.icon;
                const st = STATUS_MAP[b.status] || STATUS_MAP.ativo;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.contrato?.contato_nome}</TableCell>
                    <TableCell>{b.contrato?.departamento}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <TipoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{tipoInfo.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>{b.operadora || "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(b.valor_empresa))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(b.valor_desconto))}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(b.data_inicio), "dd/MM/yyyy")}
                      {b.data_fim ? ` — ${format(new Date(b.data_fim), "dd/MM/yyyy")}` : " — Indeterminado"}
                    </TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    {canManage && (
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => excluirMut.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Form */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm(); } else setShowForm(true); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Benefício" : "Novo Benefício PJ"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {!editing && (
              <div className="space-y-1">
                <Label>Prestador PJ *</Label>
                <Select value={formContratoId} onValueChange={setFormContratoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {contratos.map((c) => (<SelectItem key={c.id} value={c.id}>{c.contato_nome} — {c.departamento}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={formTipo} onValueChange={setFormTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIPOS).map(([key, t]) => (<SelectItem key={key} value={key}>{t.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              {editing && (
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(STATUS_MAP).map(([key, s]) => (<SelectItem key={key} value={key}>{s.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} placeholder="Ex: Plano Empresarial Plus" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Operadora / Fornecedor</Label>
                <Input value={formOperadora} onChange={(e) => setFormOperadora(e.target.value)} placeholder="Ex: Unimed" />
              </div>
              <div className="space-y-1">
                <Label>Nº Cartão / Matrícula</Label>
                <Input value={formNumeroCartao} onChange={(e) => setFormNumeroCartao(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valor Empresa (R$) *</Label>
                <Input type="number" step="0.01" min={0} value={formValorEmpresa} onChange={(e) => setFormValorEmpresa(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Desconto Prestador (R$)</Label>
                <Input type="number" step="0.01" min={0} value={formValorDesconto} onChange={(e) => setFormValorDesconto(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data Início *</Label>
                <Input type="date" value={formDataInicio} onChange={(e) => setFormDataInicio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Data Fim</Label>
                <Input type="date" value={formDataFim} onChange={(e) => setFormDataFim(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={formObs} onChange={(e) => setFormObs(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!editing && !formContratoId}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
