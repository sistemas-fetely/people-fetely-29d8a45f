import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Plus,
  Search,
  X,
  Eye,
  Trash2,
  Calculator,
  Globe,
  ArrowDownToLine,
  Receipt,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Link2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { ImportarFaturaCartaoDialog } from "@/components/financeiro/ImportarFaturaCartaoDialog";
import { descartarFatura } from "@/lib/financeiro/fatura-cartao-handler";
import {
  SortableTableHead,
  ordenarPor,
  type SortState,
} from "@/components/shared/SortableTableHead";
import { useCategoriasPlano } from "@/hooks/useCategoriasPlano";
import { CategoriaCombobox } from "@/components/financeiro/CategoriaCombobox";
import {
  useRegrasAtivas,
  sugerirNoClient,
  classificarComAprendizado,
  registrarCorrecao,
  type SugestaoResult,
} from "@/hooks/useEngineClassificacao";

type FaturaRow = {
  id: string;
  conta_bancaria_id: string;
  data_vencimento: string;
  data_emissao: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  valor_total: number;
  status: string;
  conta_pagar_id: string | null;
  pdf_storage_path: string | null;
  observacao: string | null;
  created_at: string;
  conta_bancaria?: { nome_exibicao: string; banco: string | null } | null;
  qtd_lancamentos?: number;
  qtd_pendentes?: number;
};

type LancamentoRow = {
  id: string;
  fatura_id: string;
  data_compra: string;
  descricao: string;
  valor: number;
  parcela_atual: number | null;
  parcela_total: number | null;
  tipo: string;
  natureza: string;
  moeda: string | null;
  valor_original: number | null;
  cotacao: number | null;
  estabelecimento_local: string | null;
  ramo_estabelecimento: string | null;
  cnpj_estabelecimento: string | null;
  parceiro_id: string | null;
  categoria_id: string | null;
  status: string;
  nf_vinculada_id: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  aberta: "Aberta",
  paga: "Paga",
  conciliada: "Conciliada",
  cancelada: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  aberta: "bg-amber-100 text-amber-800 border-amber-200",
  paga: "bg-blue-100 text-blue-800 border-blue-200",
  conciliada: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelada: "bg-gray-100 text-gray-700 border-gray-200",
};

const TIPO_LANC_LABELS: Record<string, string> = {
  compra: "Compra",
  estorno: "Estorno",
  iof: "IOF",
  encargo: "Encargo",
  pagamento: "Pagamento",
  taxa: "Taxa",
  outro: "Outro",
};

type FiltroPill = "todas" | "aberta" | "paga" | "conciliada" | "cancelada";

export default function FaturasCartao() {
  const qc = useQueryClient();
  const [importarOpen, setImportarOpen] = useState(false);
  const [enriquecendo, setEnriquecendo] = useState(false);

  async function handleEnriquecerCNPJs() {
    setEnriquecendo(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("pipeline_enriquecer_cartao");
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      toast.success(
        `Enriquecimento concluído: ${r?.parceiros_criados || 0} parceiro(s) criado(s), ${r?.enriquecidos || 0} lançamento(s) vinculado(s).`,
        {
          description: r?.ambiguos > 0
            ? `${r.ambiguos} caso(s) ambíguo(s) precisam de revisão manual.`
            : undefined,
        }
      );
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
      qc.invalidateQueries({ queryKey: ["fatura-lancamentos"] });
      qc.invalidateQueries({ queryKey: ["lancamentos-caixa-banco"] });
      qc.invalidateQueries({ queryKey: ["parceiros-comerciais"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro no enriquecimento: " + msg);
    } finally {
      setEnriquecendo(false);
    }
  }
  const [busca, setBusca] = useState("");
  const [filtroPill, setFiltroPill] = useState<FiltroPill>("todas");
  const [filtroCartao, setFiltroCartao] = useState<string>("__todos__");
  const [faturaExpanded, setFaturaExpanded] = useState<string | null>(null);
  const [paraDescartar, setParaDescartar] = useState<FaturaRow | null>(null);

  type SortColumn = "vencimento" | "cartao" | "valor" | "status" | "lancamentos";
  const [sort, setSort] = useState<SortState<SortColumn> | null>({
    column: "vencimento",
    direction: "desc",
  });

  // Cartões pra filtro
  const { data: cartoes } = useQuery({
    queryKey: ["cartoes-credito-listagem"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contas_bancarias")
        .select("id, nome_exibicao, banco")
        .eq("tipo", "cartao_credito")
        .eq("ativo", true)
        .order("nome_exibicao");
      return data || [];
    },
  });

  // Faturas
  const { data: faturas, isLoading } = useQuery({
    queryKey: ["faturas-cartao"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("faturas_cartao")
        .select(`
          *,
          conta_bancaria:conta_bancaria_id ( nome_exibicao, banco )
        `)
        .order("data_vencimento", { ascending: false });
      if (error) throw error;

      // Contar lançamentos por fatura
      const ids = (data || []).map((f: { id: string }) => f.id);
      let counts: Record<string, { total: number; pendentes: number }> = {};
      if (ids.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: lancs } = await (supabase as any)
          .from("fatura_cartao_lancamentos")
          .select("fatura_id, status")
          .in("fatura_id", ids);
        for (const l of lancs || []) {
          if (!counts[l.fatura_id]) counts[l.fatura_id] = { total: 0, pendentes: 0 };
          counts[l.fatura_id].total++;
          if (l.status === "pendente") counts[l.fatura_id].pendentes++;
        }
      }

      return (data || []).map((f: FaturaRow) => ({
        ...f,
        qtd_lancamentos: counts[f.id]?.total || 0,
        qtd_pendentes: counts[f.id]?.pendentes || 0,
      })) as FaturaRow[];
    },
  });

  // Lançamentos da fatura expandida
  const { data: lancamentosExpanded } = useQuery({
    queryKey: ["fatura-lancamentos", faturaExpanded],
    enabled: !!faturaExpanded,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("fatura_cartao_lancamentos")
        .select("*")
        .eq("fatura_id", faturaExpanded)
        .order("data_compra", { ascending: true });
      if (error) throw error;
      return (data || []) as LancamentoRow[];
    },
  });

  // Engine Universal: carrega regras ativas (qualquer fonte alimenta esta base)
  const { data: regrasEngine } = useRegrasAtivas();

  // Helper: pega sugestão pra um lançamento usando o engine universal
  function obterSugestao(lanc: LancamentoRow): SugestaoResult | null {
    if (lanc.categoria_id) return null; // já classificado
    if (lanc.status === "descartado") return null;

    return sugerirNoClient(
      {
        descricao: lanc.descricao,
        cnpj: lanc.cnpj_estabelecimento,
        parceiro_id: lanc.parceiro_id,
        origem: "cartao",
      },
      regrasEngine,
    );
  }

  const { data: categorias = [] } = useCategoriasPlano();

  // Mapa categorias
  const mapCategorias = useMemo(() => {
    const m: Record<string, string> = {};
    (categorias || []).forEach((c: { id: string; codigo: string; nome: string }) => {
      m[c.id] = `${c.codigo} ${c.nome}`;
    });
    return m;
  }, [categorias]);

  const categoriasDespesa = useMemo(
    () =>
      (categorias || []).filter(
        (c: { codigo: string }) => !c.codigo.startsWith("01"),
      ),
    [categorias],
  );

  // KPIs
  const totals = useMemo(() => {
    const all = faturas || [];
    return {
      total: all.length,
      abertas: all.filter((f) => f.status === "aberta").length,
      pagas: all.filter((f) => f.status === "paga").length,
      conciliadas: all.filter((f) => f.status === "conciliada").length,
      canceladas: all.filter((f) => f.status === "cancelada").length,
      valorAberto: all
        .filter((f) => f.status === "aberta")
        .reduce((s, f) => s + (f.valor_total || 0), 0),
    };
  }, [faturas]);

  // Filtragem + Ordenação
  const filtered = useMemo(() => {
    let list = faturas || [];

    if (filtroPill !== "todas") {
      list = list.filter((f) => f.status === filtroPill);
    }
    if (filtroCartao !== "__todos__") {
      list = list.filter((f) => f.conta_bancaria_id === filtroCartao);
    }
    if (busca.trim()) {
      const t = busca.toLowerCase();
      list = list.filter(
        (f) =>
          f.conta_bancaria?.nome_exibicao?.toLowerCase().includes(t) ||
          f.observacao?.toLowerCase().includes(t),
      );
    }

    list = ordenarPor(list, sort, {
      vencimento: (f) => f.data_vencimento || "",
      cartao: (f) => f.conta_bancaria?.nome_exibicao || "",
      valor: (f) => f.valor_total || 0,
      status: (f) => f.status || "",
      lancamentos: (f) => f.qtd_lancamentos || 0,
    });

    return list;
  }, [faturas, filtroPill, filtroCartao, busca, sort]);

  async function handleDescartarConfirmado() {
    if (!paraDescartar) return;
    try {
      await descartarFatura(paraDescartar.id);
      toast.success("Fatura descartada");
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
      setParaDescartar(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    }
  }

  async function visualizarPDF(fatura: FaturaRow) {
    if (!fatura.pdf_storage_path) {
      toast.error("Sem arquivo anexado");
      return;
    }
    const { data } = await supabase.storage
      .from("faturas-cartao")
      .createSignedUrl(fatura.pdf_storage_path, 60 * 5);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Falha ao gerar link");
    }
  }

  async function alterarCategoriaLanc(lancId: string, categoriaId: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("fatura_cartao_lancamentos")
        .update({
          categoria_id: categoriaId || null,
          status: categoriaId ? "classificado" : "pendente",
        })
        .eq("id", lancId);
      if (error) throw error;

      // Engine Universal: aprende com a classificação manual
      if (categoriaId) {
        const lanc = lancamentosExpanded?.find((l) => l.id === lancId);
        if (lanc) {
          await classificarComAprendizado({
            descricao: lanc.descricao,
            cnpj: lanc.cnpj_estabelecimento,
            parceiro_id: lanc.parceiro_id,
            categoria_id: categoriaId,
            origem: "cartao",
          });
        }
      }

      qc.invalidateQueries({ queryKey: ["fatura-lancamentos", faturaExpanded] });
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
      qc.invalidateQueries({ queryKey: ["engine-regras-ativas"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    }
  }

  // Aplicar todas as sugestões disponíveis na fatura expandida
  async function aplicarTodasSugestoes() {
    if (!lancamentosExpanded) return;
    const lancsParaAplicar = lancamentosExpanded
      .map((l) => ({ l, sug: obterSugestao(l) }))
      .filter((x) => x.sug !== null);

    if (lancsParaAplicar.length === 0) {
      toast.info("Nenhuma sugestão automática disponível");
      return;
    }

    if (
      !confirm(
        `Aplicar sugestão automática em ${lancsParaAplicar.length} lançamento${lancsParaAplicar.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    let ok = 0;
    for (const { l, sug } of lancsParaAplicar) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("fatura_cartao_lancamentos")
          .update({
            categoria_id: sug!.categoria_id,
            status: "classificado",
          })
          .eq("id", l.id);
        if (!error) {
          ok++;
          // aplicar aprendizado em background pra cada um
          await classificarComAprendizado({
            descricao: l.descricao,
            cnpj: l.cnpj_estabelecimento,
            parceiro_id: l.parceiro_id,
            categoria_id: sug!.categoria_id,
            origem: "cartao",
          });
        }
      } catch {
        // ignora individual
      }
    }

    qc.invalidateQueries({ queryKey: ["fatura-lancamentos", faturaExpanded] });
    qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
    qc.invalidateQueries({ queryKey: ["engine-regras-ativas"] });
    toast.success(`${ok} sugestão${ok === 1 ? "" : "ões"} aplicada${ok === 1 ? "" : "s"}`);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* HEADER FIXO */}
      <div className="px-6 pt-6 pb-3 border-b bg-background/95 backdrop-blur sticky top-0 z-20 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-admin" />
              Faturas de Cartão
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Importe faturas, classifique lançamentos e acompanhe o ciclo de pagamento.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleEnriquecerCNPJs}
              disabled={enriquecendo}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {enriquecendo ? "Enriquecendo..." : "Enriquecer CNPJs"}
            </Button>
            <Button
              onClick={() => setImportarOpen(true)}
              className="gap-2 bg-admin hover:bg-admin-accent text-admin-foreground"
            >
              <Plus className="h-4 w-4" />
              Importar Fatura
            </Button>
          </div>
        </div>

        {/* KPIs como pills */}
        <div className="flex flex-wrap gap-2">
          <KpiPill
            label="Todas"
            count={totals.total}
            color="admin"
            active={filtroPill === "todas"}
            onClick={() => setFiltroPill("todas")}
            icon={<Receipt className="h-3 w-3" />}
          />
          <KpiPill
            label="Abertas"
            count={totals.abertas}
            color="amber"
            active={filtroPill === "aberta"}
            onClick={() => setFiltroPill("aberta")}
            icon={<Clock className="h-3 w-3" />}
            description={
              totals.valorAberto > 0 ? formatBRL(totals.valorAberto) : "a pagar"
            }
          />
          <KpiPill
            label="Pagas"
            count={totals.pagas}
            color="blue"
            active={filtroPill === "paga"}
            onClick={() => setFiltroPill("paga")}
            icon={<CheckCircle2 className="h-3 w-3" />}
            description="aguarda concil."
          />
          <KpiPill
            label="Conciliadas"
            count={totals.conciliadas}
            color="emerald"
            active={filtroPill === "conciliada"}
            onClick={() => setFiltroPill("conciliada")}
            icon={<Sparkles className="h-3 w-3" />}
            description="ciclo completo"
          />
          {totals.canceladas > 0 && (
            <KpiPill
              label="Canceladas"
              count={totals.canceladas}
              color="gray"
              active={filtroPill === "cancelada"}
              onClick={() => setFiltroPill("cancelada")}
              icon={<X className="h-3 w-3" />}
            />
          )}
        </div>

        {/* Filtros + busca */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cartão ou observação..."
              className="pl-9"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={filtroCartao} onValueChange={setFiltroCartao}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos os cartões</SelectItem>
              {(cartoes || []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome_exibicao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            <Calculator className="h-3.5 w-3.5" />
            <span>
              <strong className="text-foreground">{filtered.length}</strong> fatura{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              {faturas?.length === 0
                ? "Nenhuma fatura importada ainda. Clique em \"Importar Fatura\" para começar."
                : "Nenhuma fatura encontrada com esses filtros."}
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <SortableTableHead column="cartao" sort={sort} onSort={setSort}>
                    Cartão
                  </SortableTableHead>
                  <SortableTableHead
                    column="vencimento"
                    sort={sort}
                    onSort={setSort}
                    className="w-32"
                  >
                    Vencimento
                  </SortableTableHead>
                  <TableHead className="w-44">Período</TableHead>
                  <SortableTableHead
                    column="valor"
                    sort={sort}
                    onSort={setSort}
                    className="w-32"
                    align="right"
                  >
                    Valor Total
                  </SortableTableHead>
                  <SortableTableHead
                    column="lancamentos"
                    sort={sort}
                    onSort={setSort}
                    className="w-36 text-center"
                    align="center"
                  >
                    Lançamentos
                  </SortableTableHead>
                  <SortableTableHead
                    column="status"
                    sort={sort}
                    onSort={setSort}
                    className="w-28"
                  >
                    Status
                  </SortableTableHead>
                  <TableHead className="w-24 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => {
                  const isExpanded = faturaExpanded === f.id;
                  return (
                    <>
                      <TableRow
                        key={f.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() =>
                          setFaturaExpanded(isExpanded ? null : f.id)
                        }
                      >
                        <TableCell>
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {f.conta_bancaria?.nome_exibicao || "—"}
                          </div>
                          {f.conta_bancaria?.banco && (
                            <div className="text-[10px] text-muted-foreground">
                              {f.conta_bancaria.banco}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDateBR(f.data_vencimento)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {f.periodo_inicio && f.periodo_fim
                            ? `${formatDateBR(f.periodo_inicio)} → ${formatDateBR(f.periodo_fim)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatBRL(f.valor_total)}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <div className="flex items-center justify-center gap-1">
                            <span>{f.qtd_lancamentos || 0}</span>
                            {(f.qtd_pendentes || 0) > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1 h-4 border-amber-300 text-amber-700"
                              >
                                {f.qtd_pendentes} pend
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_STYLES[f.status]}>
                            {STATUS_LABELS[f.status] || f.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {f.pdf_storage_path && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => visualizarPDF(f)}
                                title="Ver PDF"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setParaDescartar(f)}
                              title="Descartar fatura"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Linha expandida com lançamentos */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/20 p-0">
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold flex items-center gap-2">
                                  <ArrowDownToLine className="h-3.5 w-3.5" />
                                  Lançamentos detalhados
                                </p>
                                {(() => {
                                  if (!lancamentosExpanded) return null;
                                  const qtdSug = lancamentosExpanded.filter(
                                    (l) => obterSugestao(l) !== null,
                                  ).length;
                                  if (qtdSug === 0) return null;
                                  return (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1 border-violet-300 text-violet-700 hover:bg-violet-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        aplicarTodasSugestoes();
                                      }}
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      Aplicar {qtdSug} sugestão{qtdSug === 1 ? "" : "ões"} automática{qtdSug === 1 ? "" : "s"}
                                    </Button>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2 px-1 py-1 rounded bg-muted/40 border border-dashed">
                                <Info className="h-3 w-3 shrink-0" />
                                <span>
                                  Lançamentos sem categoria serão classificados automaticamente na reconciliação com NF.
                                </span>
                              </div>
                              {!lancamentosExpanded ? (
                                <Skeleton className="h-32 w-full" />
                              ) : lancamentosExpanded.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">
                                  Sem lançamentos detalhados.
                                </p>
                              ) : (
                                <div className="rounded border bg-background overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted/40 text-muted-foreground">
                                      <tr>
                                        <th className="text-left px-2 py-1.5 font-normal">Data</th>
                                        <th className="text-left px-2 py-1.5 font-normal">Descrição</th>
                                        <th className="text-right px-2 py-1.5 font-normal">Valor</th>
                                        <th className="text-center px-2 py-1.5 font-normal w-[110px]">
                                          Match NF
                                        </th>
                                        <th className="text-left px-2 py-1.5 font-normal w-[180px]">
                                          Categoria
                                        </th>
                                        <th className="text-center px-2 py-1.5 font-normal">Tipo</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lancamentosExpanded.map((l) => (
                                        <tr key={l.id} className="border-t">
                                          <td className="px-2 py-1.5 whitespace-nowrap text-[10px]">
                                            {formatDateBR(l.data_compra)}
                                          </td>
                                          <td className="px-2 py-1.5">
                                            <div className="flex items-center gap-1">
                                              <span className="truncate" title={l.descricao}>
                                                {l.descricao}
                                              </span>
                                              {l.parcela_atual && l.parcela_total && (
                                                <Badge
                                                  variant="outline"
                                                  className="text-[9px] py-0 px-1 h-4"
                                                >
                                                  {l.parcela_atual}/{l.parcela_total}
                                                </Badge>
                                              )}
                                              {l.natureza === "INTERNACIONAL" && (
                                                <Globe className="h-3 w-3 text-blue-600" />
                                              )}
                                            </div>
                                            {l.natureza === "INTERNACIONAL" &&
                                              l.valor_original && (
                                                <div className="text-[9px] text-muted-foreground">
                                                  {l.moeda} {l.valor_original?.toFixed(2)} ×{" "}
                                                  {l.cotacao?.toFixed(2)}
                                                </div>
                                              )}
                                          </td>
                                          <td
                                            className={`px-2 py-1.5 text-right font-mono whitespace-nowrap ${
                                              l.valor < 0 ? "text-emerald-700" : ""
                                            }`}
                                          >
                                            {formatBRL(l.valor)}
                                           </td>
                                           <td className="px-2 py-1.5 text-center">
                                             {l.nf_vinculada_id ? (
                                               <Badge
                                                 variant="outline"
                                                 className="text-[9px] py-0 px-1 h-4 border-emerald-300 text-emerald-700 bg-emerald-50 gap-1"
                                                 title="Lançamento vinculado a uma NF"
                                               >
                                                 <Link2 className="h-2.5 w-2.5" />
                                                 Vinculada
                                               </Badge>
                                             ) : (
                                               <Badge
                                                 variant="outline"
                                                 className="text-[9px] py-0 px-1 h-4 border-amber-300 text-amber-700 bg-amber-50 gap-1"
                                                 title="Aguardando match com NF na tela de Reconciliação"
                                               >
                                                 <Clock className="h-2.5 w-2.5" />
                                                 Aguardando
                                               </Badge>
                                             )}
                                           </td>
                                           <td className="px-2 py-1.5">
                                            <div className="flex items-center gap-1">
                                              <div className="flex-1 min-w-[160px] [&_button]:h-7 [&_button]:text-[10px]">
                                                <CategoriaCombobox
                                                  options={categoriasDespesa}
                                                  value={l.categoria_id || null}
                                                  onChange={(id) =>
                                                    id &&
                                                    alterarCategoriaLanc(
                                                      l.id,
                                                      id,
                                                    )
                                                  }
                                                  placeholder="Definir..."
                                                />
                                              </div>
                                              {(() => {
                                                const sug = obterSugestao(l);
                                                if (!sug) return null;
                                                return (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-[9px] gap-1 border-violet-300 text-violet-700 hover:bg-violet-50 px-1.5 shrink-0"
                                                    onClick={() =>
                                                      alterarCategoriaLanc(l.id, sug.categoria_id)
                                                    }
                                                    title={`${mapCategorias[sug.categoria_id]} (${sug.motivo})`}
                                                  >
                                                    <Sparkles className="h-3 w-3" />
                                                    Sugerir
                                                  </Button>
                                                );
                                              })()}
                                            </div>
                                          </td>
                                          <td className="px-2 py-1.5 text-center">
                                            <Badge
                                              variant="outline"
                                              className={
                                                "text-[9px] py-0 px-1 h-4 " +
                                                (l.tipo === "estorno"
                                                  ? "border-emerald-300 text-emerald-700"
                                                  : l.tipo === "iof"
                                                    ? "border-amber-300 text-amber-700"
                                                    : l.tipo === "pagamento"
                                                      ? "border-blue-300 text-blue-700"
                                                      : "")
                                              }
                                            >
                                              {TIPO_LANC_LABELS[l.tipo] || l.tipo}
                                            </Badge>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ImportarFaturaCartaoDialog
        open={importarOpen}
        onOpenChange={setImportarOpen}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
        }}
      />

      <AlertDialog
        open={paraDescartar !== null}
        onOpenChange={(v) => !v && setParaDescartar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar fatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a descartar a fatura de{" "}
              <strong>{paraDescartar?.conta_bancaria?.nome_exibicao}</strong> com vencimento em{" "}
              <strong>{paraDescartar && formatDateBR(paraDescartar.data_vencimento)}</strong>.
              <br /><br />
              Isso vai remover:
              <ul className="list-disc pl-5 mt-1 text-xs">
                <li>A fatura</li>
                <li>{paraDescartar?.qtd_lancamentos || 0} lançamento(s) detalhado(s)</li>
                <li>A conta a pagar vinculada (se ainda não foi paga)</li>
                <li>O PDF anexado</li>
              </ul>
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDescartarConfirmado();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ====== KpiPill (mesmo padrão do NFsStage) ======
interface KpiPillProps {
  label: string;
  count: number;
  color: "admin" | "amber" | "emerald" | "blue" | "gray";
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  description?: string;
}

function KpiPill({ label, count, color, active, onClick, icon, description }: KpiPillProps) {
  const colorMap: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
    admin: {
      bg: "bg-admin/5",
      text: "text-admin",
      border: "border-admin/20",
      activeBg: "bg-admin text-admin-foreground border-admin",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      activeBg: "bg-amber-600 text-white border-amber-600",
    },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      activeBg: "bg-emerald-600 text-white border-emerald-600",
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      activeBg: "bg-blue-600 text-white border-blue-600",
    },
    gray: {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
      activeBg: "bg-gray-700 text-white border-gray-700",
    },
  };
  const c = colorMap[color];
  const cls = active
    ? `${c.activeBg} shadow-md`
    : `${c.bg} ${c.text} ${c.border} hover:shadow-sm`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 px-3 py-2 transition-all text-left min-w-[120px] ${cls}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide opacity-90">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold leading-tight mt-0.5">{count}</div>
      {description && (
        <div className="text-[9px] opacity-75 mt-0.5">{description}</div>
      )}
    </button>
  );
}
