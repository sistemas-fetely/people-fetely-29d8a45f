import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Layers,
  Search,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  Sparkles,
  Calculator,
  Package,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import {
  enviarStageParaContasPagar,
  descartarStage,
} from "@/lib/financeiro/stage-handler";
import { useCategoriasPlano } from "@/hooks/useCategoriasPlano";
import { CategoriaCombobox } from "@/components/financeiro/CategoriaCombobox";
import {
  classificarComAprendizado,
  useRegrasAtivas,
  sugerirNoClient,
  type SugestaoResult,
} from "@/hooks/useEngineClassificacao";
import {
  SortableTableHead,
  ordenarPor,
  type SortState,
} from "@/components/shared/SortableTableHead";

type NFStage = {
  id: string;
  fonte: string;
  arquivo_nome: string | null;
  arquivo_storage_path: string | null;
  fornecedor_cnpj: string | null;
  fornecedor_razao_social: string | null;
  fornecedor_cliente: string | null;
  parceiro_id: string | null;
  nf_numero: string | null;
  nf_data_emissao: string | null;
  valor: number;
  descricao: string | null;
  categoria_id: string | null;
  data_vencimento: string | null;
  status: string;
  conta_pagar_existente_id: string | null;
  match_score: number | null;
  importacao_lote_id: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  classificada: "Pronta",
  importada: "Importada",
  descartada: "Descartada",
  duplicata: "Duplicata",
};

const STATUS_STYLES: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200",
  classificada: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  importada: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200",
  descartada: "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200",
  duplicata: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200",
};

const FONTE_LABELS: Record<string, string> = {
  pdf_nfe: "PDF DANFE",
  xml_nfe: "XML NF-e",
  csv_qive: "CSV Qive",
};

type FiltroPill = "ativos" | "pendente" | "classificada" | "importada" | "descartada" | "todos";

export default function NFsStage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroPill, setFiltroPill] = useState<FiltroPill>("ativos");
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [paraDescartar, setParaDescartar] = useState<NFStage[]>([]);
  const [salvandoCategoria, setSalvandoCategoria] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  type SortColumn = "fornecedor" | "nf" | "data" | "valor" | "categoria" | "status";
  const [sort, setSort] = useState<SortState<SortColumn> | null>(null);

  const { data: categorias = [] } = useCategoriasPlano();

  const { data: nfs, isLoading } = useQuery({
    queryKey: ["nfs-stage"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("nfs_stage")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as NFStage[];
    },
  });

  // Filtro + Ordenação
  const filtered = useMemo(() => {
    let list = nfs || [];
    if (filtroPill !== "todos") {
      if (filtroPill === "ativos") {
        list = list.filter(
          (n) => n.status === "pendente" || n.status === "classificada",
        );
      } else {
        list = list.filter((n) => n.status === filtroPill);
      }
    }
    if (busca.trim()) {
      const t = busca.toLowerCase();
      list = list.filter(
        (n) =>
          n.fornecedor_razao_social?.toLowerCase().includes(t) ||
          n.fornecedor_cliente?.toLowerCase().includes(t) ||
          n.fornecedor_cnpj?.includes(t) ||
          n.nf_numero?.toLowerCase().includes(t),
      );
    }

    // Ordenação
    list = ordenarPor(list, sort, {
      fornecedor: (n) => n.fornecedor_razao_social || n.fornecedor_cliente || "",
      nf: (n) => n.nf_numero || "",
      data: (n) => n.nf_data_emissao || "",
      valor: (n) => n.valor || 0,
      categoria: (n) => n.categoria_id || "",
      status: (n) => n.status || "",
    });

    return list;
  }, [nfs, filtroPill, busca, sort]);

  // KPIs (sempre baseados em todos os dados, não filtered)
  const totals = useMemo(() => {
    const all = nfs || [];
    return {
      pendentes: all.filter((n) => n.status === "pendente").length,
      prontas: all.filter((n) => n.status === "classificada").length,
      importadas: all.filter((n) => n.status === "importada").length,
      descartadas: all.filter((n) => n.status === "descartada").length,
      total: all.length,
    };
  }, [nfs]);

  // Soma do valor das selecionadas
  const totalSelecionadas = useMemo(() => {
    if (selecionadas.size === 0) return 0;
    return (nfs || [])
      .filter((n) => selecionadas.has(n.id))
      .reduce((s, n) => s + (n.valor || 0), 0);
  }, [selecionadas, nfs]);

  // Soma das filtradas (independente de seleção)
  const totalFiltradas = useMemo(
    () => filtered.reduce((s, n) => s + (n.valor || 0), 0),
    [filtered],
  );

  // ENGINE UNIVERSAL: regras ativas (alimentadas por NF, cartão, manual…)
  const { data: regrasEngine } = useRegrasAtivas();

  // Sugestões por NF usando engine universal (não mais só por CNPJ)
  const sugestoesPorNf = useMemo(() => {
    const map: Record<string, SugestaoResult> = {};
    for (const nf of nfs || []) {
      if (nf.categoria_id) continue;
      if (nf.status === "descartada") continue;
      const sug = sugerirNoClient(
        {
          descricao: nf.fornecedor_razao_social || nf.fornecedor_cliente || nf.descricao,
          cnpj: nf.fornecedor_cnpj,
          parceiro_id: nf.parceiro_id,
          origem: "nf",
        },
        regrasEngine,
      );
      if (sug) map[nf.id] = sug;
    }
    return map;
  }, [nfs, regrasEngine]);

  // Map de id pra label de categoria
  const mapCategorias = useMemo(() => {
    const m: Record<string, string> = {};
    (categorias || []).forEach((c: { id: string; codigo: string; nome: string }) => {
      m[c.id] = `${c.codigo} ${c.nome}`;
    });
    return m;
  }, [categorias]);

  function toggleSel(id: string) {
    const next = new Set(selecionadas);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelecionadas(next);
  }

  function toggleTodas() {
    const ativasIds = filtered
      .filter((n) => n.status === "pendente" || n.status === "classificada")
      .map((n) => n.id);
    const todasSel = ativasIds.length > 0 && ativasIds.every((id) => selecionadas.has(id));
    if (todasSel) {
      setSelecionadas(new Set());
    } else {
      setSelecionadas(new Set(ativasIds));
    }
  }

  async function alterarCategoria(id: string, categoriaId: string) {
    setSalvandoCategoria((prev) => new Set(prev).add(id));
    try {
      const novoStatus = categoriaId ? "classificada" : "pendente";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("nfs_stage")
        .update({
          categoria_id: categoriaId || null,
          status: novoStatus,
        })
        .eq("id", id);
      if (error) throw error;

      // Engine Universal: aprende com a classificação manual
      if (categoriaId) {
        const nf = nfs?.find((n) => n.id === id);
        if (nf) {
          await classificarComAprendizado({
            descricao: nf.fornecedor_razao_social || nf.fornecedor_cliente,
            cnpj: nf.fornecedor_cnpj,
            parceiro_id: nf.parceiro_id,
            categoria_id: categoriaId,
            origem: "nf",
          });
        }
      }

      qc.invalidateQueries({ queryKey: ["nfs-stage"] });
      qc.invalidateQueries({ queryKey: ["engine-regras-ativas"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setSalvandoCategoria((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function aceitarSugestao(nf: NFStage) {
    const sug = sugestoesPorNf[nf.id];
    if (!sug) return;
    await alterarCategoria(nf.id, sug.categoria_id);
    toast.success("Sugestão aplicada");
  }

  async function aceitarTodasSugestoes() {
    if (!nfs) return;
    const aplicar = nfs.filter(
      (n) => n.status === "pendente" && sugestoesPorNf[n.id],
    );
    if (aplicar.length === 0) {
      toast.info("Nenhuma sugestão automática disponível.");
      return;
    }
    if (!confirm(`Aplicar sugestão automática em ${aplicar.length} NF${aplicar.length === 1 ? "" : "s"}?`)) return;

    let ok = 0;
    for (const nf of aplicar) {
      try {
        const sug = sugestoesPorNf[nf.id];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("nfs_stage")
          .update({ categoria_id: sug.categoria_id, status: "classificada" })
          .eq("id", nf.id);
        if (!error) {
          ok++;
          // Engine Universal: aprende
          await classificarComAprendizado({
            descricao: nf.fornecedor_razao_social || nf.fornecedor_cliente,
            cnpj: nf.fornecedor_cnpj,
            parceiro_id: nf.parceiro_id,
            categoria_id: sug.categoria_id,
            origem: "nf",
          });
        }
      } catch {
        // ignora
      }
    }
    qc.invalidateQueries({ queryKey: ["nfs-stage"] });
    qc.invalidateQueries({ queryKey: ["engine-regras-ativas"] });
    toast.success(`${ok} sugestão${ok === 1 ? "" : "ões"} aplicada${ok === 1 ? "" : "s"}`);
  }

  async function handleEnviarSelecionadas() {
    if (selecionadas.size === 0) {
      toast.info("Selecione NFs primeiro");
      return;
    }
    const ids = Array.from(selecionadas);
    const lista = (nfs || []).filter((n) => ids.includes(n.id));
    const naoClassificadas = lista.filter((n) => !n.categoria_id);
    if (naoClassificadas.length > 0) {
      toast.error(
        `${naoClassificadas.length} NF${naoClassificadas.length === 1 ? "" : "s"} sem categoria. Classifique antes de enviar.`,
      );
      return;
    }

    setEnviando(true);
    try {
      const result = await enviarStageParaContasPagar(ids);
      if (result.sucesso > 0) {
        toast.success(
          `${result.sucesso} NF${result.sucesso === 1 ? "" : "s"} enviada${result.sucesso === 1 ? "" : "s"} pra Contas a Pagar`,
        );
      }
      if (result.erros.length > 0) {
        toast.error(`${result.erros.length} erro(s): ${result.erros[0]}`);
        console.error(result.erros);
      }
      setSelecionadas(new Set());
      qc.invalidateQueries({ queryKey: ["nfs-stage"] });
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setEnviando(false);
    }
  }

  async function handleDescartarConfirmado() {
    const ids = paraDescartar.map((n) => n.id);
    try {
      const count = await descartarStage(ids);
      toast.success(`${count} NF${count === 1 ? "" : "s"} descartada${count === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["nfs-stage"] });
      setParaDescartar([]);
      setSelecionadas(new Set());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    }
  }

  async function visualizarPDF(nf: NFStage) {
    if (!nf.arquivo_storage_path) {
      toast.error("Sem arquivo anexado");
      return;
    }
    const { data } = await supabase.storage
      .from("nfs-stage")
      .createSignedUrl(nf.arquivo_storage_path, 60 * 5);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Falha ao gerar link do arquivo");
    }
  }

  // Atalhos de teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignora se está num input/select/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "e" || e.key === "E") {
        if (selecionadas.size > 0) {
          e.preventDefault();
          handleEnviarSelecionadas();
        }
      } else if (e.key === "d" || e.key === "D") {
        if (selecionadas.size > 0) {
          e.preventDefault();
          const lista = filtered.filter((n) => selecionadas.has(n.id));
          setParaDescartar(lista);
        }
      } else if (e.key === "Escape") {
        if (selecionadas.size > 0) {
          setSelecionadas(new Set());
        }
      } else if (e.key === "/") {
        e.preventDefault();
        const input = document.getElementById("nfs-stage-busca") as HTMLInputElement | null;
        input?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionadas, filtered]);

  const sugestoesDisponiveis = (nfs || []).filter(
    (n) => n.status === "pendente" && sugestoesPorNf[n.id],
  ).length;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* HEADER FIXO - Título, KPIs como filtros, busca */}
      <div className="px-6 pt-6 pb-3 border-b bg-background/95 backdrop-blur sticky top-0 z-20 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-6 w-6 text-admin" />
              NFs em Stage
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Revise, classifique e envie pra Contas a Pagar.{" "}
              <span className="text-[11px] opacity-70">
                Atalhos: <kbd className="px-1 py-0.5 border rounded text-[10px]">/</kbd> buscar ·{" "}
                <kbd className="px-1 py-0.5 border rounded text-[10px]">E</kbd> enviar ·{" "}
                <kbd className="px-1 py-0.5 border rounded text-[10px]">D</kbd> descartar ·{" "}
                <kbd className="px-1 py-0.5 border rounded text-[10px]">Esc</kbd> limpar
              </span>
            </p>
          </div>
          {sugestoesDisponiveis > 0 && (
            <Button
              variant="outline"
              onClick={aceitarTodasSugestoes}
              className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
            >
              <Sparkles className="h-4 w-4" />
              Aplicar {sugestoesDisponiveis} sugestão{sugestoesDisponiveis === 1 ? "" : "ões"} automática{sugestoesDisponiveis === 1 ? "" : "s"}
            </Button>
          )}
        </div>

        {/* KPI pills (clicáveis = filtros) */}
        <div className="flex flex-wrap gap-2">
          <KpiPill
            label="Ativas"
            count={totals.pendentes + totals.prontas}
            color="admin"
            active={filtroPill === "ativos"}
            onClick={() => setFiltroPill("ativos")}
            icon={<Package className="h-3 w-3" />}
            description="pendente + pronta"
          />
          <KpiPill
            label="Pendentes"
            count={totals.pendentes}
            color="amber"
            active={filtroPill === "pendente"}
            onClick={() => setFiltroPill("pendente")}
            icon={<Clock className="h-3 w-3" />}
            description="sem categoria"
          />
          <KpiPill
            label="Prontas"
            count={totals.prontas}
            color="emerald"
            active={filtroPill === "classificada"}
            onClick={() => setFiltroPill("classificada")}
            icon={<CheckCircle2 className="h-3 w-3" />}
            description="podem enviar"
          />
          <KpiPill
            label="Importadas"
            count={totals.importadas}
            color="blue"
            active={filtroPill === "importada"}
            onClick={() => setFiltroPill("importada")}
            icon={<Send className="h-3 w-3" />}
            description="já em CP"
          />
          <KpiPill
            label="Descartadas"
            count={totals.descartadas}
            color="gray"
            active={filtroPill === "descartada"}
            onClick={() => setFiltroPill("descartada")}
            icon={<Trash2 className="h-3 w-3" />}
          />
          <KpiPill
            label="Todas"
            count={totals.total}
            color="gray"
            active={filtroPill === "todos"}
            onClick={() => setFiltroPill("todos")}
          />
        </div>

        {/* Busca + Ações */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="nfs-stage-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar fornecedor, CNPJ ou nº NF... (atalho: /)"
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

          {/* Resumo de valores */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calculator className="h-3.5 w-3.5" />
            <span>
              <strong className="text-foreground">{filtered.length}</strong> NF{filtered.length === 1 ? "" : "s"} ·{" "}
              <strong className="text-foreground font-mono">{formatBRL(totalFiltradas)}</strong>
            </span>
          </div>

          {selecionadas.size > 0 && (
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1 text-xs">
                <strong>{selecionadas.size}</strong> selecionadas ·{" "}
                <span className="font-mono">{formatBRL(totalSelecionadas)}</span>
              </Badge>
              <Button
                onClick={handleEnviarSelecionadas}
                disabled={enviando}
                className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <Send className="h-4 w-4" />
                Enviar pra Contas a Pagar
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const lista = filtered.filter((n) => selecionadas.has(n.id));
                  setParaDescartar(lista);
                }}
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                title="Descartar (D)"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* TABELA - área que rola */}
      <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              {nfs?.length === 0
                ? "Nenhuma NF no stage ainda. Importe arquivos em \"Importar Dados\"."
                : "Nenhuma NF encontrada com esses filtros."}
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        filtered
                          .filter((n) => n.status === "pendente" || n.status === "classificada")
                          .length > 0 &&
                        filtered
                          .filter((n) => n.status === "pendente" || n.status === "classificada")
                          .every((n) => selecionadas.has(n.id))
                      }
                      onCheckedChange={toggleTodas}
                    />
                  </TableHead>
                  <SortableTableHead column="fornecedor" sort={sort} onSort={setSort}>
                    Fornecedor
                  </SortableTableHead>
                  <SortableTableHead column="nf" sort={sort} onSort={setSort} className="w-20">
                    NF
                  </SortableTableHead>
                  <SortableTableHead column="data" sort={sort} onSort={setSort} className="w-28">
                    Data
                  </SortableTableHead>
                  <SortableTableHead column="valor" sort={sort} onSort={setSort} className="w-28" align="right">
                    Valor
                  </SortableTableHead>
                  <SortableTableHead column="categoria" sort={sort} onSort={setSort} className="min-w-[220px]">
                    Categoria
                  </SortableTableHead>
                  <SortableTableHead column="status" sort={sort} onSort={setSort} className="w-24">
                    Status
                  </SortableTableHead>
                  <TableHead className="w-24 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((nf) => {
                  const isSel = selecionadas.has(nf.id);
                  const podeSel =
                    nf.status === "pendente" || nf.status === "classificada";
                  const salvando = salvandoCategoria.has(nf.id);
                  const sugestao =
                    nf.status === "pendente" ? sugestoesPorNf[nf.id] : null;

                  return (
                    <TableRow
                      key={nf.id}
                      className={isSel ? "bg-admin/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSel}
                          disabled={!podeSel}
                          onCheckedChange={() => toggleSel(nf.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="text-sm truncate font-medium" title={nf.fornecedor_razao_social || ""}>
                          {nf.fornecedor_razao_social || nf.fornecedor_cliente || "—"}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {nf.fornecedor_cnpj && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {nf.fornecedor_cnpj}
                            </span>
                          )}
                          {nf.fonte && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 h-4 font-normal">
                              {FONTE_LABELS[nf.fonte] || nf.fonte}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{nf.nf_numero || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDateBR(nf.nf_data_emissao)}
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap text-sm">
                        {formatBRL(nf.valor)}
                      </TableCell>
                      <TableCell>
                        {podeSel ? (
                          <div className="flex items-center gap-1.5">
                            <CategoriaCombobox
                              options={categorias}
                              value={nf.categoria_id || null}
                              onChange={(id) =>
                                alterarCategoria(nf.id, id || "")
                              }
                              placeholder="Classificar..."
                              disabled={salvando}
                            />
                            {sugestao && (() => {
                              const conf = sugestao.confianca || 0;
                              const corBadge =
                                conf >= 80
                                  ? "border-emerald-400 text-emerald-700 bg-emerald-50"
                                  : conf >= 50
                                    ? "border-amber-400 text-amber-700 bg-amber-50"
                                    : "border-violet-300 text-violet-700 bg-violet-50";
                              const labelConf = conf >= 80 ? "Alta" : conf >= 50 ? "Média" : "Baixa";
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`h-8 text-[10px] gap-1 px-2 ${corBadge}`}
                                  onClick={() => aceitarSugestao(nf)}
                                  disabled={salvando}
                                  title={`${mapCategorias[sugestao.categoria_id]} · Confiança ${labelConf} · ${sugestao.motivo}`}
                                >
                                  <Sparkles className="h-3 w-3" />
                                  Sugerir
                                  <span className="text-[8px] opacity-70 ml-0.5">{labelConf}</span>
                                </Button>
                              );
                            })()}
                          </div>
                        ) : nf.categoria_id ? (
                          <span className="text-xs text-muted-foreground">
                            {mapCategorias[nf.categoria_id] || "—"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[nf.status]}>
                          {STATUS_LABELS[nf.status] || nf.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {nf.arquivo_storage_path && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => visualizarPDF(nf)}
                              title="Ver arquivo"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {podeSel && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setParaDescartar([nf])}
                              title="Descartar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        )}
      </div>

      {/* AlertDialog descartar */}
      <AlertDialog
        open={paraDescartar.length > 0}
        onOpenChange={(v) => !v && setParaDescartar([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar NFs do stage?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a descartar {paraDescartar.length} NF{paraDescartar.length === 1 ? "" : "s"}.
              Os arquivos PDF/XML serão apagados do storage.
              <br /><br />
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

// =====================================================
// KpiPill - Cards de KPI clicáveis (viram filtros)
// =====================================================
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
