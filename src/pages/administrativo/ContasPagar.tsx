import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "react-router-dom";
import { ArrowUpFromLine, FileWarning, Search, Sparkles, Upload, UserCheck } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import ContaPagarDetalheDrawer from "@/components/financeiro/ContaPagarDetalheDrawer";
import AcoesMassaButtons, {
  type ContaSelecionada,
} from "@/components/financeiro/AcoesMassaButtons";

type Conta = {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  fornecedor_cliente: string | null;
  parceiro_id: string | null;
  conta_id: string | null;
  origem: string | null;
  is_cartao: boolean | null;
  docs_status: string | null;
  plano_contas?: { codigo?: string | null; nome: string } | null;
  parceiros_comerciais?: { razao_social: string | null } | null;
};

const STATUS_STYLES: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  aberto: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  atrasado: "bg-red-100 text-red-800 hover:bg-red-100",
  aprovado: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  agendado: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  pago: "bg-green-100 text-green-800 hover:bg-green-100",
  conciliado: "bg-teal-100 text-teal-800 hover:bg-teal-100",
  cancelado: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

const PAGE_SIZE = 20;

export default function ContasPagar() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [docsFilter, setDocsFilter] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [page, setPage] = useState(1);
  const [contaIdSelecionada, setContaIdSelecionada] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["contas-pagar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar_receber")
        .select(
          "*, plano_contas:conta_id(codigo,nome), parceiros_comerciais:parceiro_id(razao_social)",
        )
        .eq("tipo", "pagar")
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data as unknown as Conta[];
    },
  });

  const filtered = useMemo(() => {
    let list = data || [];
    if (statusFilter !== "todos") list = list.filter((c) => c.status === statusFilter);
    if (docsFilter !== "todos") list = list.filter((c) => (c.docs_status || "pendente") === docsFilter);
    if (busca.trim()) {
      const t = busca.toLowerCase();
      list = list.filter(
        (c) =>
          c.descricao?.toLowerCase().includes(t) ||
          c.fornecedor_cliente?.toLowerCase().includes(t) ||
          c.parceiros_comerciais?.razao_social?.toLowerCase().includes(t),
      );
    }
    if (dataDe) list = list.filter((c) => (c.data_vencimento || "") >= dataDe);
    if (dataAte) list = list.filter((c) => (c.data_vencimento || "") <= dataAte);
    return list;
  }, [data, statusFilter, docsFilter, busca, dataDe, dataAte]);

  const totals = useMemo(() => {
    const all = data || [];
    const aberto = all
      .filter((c) => c.status === "aberto" || c.status === "atrasado")
      .reduce((s, c) => s + Number(c.valor || 0), 0);
    const atrasado = all
      .filter((c) => c.status === "atrasado")
      .reduce((s, c) => s + Number(c.valor || 0), 0);
    const pagoPeriodo = (filtered || [])
      .filter((c) => c.status === "pago")
      .reduce((s, c) => s + Number(c.valor || 0), 0);
    const countRascunho = all.filter((c) => c.status === "rascunho").length;
    const countSemCategoria = all.filter(
      (c) => !c.conta_id && c.status !== "cancelado",
    ).length;
    const countSemDocs = all.filter(
      (c) =>
        (c.docs_status === "pendente" || c.docs_status === null) &&
        c.status !== "cancelado" &&
        c.status !== "rascunho",
    ).length;
    return { aberto, atrasado, pagoPeriodo, countRascunho, countSemCategoria, countSemDocs };
  }, [data, filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Seleção
  function toggleSelecionada(id: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleTodas() {
    if (pageData.every((c) => selecionadas.has(c.id))) {
      const next = new Set(selecionadas);
      pageData.forEach((c) => next.delete(c.id));
      setSelecionadas(next);
    } else {
      const next = new Set(selecionadas);
      pageData.forEach((c) => next.add(c.id));
      setSelecionadas(next);
    }
  }
  function limparSelecao() {
    setSelecionadas(new Set());
  }
  function selecionarRascunhos() {
    const ids = (data || []).filter((c) => c.status === "rascunho").map((c) => c.id);
    setSelecionadas(new Set(ids));
    setStatusFilter("rascunho");
    setPage(1);
  }
  function verSemCategoria() {
    setStatusFilter("todos");
    // sem filtro nativo de categoria — mantém clique manual
    setBusca("");
    setPage(1);
  }
  function verPendentesDocs() {
    setDocsFilter("pendente");
    setPage(1);
  }

  const contasSelecionadas: ContaSelecionada[] = useMemo(() => {
    const map = new Map((data || []).map((c) => [c.id, c]));
    return Array.from(selecionadas)
      .map((id) => map.get(id))
      .filter((c): c is Conta => !!c)
      .map((c) => ({ id: c.id, status: c.status, conta_id: c.conta_id }));
  }, [data, selecionadas]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ArrowUpFromLine className="h-6 w-6 text-admin" />
          Contas a Pagar
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vencimentos a parceiros — abertos, pagos e atrasados.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Total em aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatBRL(totals.aberto)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Total atrasado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatBRL(totals.atrasado)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Pago no período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatBRL(totals.pagoPeriodo)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Banner Legado: muitos rascunhos */}
      {totals.countRascunho > 5 && (
        <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-[260px]">
            <Sparkles className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {totals.countRascunho} itens em rascunho (legado)
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Selecione todos e use as ações em massa para avançar o workflow. Itens com categoria
                vão para "Aberto". Sem categoria ficam como rascunho.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-800 hover:bg-amber-100"
            onClick={selecionarRascunhos}
          >
            Selecionar rascunhos
          </Button>
        </div>
      )}

      {/* Alertas: sem categoria + sem docs */}
      {(totals.countSemCategoria > 0 || totals.countSemDocs > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {totals.countSemCategoria > 0 && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 text-sm">
                <FileWarning className="h-4 w-4" />
                {totals.countSemCategoria} sem categoria
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300"
                onClick={verSemCategoria}
              >
                Ver
              </Button>
            </div>
          )}
          {totals.countSemDocs > 0 && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 text-sm">
                <FileWarning className="h-4 w-4" />
                {totals.countSemDocs} sem documentação (NF ou recibo)
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300"
                onClick={verPendentesDocs}
              >
                Ver pendentes
              </Button>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar descrição ou parceiro..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Input
              type="date"
              value={dataDe}
              onChange={(e) => {
                setDataDe(e.target.value);
                setPage(1);
              }}
              className="w-full lg:w-44"
            />
            <Input
              type="date"
              value={dataAte}
              onChange={(e) => {
                setDataAte(e.target.value);
                setPage(1);
              }}
              className="w-full lg:w-44"
            />
            <Select
              value={docsFilter}
              onValueChange={(v) => {
                setDocsFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Documentação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Docs: todas</SelectItem>
                <SelectItem value="ok">Docs OK</SelectItem>
                <SelectItem value="pendente">Sem docs</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {(
                ["todos", "rascunho", "aberto", "atrasado", "aprovado", "agendado", "pago", "cancelado"] as const
              ).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className="capitalize"
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Barra de ações em massa */}
          {selecionadas.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50 mb-4 flex-wrap">
              <span className="text-sm font-medium">
                {selecionadas.size} selecionada{selecionadas.size > 1 ? "s" : ""}
              </span>
              <div className="flex-1" />
              <AcoesMassaButtons
                contas={contasSelecionadas}
                onDone={() => {
                  setSelecionadas(new Set());
                  qc.invalidateQueries({ queryKey: ["contas-pagar"] });
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={limparSelecao}
              >
                Limpar
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (data || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-admin-muted">
                <Upload className="h-8 w-8 text-admin" />
              </div>
              <p className="text-lg font-semibold">Sem contas a pagar importadas</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Sincronize com o Bling ou importe NFs (Qive, XML, PDF) para começar.
              </p>
              <Button asChild className="bg-admin hover:bg-admin-accent text-admin-foreground">
                <Link to="/administrativo/importar">
                  <Upload className="h-4 w-4 mr-2" />
                  Ir para importação
                </Link>
              </Button>
            </div>
          ) : pageData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado para os filtros aplicados.
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
                            pageData.length > 0 && pageData.every((c) => selecionadas.has(c.id))
                          }
                          onCheckedChange={toggleTodas}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((c) => {
                      const pagoComAtraso =
                        c.status === "pago" &&
                        c.data_pagamento &&
                        c.data_vencimento &&
                        c.data_pagamento > c.data_vencimento;
                      const isSel = selecionadas.has(c.id);
                      return (
                        <TableRow
                          key={c.id}
                          className={`cursor-pointer hover:bg-muted/50 ${isSel ? "bg-muted/40" : ""}`}
                          onClick={() => setContaIdSelecionada(c.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSel}
                              onCheckedChange={() => toggleSelecionada(c.id)}
                              aria-label="Selecionar conta"
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDateBR(c.data_vencimento)}
                          </TableCell>
                          <TableCell className="max-w-xs" title={c.descricao}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate">{c.descricao}</span>
                              {c.origem === "nf_pj_interno" && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 text-[10px] py-0 px-1.5 shrink-0"
                                >
                                  <UserCheck className="h-2.5 w-2.5" /> NF PJ
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {c.parceiros_comerciais?.razao_social ||
                              c.fornecedor_cliente ||
                              "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {c.plano_contas?.nome ? (
                              c.plano_contas.nome
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] border-amber-400 text-amber-700"
                              >
                                Sem categoria
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono whitespace-nowrap">
                            {formatBRL(c.valor)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              {pagoComAtraso ? (
                                <>
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                    Pago c/ atraso
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDateBR(c.data_pagamento)}
                                  </span>
                                </>
                              ) : c.status === "pago" ? (
                                <>
                                  <Badge className={STATUS_STYLES.pago}>Pago</Badge>
                                  {c.data_pagamento && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDateBR(c.data_pagamento)}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <Badge className={STATUS_STYLES[c.status] || "bg-muted"}>
                                  {c.status}
                                </Badge>
                              )}
                              {c.docs_status === "pendente" &&
                                c.status !== "cancelado" &&
                                c.status !== "rascunho" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] border-amber-400 text-amber-600"
                                  >
                                    Sem doc
                                  </Badge>
                                )}
                              {c.docs_status === "parcial" && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] border-amber-400 text-amber-600"
                                >
                                  Doc parcial
                                </Badge>
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
                <span className="text-sm text-muted-foreground">
                  {filtered.length} registro{filtered.length === 1 ? "" : "s"} • Página {page} de{" "}
                  {totalPages}
                </span>
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

      <ContaPagarDetalheDrawer
        contaId={contaIdSelecionada}
        onClose={() => setContaIdSelecionada(null)}
      />
    </div>
  );
}
