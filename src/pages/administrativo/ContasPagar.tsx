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
import { ArrowUpFromLine, FileWarning, Plus, Search, Sparkles, Upload, UserCheck, X } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import ContaPagarDetalheDrawer from "@/components/financeiro/ContaPagarDetalheDrawer";
import AcoesMassaButtons, {
  type ContaSelecionada,
} from "@/components/financeiro/AcoesMassaButtons";
import { NovaContaPagarSheet } from "@/components/financeiro/NovaContaPagarSheet";

type Conta = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  parceiro_id: string | null;
  conta_id: string | null;
  origem: string | null;
  is_cartao: boolean | null;
  // Campos da view consolidada
  tags: unknown;
  tem_doc_pendente: boolean | null;
  atrasada: boolean | null;
  status_efetivo: string | null;
  nf_stage_id: string | null;
  nf_tipo: string | null;
  nf_fornecedor: string | null;
  mov_conciliada: boolean | null;
  // Joins
  plano_contas?: { codigo?: string | null; nome: string } | null;
  parceiros_comerciais?: { razao_social: string | null } | null;
  formas_pagamento?: { nome: string | null } | null;
  forma_pagamento?: string | null;
  fornecedor_cliente?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  aprovado: "Aprovado",
  aguardando_pagamento: "Aguardando pagamento",
  cancelado: "Cancelado",
};

const STATUS_STYLES: Record<string, string> = {
  aberto: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  aprovado: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  aguardando_pagamento: "bg-teal-100 text-teal-800 hover:bg-teal-100",
  cancelado: "bg-red-100 text-red-800 hover:bg-red-100",
};

const PAGE_SIZE = 20;

export default function ContasPagar() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [tagFilter, setTagFilter] = useState<"todas" | "doc_pendente" | "atrasada">("todas");
  const [busca, setBusca] = useState("");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [page, setPage] = useState(1);
  const [contaIdSelecionada, setContaIdSelecionada] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [novaContaOpen, setNovaContaOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contas-pagar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_contas_pagar_consolidado")
        .select(
          "*, plano_contas:conta_id(codigo,nome), parceiros_comerciais:parceiro_id(razao_social), formas_pagamento:forma_pagamento_id(nome)",
        )
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data as unknown as Conta[];
    },
  });

  const filtered = useMemo(() => {
    let list = data || [];
    if (statusFilter !== "todos") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (tagFilter === "doc_pendente") {
      list = list.filter((c) => c.tem_doc_pendente === true);
    } else if (tagFilter === "atrasada") {
      list = list.filter((c) => c.atrasada === true);
    }
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
  }, [data, statusFilter, tagFilter, busca, dataDe, dataAte]);

  const totals = useMemo(() => {
    const all = data || [];
    const aberto = all
      .filter((c) => c.status === "aberto" || c.status === "aprovado")
      .reduce((s, c) => s + Number(c.valor || 0), 0);
    const atrasado = all
      .filter((c) => c.atrasada === true)
      .reduce((s, c) => s + Number(c.valor || 0), 0);
    const aguardandoPgto = (filtered || [])
      .filter((c) => c.status === "aguardando_pagamento")
      .reduce((s, c) => s + Number(c.valor || 0), 0);
    const countDocPendente = all.filter(
      (c) => c.tem_doc_pendente === true && c.status !== "cancelado",
    ).length;
    const countSemCategoria = all.filter(
      (c) => !c.conta_id && c.status !== "cancelado",
    ).length;
    return { aberto, atrasado, aguardandoPgto, countDocPendente, countSemCategoria };
  }, [data, filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Filtros ativos
  const filtrosAtivos = [
    !!busca.trim(),
    !!dataDe,
    !!dataAte,
    tagFilter !== "todas",
    statusFilter !== "todos",
  ].filter(Boolean).length;
  const temFiltroAtivo = filtrosAtivos > 0;
  function limparFiltros() {
    setBusca("");
    setDataDe("");
    setDataAte("");
    setTagFilter("todas");
    setStatusFilter("todos");
    setPage(1);
  }
  const filtroAtivoCls = "border-admin bg-admin/5 ring-1 ring-admin/30";

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
  function verSemCategoria() {
    setStatusFilter("todos");
    setBusca("");
    setPage(1);
  }
  function verPendentesDocs() {
    setTagFilter("doc_pendente");
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowUpFromLine className="h-6 w-6 text-admin" />
            Contas a Pagar
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vencimentos a parceiros — abertos, pagos e atrasados.
          </p>
        </div>
        <Button
          onClick={() => setNovaContaOpen(true)}
          className="gap-2 bg-admin hover:bg-admin-accent text-admin-foreground"
        >
          <Plus className="h-4 w-4" />
          Nova Despesa
        </Button>
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
              Aguardando pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">{formatBRL(totals.aguardandoPgto)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Banner Doc Pendente */}
      {totals.countDocPendente > 0 && (
        <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-[260px]">
            <Sparkles className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {totals.countDocPendente} {totals.countDocPendente === 1 ? "conta com documentação pendente" : "contas com documentação pendente"}
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Pagamento foi enviado ao financeiro mas falta NF/Recibo do fornecedor. Reenvie e-mail cobrando ou finalize manualmente.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-800 hover:bg-amber-100"
            onClick={() => { setTagFilter("doc_pendente"); setPage(1); }}
          >
            Ver pendentes
          </Button>
        </div>
      )}

      {/* Alerta: sem categoria */}
      {totals.countSemCategoria > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                className={`pl-9 ${busca ? filtroAtivoCls : ""}`}
              />
            </div>
            <Input
              type="date"
              value={dataDe}
              onChange={(e) => {
                setDataDe(e.target.value);
                setPage(1);
              }}
              className={`w-full lg:w-44 ${dataDe ? filtroAtivoCls : ""}`}
            />
            <Input
              type="date"
              value={dataAte}
              onChange={(e) => {
                setDataAte(e.target.value);
                setPage(1);
              }}
              className={`w-full lg:w-44 ${dataAte ? filtroAtivoCls : ""}`}
            />
            <Select
              value={tagFilter}
              onValueChange={(v) => {
                setTagFilter(v as "todas" | "doc_pendente" | "atrasada");
                setPage(1);
              }}
            >
              <SelectTrigger
                className={`w-full lg:w-44 ${tagFilter !== "todas" ? filtroAtivoCls : ""}`}
              >
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as tags</SelectItem>
                <SelectItem value="doc_pendente">Com doc pendente</SelectItem>
                <SelectItem value="atrasada">Atrasadas</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {(
                ["todos", "aberto", "aprovado", "aguardando_pagamento", "cancelado"] as const
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
                  {s === "todos" ? "todos" : (STATUS_LABELS[s] || s)}
                </Button>
              ))}
            </div>
          </div>
          {temFiltroAtivo && (
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline" className="text-[10px] text-admin border-admin">
                {filtrosAtivos} filtro{filtrosAtivos > 1 ? "s" : ""} ativo{filtrosAtivos > 1 ? "s" : ""}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-admin hover:text-admin/80 gap-1 text-xs h-7"
                onClick={limparFiltros}
              >
                <X className="h-3 w-3" /> Limpar filtros
              </Button>
            </div>
          )}
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
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Meio de pagamento</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((c) => {
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
                          <TableCell className="max-w-[200px]">
                            <div className="truncate" title={c.parceiros_comerciais?.razao_social || c.fornecedor_cliente || ""}>
                              {c.parceiros_comerciais?.razao_social ||
                                c.fornecedor_cliente ||
                                "—"}
                            </div>
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
                          <TableCell className="whitespace-nowrap">
                            {formatDateBR(c.data_vencimento)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.formas_pagamento?.nome || c.forma_pagamento || (
                              <span className="text-[10px] italic">—</span>
                            )}
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
                              <Badge className={STATUS_STYLES[c.status] || "bg-muted"}>
                                {STATUS_LABELS[c.status] || c.status}
                                {c.status === "aguardando_pagamento" && c.mov_conciliada && (
                                  <span className="ml-1 text-xs">✓</span>
                                )}
                              </Badge>
                              {c.tem_doc_pendente && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 border-amber-300 text-[9px]"
                                >
                                  Doc pendente
                                </Badge>
                              )}
                              {c.atrasada && (
                                <Badge
                                  variant="outline"
                                  className="bg-red-50 text-red-700 border-red-300 text-[9px]"
                                >
                                  Atrasada
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

      <NovaContaPagarSheet
        open={novaContaOpen}
        onOpenChange={setNovaContaOpen}
      />
    </div>
  );
}
