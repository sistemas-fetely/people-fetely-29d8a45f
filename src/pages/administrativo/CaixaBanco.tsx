import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  Search,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  FileWarning,
  Pencil,
  CreditCard,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { MarcarPagoDialog } from "@/components/financeiro/MarcarPagoDialog";
import { EditarLancamentoDialog } from "@/components/financeiro/EditarLancamentoDialog";
import ContaPagarDetalheDrawer from "@/components/financeiro/ContaPagarDetalheDrawer";

type Lancamento = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  pago_em: string | null;
  pago_em_conta_id: string | null;
  conciliado_em: string | null;
  movimentacao_bancaria_id: string | null;
  status_conta_pagar: string;
  status_caixa: "em_aberto" | "pago" | "conciliado";
  fornecedor_cliente: string | null;
  parceiro_id: string | null;
  forma_pagamento_id: string | null;
  unidade: string | null;
  nf_numero: string | null;
  origem_view: "conta_pagar" | "cartao_lancamento";
  fatura_id: string | null;
};

type ContaBancariaLite = {
  id: string;
  nome_exibicao: string;
  cor: string | null;
};

type FormaPgtoLite = {
  id: string;
  nome: string;
};

type Parceiro = {
  id: string;
  razao_social: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  em_aberto: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  pago: "bg-green-100 text-green-800 hover:bg-green-100",
  conciliado: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
};

const STATUS_LABEL: Record<string, string> = {
  em_aberto: "Em aberto",
  pago: "Pago",
  conciliado: "Conciliado",
};

const PAGE_SIZE = 25;

export default function CaixaBanco() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [contaBancariaFilter, setContaBancariaFilter] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [marcarPagoOpen, setMarcarPagoOpen] = useState(false);
  const [contasParaPagar, setContasParaPagar] = useState<Lancamento[]>([]);
  const [contaIdDrawer, setContaIdDrawer] = useState<string | null>(null);
  const navigate = useNavigate();
  const [editarOpen, setEditarOpen] = useState(false);
  const [lancamentoEditando, setLancamentoEditando] = useState<Lancamento | null>(null);

  // Query da view unificada
  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ["lancamentos-caixa-banco"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("vw_lancamentos_caixa_banco")
        .select("*")
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return (data || []) as Lancamento[];
    },
  });

  // Contas bancárias
  const { data: contasBancarias } = useQuery({
    queryKey: ["contas-bancarias-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contas_bancarias")
        .select("id, nome_exibicao, cor")
        .order("nome_exibicao");
      return (data || []) as ContaBancariaLite[];
    },
  });

  // Formas de pagamento (pra exibir nome na tabela)
  const { data: formasPagamento } = useQuery({
    queryKey: ["formas-pagamento-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("formas_pagamento")
        .select("id, nome");
      return (data || []) as FormaPgtoLite[];
    },
  });

  // Parceiros (pra mostrar razão social em vez de fornecedor_cliente texto)
  const { data: parceiros } = useQuery({
    queryKey: ["parceiros-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parceiros_comerciais")
        .select("id, razao_social");
      return (data || []) as Parceiro[];
    },
  });

  // Mapas de lookup
  const mapContas = useMemo(() => {
    const m: Record<string, ContaBancariaLite> = {};
    (contasBancarias || []).forEach((c) => (m[c.id] = c));
    return m;
  }, [contasBancarias]);

  const mapFormas = useMemo(() => {
    const m: Record<string, string> = {};
    (formasPagamento || []).forEach((f) => (m[f.id] = f.nome));
    return m;
  }, [formasPagamento]);

  const mapParceiros = useMemo(() => {
    const m: Record<string, string> = {};
    (parceiros || []).forEach((p) => {
      if (p.razao_social) m[p.id] = p.razao_social;
    });
    return m;
  }, [parceiros]);

  // Filtros
  const filtered = useMemo(() => {
    let list = lancamentos || [];
    if (statusFilter !== "todos") {
      list = list.filter((l) => l.status_caixa === statusFilter);
    }
    if (contaBancariaFilter !== "todas") {
      list = list.filter((l) => l.pago_em_conta_id === contaBancariaFilter);
    }
    if (busca.trim()) {
      const t = busca.toLowerCase();
      list = list.filter((l) => {
        const parceiroNome =
          (l.parceiro_id && mapParceiros[l.parceiro_id]) || l.fornecedor_cliente || "";
        return (
          l.descricao?.toLowerCase().includes(t) ||
          parceiroNome.toLowerCase().includes(t) ||
          (l.nf_numero || "").toLowerCase().includes(t)
        );
      });
    }
    return list;
  }, [lancamentos, statusFilter, contaBancariaFilter, busca, mapParceiros]);

  // Totais (sempre calcula do dataset completo, não filtrado)
  const totals = useMemo(() => {
    const all = lancamentos || [];
    const emAberto = all
      .filter((l) => l.status_caixa === "em_aberto" && l.origem_view !== "cartao_lancamento")
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const pago = all
      .filter((l) => l.status_caixa === "pago")
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const conciliado = all
      .filter((l) => l.status_caixa === "conciliado")
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    return {
      emAberto,
      pago,
      conciliado,
      countAberto: all.filter((l) => l.status_caixa === "em_aberto" && l.origem_view !== "cartao_lancamento").length,
      countPago: all.filter((l) => l.status_caixa === "pago").length,
      countConciliado: all.filter((l) => l.status_caixa === "conciliado").length,
    };
  }, [lancamentos]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const lancamentosSelecionados = useMemo(
    () => filtered.filter((l) => selecionados.has(l.id) && l.status_caixa === "em_aberto" && l.origem_view !== "cartao_lancamento"),
    [filtered, selecionados],
  );

  function toggleSelecionado(id: string) {
    const next = new Set(selecionados);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelecionados(next);
  }

  function togglePagina() {
    const next = new Set(selecionados);
    const todasSelecionadas = pageData
      .filter((l) => l.status_caixa === "em_aberto" && l.origem_view !== "cartao_lancamento")
      .every((l) => next.has(l.id));
    if (todasSelecionadas) {
      pageData.forEach((l) => next.delete(l.id));
    } else {
      pageData
        .filter((l) => l.status_caixa === "em_aberto" && l.origem_view !== "cartao_lancamento")
        .forEach((l) => next.add(l.id));
    }
    setSelecionados(next);
  }

  function handleMarcarPagoIndividual(l: Lancamento) {
    setContasParaPagar([l]);
    setMarcarPagoOpen(true);
  }

  function handleMarcarPagoMassa() {
    if (lancamentosSelecionados.length === 0) {
      return;
    }
    setContasParaPagar(lancamentosSelecionados);
    setMarcarPagoOpen(true);
  }

  function handleSucessoPagamento() {
    setSelecionados(new Set());
    setContasParaPagar([]);
    qc.invalidateQueries({ queryKey: ["lancamentos-caixa-banco"] });
  }

  function nomeParceiro(l: Lancamento): string {
    return (
      (l.parceiro_id && mapParceiros[l.parceiro_id]) ||
      l.fornecedor_cliente ||
      "—"
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-admin" />
            Caixa e Banco
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lançamentos de pagamento — em aberto, pagos e conciliados.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" /> Em aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatBRL(totals.emAberto)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totals.countAberto} {totals.countAberto === 1 ? "lançamento" : "lançamentos"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatBRL(totals.pago)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totals.countPago} {totals.countPago === 1 ? "pagamento" : "pagamentos"} aguardando conciliação
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-emerald-700" /> Conciliado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-800">
              {formatBRL(totals.conciliado)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totals.countConciliado} batem com extrato
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + Ações em massa */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar parceiro, descrição ou NF..."
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="em_aberto">Em aberto</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="conciliado">Conciliado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={contaBancariaFilter} onValueChange={setContaBancariaFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Conta bancária" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as contas</SelectItem>
                {(contasBancarias || []).map((cb) => (
                  <SelectItem key={cb.id} value={cb.id}>
                    {cb.nome_exibicao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botão massa */}
            {lancamentosSelecionados.length > 0 && (
              <Button
                onClick={handleMarcarPagoMassa}
                className="ml-auto gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                Marcar {lancamentosSelecionados.length} como pago
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum lançamento encontrado.
              <p className="text-xs mt-2">
                Quando uma conta a pagar for finalizada, aparece aqui automaticamente.
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            pageData.filter((l) => l.status_caixa === "em_aberto" && l.origem_view !== "cartao_lancamento").length > 0 &&
                            pageData
                              .filter((l) => l.status_caixa === "em_aberto" && l.origem_view !== "cartao_lancamento")
                              .every((l) => selecionados.has(l.id))
                          }
                          onCheckedChange={togglePagina}
                          aria-label="Selecionar página"
                        />
                      </TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Dt. Pagamento</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Meio Pgto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[180px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((l) => {
                      const isSel = selecionados.has(l.id);
                      const podeSel = l.status_caixa === "em_aberto";
                      const conta =
                        l.pago_em_conta_id && mapContas[l.pago_em_conta_id];
                      const formaNome =
                        l.forma_pagamento_id && mapFormas[l.forma_pagamento_id];
                      return (
                        <TableRow
                          key={l.id}
                          className={`cursor-pointer hover:bg-muted/50 ${isSel ? "bg-muted/40" : ""}`}
                          onClick={() => setContaIdDrawer(l.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSel}
                              disabled={!podeSel}
                              onCheckedChange={() => toggleSelecionado(l.id)}
                              aria-label="Selecionar"
                            />
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <div className="truncate" title={nomeParceiro(l)}>
                              {nomeParceiro(l)}
                            </div>
                            {l.status_conta_pagar === "doc_pendente" && (
                              <Badge
                                variant="outline"
                                className="mt-1 text-[9px] py-0 px-1.5 border-amber-400 text-amber-700 bg-amber-50 gap-1"
                                title="Pagamento foi enviado ao financeiro mas falta NF/Recibo do fornecedor"
                              >
                                <FileWarning className="h-2.5 w-2.5" />
                                Doc. Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="truncate text-xs text-muted-foreground" title={l.descricao}>
                              {l.descricao}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {formatDateBR(l.data_vencimento)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {l.data_pagamento ? (
                              formatDateBR(l.data_pagamento)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {conta ? (
                              <div className="flex items-center gap-1.5">
                                {conta.cor && (
                                  <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: conta.cor }}
                                  />
                                )}
                                <span className="truncate max-w-[120px]">
                                  {conta.nome_exibicao}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formaNome || "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono whitespace-nowrap">
                            {formatBRL(l.valor)}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_STYLES[l.status_caixa]}>
                              {STATUS_LABEL[l.status_caixa]}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setLancamentoEditando(l);
                                  setEditarOpen(true);
                                }}
                                title="Editar conta, meio e data"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {l.status_caixa === "em_aberto" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-700 border-green-300 hover:bg-green-50 h-7 text-xs gap-1"
                                  onClick={() => handleMarcarPagoIndividual(l)}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Pagar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "lançamento" : "lançamentos"} • Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <MarcarPagoDialog
        open={marcarPagoOpen}
        onOpenChange={setMarcarPagoOpen}
        contas={contasParaPagar}
        onSuccess={handleSucessoPagamento}
      />

      <ContaPagarDetalheDrawer
        contaId={contaIdDrawer}
        onClose={() => setContaIdDrawer(null)}
      />

      <EditarLancamentoDialog
        open={editarOpen}
        onOpenChange={setEditarOpen}
        lancamento={lancamentoEditando}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["lancamentos-caixa-banco"] })}
      />
    </div>
  );
}
