/**
 * Aba "Realizado" — lançamentos com status_visual = paga.
 *
 * KPIs período: Pago este mês, Pago mês anterior, Sem conciliação.
 * KPIs qualidade: NF, Categoria, Documento, Vinculado, Conciliado.
 * Filtros internos: Contador + Inconsistências + Resolver com IA.
 * Colunas: Parceiro, Descrição, Pago em, NF, Categoria, Conciliado, Contador, Valor, Tags.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Repeat,
  CreditCard,
  Receipt,
  FolderTree,
  Paperclip,
  Link2,
  CircleDollarSign,
  AlertOctagon,
  CalendarRange,
  RefreshCcw,
  AlertTriangle,
  Sparkles,
  Loader2,
  MailCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { getMeioPagamentoIcon } from "@/lib/financeiro/meio-pagamento-icon";
import type { CompromissoInfo } from "@/lib/financeiro/get-compromisso-info";
import type { FlagsContaPagar } from "@/lib/financeiro/get-status-flags";
import { cn } from "@/lib/utils";
import SugestaoIADialog from "@/components/financeiro/SugestaoIADialog";
import FilaRevisaoIADialog from "@/components/financeiro/FilaRevisaoIADialog";
import { CardKPI, CardKPIDuplo } from "./CardKPI";
import {
  type Lancamento,
  statusVisual,
  getQualidadeNF,
  getQualidadeCategoria,
  getQualidadeVinculado,
  getQualidadeConciliado,
  corClass,
} from "./utils";

type FiltroPeriodo = "todos" | "mes_atual" | "mes_anterior" | "sem_conciliacao";
type FiltroQualidade =
  | "todos"
  | "nf_tem" | "nf_falta"
  | "categoria_tem" | "categoria_falta"
  | "doc_tem" | "doc_falta"
  | "vinculado_tem" | "vinculado_falta"
  | "conciliado_tem" | "conciliado_falta";

interface Props {
  lista: Lancamento[];
  isLoading: boolean;
  mapParceiros: Record<string, string>;
  mapFormas: Record<string, string>;
  mapCategorias: Record<string, string>;
  nfMap: Map<string, string | null> | undefined;
  statusFlagsMap: Map<string, FlagsContaPagar>;
  contadorMap: Map<string, { enviada_em: string; descricao: string | null }> | undefined;
  compromissoInfoMap: Map<string, CompromissoInfo>;
  onOpenConta: (id: string) => void;
}

export default function AbaRealizado({
  lista,
  isLoading,
  mapParceiros,
  mapFormas: _mapFormas,
  mapCategorias,
  nfMap,
  statusFlagsMap,
  contadorMap,
  compromissoInfoMap,
  onOpenConta,
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filtroOp, setFiltroOp] = useState<FiltroPeriodo>("todos");
  const [filtroQual, setFiltroQual] = useState<FiltroQualidade>("todos");
  const [filtroContador, setFiltroContador] = useState<"todos" | "enviados" | "nao_enviados">("todos");
  const [mostrarSoInconsistentes, setMostrarSoInconsistentes] = useState(false);
  const [aplicandoIA, setAplicandoIA] = useState(false);
  const [sugestaoMovId, setSugestaoMovId] = useState<string | null>(null);
  const [filaIAOpen, setFilaIAOpen] = useState(false);

  const nomeParceiro = (l: Lancamento): string =>
    (l.parceiro_id && mapParceiros[l.parceiro_id]) || l.fornecedor_cliente || "—";

  async function handleAplicarIAEmMassa() {
    setAplicandoIA(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("aplicar_ia_categoria_em_massa");
      if (error) throw error;
      const aplicadas = (data as { aplicadas?: number } | null)?.aplicadas || 0;
      qc.invalidateQueries({ queryKey: ["lancamentos-caixa-banco"] });
      qc.invalidateQueries({ queryKey: ["ia-fila-ambiguos"] });
      setFilaIAOpen(true);
      if (aplicadas > 0) {
        toast.info(`${aplicadas} resolvidas direto. Vamos pelos ambíguos juntos.`);
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message :
        typeof e === "object" && e !== null
          ? ((e as { message?: string }).message
              ?? (e as { error_description?: string }).error_description
              ?? (e as { details?: string }).details
              ?? (e as { hint?: string }).hint
              ?? JSON.stringify(e))
          : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setAplicandoIA(false);
    }
  }

  const kpis = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const iniAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fimAnt = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);

    const dataPgto = (l: Lancamento) => l.data_pagamento || l.pago_em;
    const inMesAtual = (l: Lancamento) => {
      const d = dataPgto(l);
      if (!d) return false;
      const v = new Date(d.length === 10 ? d + "T00:00:00" : d);
      return v >= iniMes && v <= fimMes;
    };
    const inMesAnt = (l: Lancamento) => {
      const d = dataPgto(l);
      if (!d) return false;
      const v = new Date(d.length === 10 ? d + "T00:00:00" : d);
      return v >= iniAnt && v <= fimAnt;
    };

    const mesAtual = lista.filter(inMesAtual);
    const mesAnterior = lista.filter(inMesAnt);
    const semConciliacao = lista.filter((l) => inMesAtual(l) && !l.conciliado_em);

    const baseQualidade = (() => {
      if (filtroOp === "mes_atual") return mesAtual;
      if (filtroOp === "mes_anterior") return mesAnterior;
      if (filtroOp === "sem_conciliacao") return semConciliacao;
      return lista;
    })();
    const totalBase = baseQualidade.length;

    const comNF = baseQualidade.filter((l) => getQualidadeNF(l, nfMap).cor === "verde").length;
    const comCat = baseQualidade.filter((l) => getQualidadeCategoria(l, nfMap).cor === "verde").length;
    const comDoc = baseQualidade.filter((l) => statusFlagsMap.get(l.id)?.tem_doc_pendente !== true).length;
    const comVinc = baseQualidade.filter((l) =>
      l.vinculada_cartao || l.origem_view === "cartao_lancamento" || l.movimentacao_bancaria_id
    ).length;
    const comConc = baseQualidade.filter((l) =>
      l.conciliado_em || l.status_caixa === "conciliado"
    ).length;

    const sumValor = (arr: Lancamento[]) => arr.reduce((s, l) => s + Number(l.valor || 0), 0);
    const pct = (p: number, t: number) => (t > 0 ? Math.round((p / t) * 100) : 100);

    return {
      mesAtual: { qtd: mesAtual.length, valor: sumValor(mesAtual) },
      mesAnterior: { qtd: mesAnterior.length, valor: sumValor(mesAnterior) },
      semConciliacao: { qtd: semConciliacao.length, valor: sumValor(semConciliacao) },
      qualidadeNF: { pct: pct(comNF, totalBase), atendidos: comNF, total: totalBase },
      qualidadeCategoria: { pct: pct(comCat, totalBase), atendidos: comCat, total: totalBase },
      qualidadeDoc: { pct: pct(comDoc, totalBase), atendidos: comDoc, total: totalBase },
      qualidadeVinculado: { pct: pct(comVinc, totalBase), atendidos: comVinc, total: totalBase },
      qualidadeConciliado: { pct: pct(comConc, totalBase), atendidos: comConc, total: totalBase },
    };
  }, [lista, filtroOp, nfMap, statusFlagsMap]);

  const filtered = useMemo(() => {
    let list = lista;

    if (filtroOp !== "todos") {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
      const iniAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimAnt = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);
      const dataPgto = (l: Lancamento) => l.data_pagamento || l.pago_em;
      list = list.filter((l) => {
        const d = dataPgto(l);
        if (!d) return false;
        const v = new Date(d.length === 10 ? d + "T00:00:00" : d);
        if (filtroOp === "mes_atual") return v >= iniMes && v <= fimMes;
        if (filtroOp === "mes_anterior") return v >= iniAnt && v <= fimAnt;
        if (filtroOp === "sem_conciliacao") return v >= iniMes && v <= fimMes && !l.conciliado_em;
        return true;
      });
    }

    if (filtroQual !== "todos") {
      const docPendente = (l: Lancamento) =>
        statusFlagsMap.get(l.id)?.tem_doc_pendente === true;
      const vinculadoOK = (l: Lancamento) =>
        !!l.vinculada_cartao
        || l.origem_view === "cartao_lancamento"
        || !!l.movimentacao_bancaria_id;
      const conciliadoOK = (l: Lancamento) =>
        !!l.conciliado_em || l.status_caixa === "conciliado";

      if (filtroQual === "nf_tem") list = list.filter((l) => getQualidadeNF(l, nfMap).cor === "verde");
      else if (filtroQual === "nf_falta") list = list.filter((l) => getQualidadeNF(l, nfMap).cor !== "verde");
      else if (filtroQual === "categoria_tem") list = list.filter((l) => getQualidadeCategoria(l, nfMap).cor === "verde");
      else if (filtroQual === "categoria_falta") list = list.filter((l) => getQualidadeCategoria(l, nfMap).cor !== "verde");
      else if (filtroQual === "doc_tem") list = list.filter((l) => !docPendente(l));
      else if (filtroQual === "doc_falta") list = list.filter((l) => docPendente(l));
      else if (filtroQual === "vinculado_tem") list = list.filter((l) => vinculadoOK(l));
      else if (filtroQual === "vinculado_falta") list = list.filter((l) => !vinculadoOK(l));
      else if (filtroQual === "conciliado_tem") list = list.filter((l) => conciliadoOK(l));
      else if (filtroQual === "conciliado_falta") list = list.filter((l) => !conciliadoOK(l));
    }

    if (filtroContador !== "todos") {
      list = list.filter((l) => {
        if (l.origem_view !== "conta_pagar") return false;
        const enviado = contadorMap?.has(l.id) === true;
        return filtroContador === "enviados" ? enviado : !enviado;
      });
    }

    if (mostrarSoInconsistentes) {
      list = list.filter((l) => l.categoria_inconsistente === true);
    }

    return list;
  }, [lista, filtroOp, filtroQual, filtroContador, mostrarSoInconsistentes, nfMap, statusFlagsMap, contadorMap]);

  return (
    <div className="space-y-3 pt-2">
      {/* KPIs Período */}
      <div className="border border-zinc-200 bg-white/60 rounded-xl p-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <CardKPI
            titulo="Pago este mês"
            valor={formatBRL(kpis.mesAtual.valor)}
            sublinha={`${kpis.mesAtual.qtd} contas`}
            cor="amber"
            ativo={filtroOp === "mes_atual"}
            onClick={() => setFiltroOp(filtroOp === "mes_atual" ? "todos" : "mes_atual")}
            icone={AlertOctagon}
          />
          <CardKPI
            titulo="Pago mês anterior"
            valor={formatBRL(kpis.mesAnterior.valor)}
            sublinha={`${kpis.mesAnterior.qtd} contas`}
            cor="purple"
            ativo={filtroOp === "mes_anterior"}
            onClick={() => setFiltroOp(filtroOp === "mes_anterior" ? "todos" : "mes_anterior")}
            icone={CalendarRange}
          />
          <CardKPI
            titulo="Sem conciliação"
            valor={formatBRL(kpis.semConciliacao.valor)}
            sublinha={`${kpis.semConciliacao.qtd} pagas s/ OFX`}
            cor="teal"
            ativo={filtroOp === "sem_conciliacao"}
            onClick={() => setFiltroOp(filtroOp === "sem_conciliacao" ? "todos" : "sem_conciliacao")}
            icone={RefreshCcw}
          />
        </div>
      </div>

      {/* KPIs Qualidade */}
      <div className="border border-emerald-300 bg-emerald-50/20 rounded-xl p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <CardKPIDuplo
            titulo="NF"
            icone={Receipt}
            cor="fetely"
            total={kpis.qualidadeNF.total}
            qtdTem={kpis.qualidadeNF.atendidos}
            qtdFalta={kpis.qualidadeNF.total - kpis.qualidadeNF.atendidos}
            ativoTem={filtroQual === "nf_tem"}
            ativoFalta={filtroQual === "nf_falta"}
            onClickTem={() => setFiltroQual(filtroQual === "nf_tem" ? "todos" : "nf_tem")}
            onClickFalta={() => setFiltroQual(filtroQual === "nf_falta" ? "todos" : "nf_falta")}
          />
          <CardKPIDuplo
            titulo="Categoria"
            icone={FolderTree}
            cor="fetely"
            total={kpis.qualidadeCategoria.total}
            qtdTem={kpis.qualidadeCategoria.atendidos}
            qtdFalta={kpis.qualidadeCategoria.total - kpis.qualidadeCategoria.atendidos}
            ativoTem={filtroQual === "categoria_tem"}
            ativoFalta={filtroQual === "categoria_falta"}
            onClickTem={() => setFiltroQual(filtroQual === "categoria_tem" ? "todos" : "categoria_tem")}
            onClickFalta={() => setFiltroQual(filtroQual === "categoria_falta" ? "todos" : "categoria_falta")}
          />
          <CardKPIDuplo
            titulo="Documento"
            icone={Paperclip}
            cor="fetely"
            total={kpis.qualidadeDoc.total}
            qtdTem={kpis.qualidadeDoc.atendidos}
            qtdFalta={kpis.qualidadeDoc.total - kpis.qualidadeDoc.atendidos}
            ativoTem={filtroQual === "doc_tem"}
            ativoFalta={filtroQual === "doc_falta"}
            onClickTem={() => setFiltroQual(filtroQual === "doc_tem" ? "todos" : "doc_tem")}
            onClickFalta={() => setFiltroQual(filtroQual === "doc_falta" ? "todos" : "doc_falta")}
          />
          <CardKPIDuplo
            titulo="Vinculado"
            icone={Link2}
            cor="fetely"
            total={kpis.qualidadeVinculado.total}
            qtdTem={kpis.qualidadeVinculado.atendidos}
            qtdFalta={kpis.qualidadeVinculado.total - kpis.qualidadeVinculado.atendidos}
            ativoTem={filtroQual === "vinculado_tem"}
            ativoFalta={filtroQual === "vinculado_falta"}
            onClickTem={() => setFiltroQual(filtroQual === "vinculado_tem" ? "todos" : "vinculado_tem")}
            onClickFalta={() => setFiltroQual(filtroQual === "vinculado_falta" ? "todos" : "vinculado_falta")}
          />
          <CardKPIDuplo
            titulo="Conciliado"
            icone={CircleDollarSign}
            cor="fetely"
            total={kpis.qualidadeConciliado.total}
            qtdTem={kpis.qualidadeConciliado.atendidos}
            qtdFalta={kpis.qualidadeConciliado.total - kpis.qualidadeConciliado.atendidos}
            ativoTem={filtroQual === "conciliado_tem"}
            ativoFalta={filtroQual === "conciliado_falta"}
            onClickTem={() => setFiltroQual(filtroQual === "conciliado_tem" ? "todos" : "conciliado_tem")}
            onClickFalta={() => setFiltroQual(filtroQual === "conciliado_falta" ? "todos" : "conciliado_falta")}
          />
        </div>
      </div>

      {/* Filtros internos */}
      <div className="border border-zinc-200 bg-white/60 rounded-xl p-2">
        <div className="flex gap-2 flex-wrap items-center">
          <Select
            value={filtroContador}
            onValueChange={(v) => setFiltroContador(v as "todos" | "enviados" | "nao_enviados")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Contador: todos</SelectItem>
              <SelectItem value="enviados">Contador: enviados</SelectItem>
              <SelectItem value="nao_enviados">Contador: pendentes</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMostrarSoInconsistentes(!mostrarSoInconsistentes)}
            className={cn(
              "gap-1",
              mostrarSoInconsistentes && "bg-amber-600 hover:bg-amber-700 text-white border-amber-600",
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Inconsistências
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAplicarIAEmMassa}
            disabled={aplicandoIA}
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 ml-auto"
          >
            {aplicandoIA ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Resolver com IA
          </Button>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nenhum lançamento realizado com os filtros atuais.
        </div>
      ) : (
        <>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conciliado</TableHead>
                  <TableHead>Contador</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const categoriaNome = l.categoria_id && mapCategorias[l.categoria_id];
                  const flags = statusFlagsMap.get(l.id);
                  const docPendente = !!flags?.tem_doc_pendente;
                  const remessa = contadorMap?.get(l.id);
                  const enviadoContador = !!remessa;
                  const conciliada = !!l.conciliado_em || l.status_caixa === "conciliado";
                  const qNF = getQualidadeNF(l, nfMap);
                  const qCat = getQualidadeCategoria(l, nfMap);
                  const qVinc = getQualidadeVinculado(l);
                  const qConc = getQualidadeConciliado(l);
                  return (
                    <TableRow
                      key={l.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        if (l.origem_view === "cartao_lancamento") {
                          navigate("/administrativo/faturas-cartao");
                        } else {
                          onOpenConta(l.id);
                        }
                      }}
                    >
                      <TableCell className="max-w-[180px]">
                        <div className="truncate" title={nomeParceiro(l)}>
                          {nomeParceiro(l)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate text-xs text-muted-foreground" title={l.descricao}>
                            {l.descricao}
                          </span>
                          {(() => {
                            const ci = compromissoInfoMap.get(l.id);
                            if (ci?.tipo === "recorrente") {
                              return (
                                <span className="shrink-0" title={`Recorrente — ${ci.titulo}`}>
                                  <Repeat className="h-3.5 w-3.5 text-indigo-600" />
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {(l.vinculada_cartao || l.origem_view === "cartao_lancamento") && (
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 px-1.5 h-4 border-violet-300 text-violet-700 bg-violet-50/50 gap-1 mt-0.5"
                          >
                            <CreditCard className="h-2.5 w-2.5" />
                            Cartão
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {l.data_pagamento ? formatDateBR(l.data_pagamento) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Receipt className={cn("h-3.5 w-3.5 cursor-help", corClass(qNF.cor))} strokeWidth={2.2} />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">📄 {qNF.motivo}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          {categoriaNome ? (
                            <div className="truncate max-w-[160px]" title={categoriaNome}>
                              {categoriaNome}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {l.categoria_inconsistente && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] py-0 px-1.5 h-4 border-amber-400 text-amber-700 bg-amber-50 gap-1 whitespace-nowrap shrink-0"
                                  >
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    Inconsistente
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">
                                    {l.inconsistencia_motivo || "Categoria diverge da NF vinculada."}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CircleDollarSign className={cn("h-3.5 w-3.5 cursor-help", corClass(qConc.cor))} strokeWidth={2.2} />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">💰 {qConc.motivo}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {l.origem_view === "conta_pagar" ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <MailCheck
                                  className={cn(
                                    "h-3.5 w-3.5 cursor-help",
                                    enviadoContador ? "text-emerald-600" : "text-zinc-300",
                                  )}
                                  strokeWidth={2.2}
                                />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                  {enviadoContador
                                    ? `📨 Enviado em ${new Date(remessa!.enviada_em).toLocaleDateString("pt-BR")}${remessa!.descricao ? ` (${remessa!.descricao})` : ""}`
                                    : "📭 Ainda não enviado ao contador"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {formatBRL(l.valor)}
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <TooltipProvider>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <FolderTree
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    corClass(qCat.cor),
                                    qCat.temSugestaoIA
                                      ? "cursor-pointer hover:scale-125 transition-transform"
                                      : "cursor-help",
                                  )}
                                  strokeWidth={2.2}
                                  onClick={
                                    qCat.temSugestaoIA
                                      ? (e) => {
                                          e.stopPropagation();
                                          setSugestaoMovId(l.id);
                                        }
                                      : undefined
                                  }
                                />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">🏷️ {qCat.motivo}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Paperclip
                                  className={cn(
                                    "h-3.5 w-3.5 cursor-help",
                                    docPendente ? "text-red-500" : "text-emerald-600",
                                  )}
                                  strokeWidth={2.2}
                                />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                  {docPendente ? "Documento pendente" : "Documento anexado/OK"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link2 className={cn("h-3.5 w-3.5 cursor-help", corClass(qVinc.cor))} strokeWidth={2.2} />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">🔗 {qVinc.motivo}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "lançamento" : "lançamentos"}
          </p>
        </>
      )}

      {sugestaoMovId && (
        <SugestaoIADialog
          movId={sugestaoMovId}
          onClose={() => setSugestaoMovId(null)}
          onApply={() => {
            qc.invalidateQueries({ queryKey: ["lancamentos-caixa-banco"] });
            setSugestaoMovId(null);
          }}
        />
      )}

      <FilaRevisaoIADialog open={filaIAOpen} onClose={() => setFilaIAOpen(false)} />
    </div>
  );
}
