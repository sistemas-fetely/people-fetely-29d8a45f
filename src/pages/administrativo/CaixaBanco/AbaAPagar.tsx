/**
 * Aba "A pagar" — compromissos com status_visual = aguardando_pagamento.
 *
 * KPIs: Atrasados, Vence este mês, Vence próximo mês.
 * Colunas: Parceiro, Descrição, Vencimento, Atraso, Categoria, Forma PG, Valor, Tags.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Repeat,
  CreditCard,
  Flame,
  AlertOctagon,
  CalendarClock,
  Receipt,
  FolderTree,
  Paperclip,
  Link2,
  CircleDollarSign,
  AlertTriangle,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { classFundoFuturo } from "@/lib/financeiro/is-vencimento-futuro";
import { getMeioPagamentoIcon } from "@/lib/financeiro/meio-pagamento-icon";
import type { CompromissoInfo } from "@/lib/financeiro/get-compromisso-info";
import type { FlagsContaPagar } from "@/lib/financeiro/get-status-flags";
import { cn } from "@/lib/utils";
import { CardKPI } from "./CardKPI";
import {
  type Lancamento,
  isAtrasada,
  diasAtraso,
  getQualidadeNF,
  getQualidadeCategoria,
  getQualidadeVinculado,
  getQualidadeConciliado,
  corClass,
} from "./utils";

type FiltroPeriodo = "todos" | "atrasados" | "mes_atual" | "proximo_mes";

interface Props {
  lista: Lancamento[];
  isLoading: boolean;
  mapParceiros: Record<string, string>;
  mapFormas: Record<string, string>;
  mapCategorias: Record<string, string>;
  nfMap: Map<string, string | null> | undefined;
  statusFlagsMap: Map<string, FlagsContaPagar>;
  compromissoInfoMap: Map<string, CompromissoInfo>;
  onOpenConta: (id: string) => void;
}

export default function AbaAPagar({
  lista,
  isLoading,
  mapParceiros,
  mapFormas,
  mapCategorias,
  nfMap,
  statusFlagsMap,
  compromissoInfoMap,
  onOpenConta,
}: Props) {
  const navigate = useNavigate();
  const [filtroOp, setFiltroOp] = useState<FiltroPeriodo>("todos");

  const nomeParceiro = (l: Lancamento): string =>
    (l.parceiro_id && mapParceiros[l.parceiro_id]) || l.fornecedor_cliente || "—";

  const kpis = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const iniProx = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const fimProx = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0, 23, 59, 59);

    const atrasados = lista.filter((l) => {
      if (!l.data_vencimento) return false;
      const v = new Date(l.data_vencimento + "T00:00:00");
      return v < hoje;
    });
    const mesAtual = lista.filter((l) => {
      if (!l.data_vencimento) return false;
      const v = new Date(l.data_vencimento + "T00:00:00");
      return v >= iniMes && v <= fimMes;
    });
    const proximoMes = lista.filter((l) => {
      if (!l.data_vencimento) return false;
      const v = new Date(l.data_vencimento + "T00:00:00");
      return v >= iniProx && v <= fimProx;
    });

    const sumValor = (arr: Lancamento[]) =>
      arr.reduce((s, l) => s + Number(l.valor || 0), 0);

    return {
      atrasados: { qtd: atrasados.length, valor: sumValor(atrasados) },
      mesAtual: { qtd: mesAtual.length, valor: sumValor(mesAtual) },
      proximoMes: { qtd: proximoMes.length, valor: sumValor(proximoMes) },
    };
  }, [lista]);

  const filtered = useMemo(() => {
    if (filtroOp === "todos") return lista;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const iniProx = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const fimProx = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0, 23, 59, 59);

    return lista.filter((l) => {
      if (!l.data_vencimento) return false;
      const v = new Date(l.data_vencimento + "T00:00:00");
      if (filtroOp === "atrasados") return v < hoje;
      if (filtroOp === "mes_atual") return v >= iniMes && v <= fimMes;
      if (filtroOp === "proximo_mes") return v >= iniProx && v <= fimProx;
      return true;
    });
  }, [lista, filtroOp]);

  return (
    <div className="space-y-3 pt-2">
      <div className="border border-zinc-200 bg-white/60 rounded-xl p-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <CardKPI
            titulo="Atrasados"
            valor={formatBRL(kpis.atrasados.valor)}
            sublinha={`${kpis.atrasados.qtd} ${kpis.atrasados.qtd === 1 ? "conta" : "contas"}`}
            cor="red"
            ativo={filtroOp === "atrasados"}
            onClick={() => setFiltroOp(filtroOp === "atrasados" ? "todos" : "atrasados")}
            icone={Flame}
          />
          <CardKPI
            titulo="Vence este mês"
            valor={formatBRL(kpis.mesAtual.valor)}
            sublinha={`${kpis.mesAtual.qtd} contas`}
            cor="amber"
            ativo={filtroOp === "mes_atual"}
            onClick={() => setFiltroOp(filtroOp === "mes_atual" ? "todos" : "mes_atual")}
            icone={AlertOctagon}
          />
          <CardKPI
            titulo="Vence próximo mês"
            valor={formatBRL(kpis.proximoMes.valor)}
            sublinha={`${kpis.proximoMes.qtd} contas`}
            cor="blue"
            ativo={filtroOp === "proximo_mes"}
            onClick={() => setFiltroOp(filtroOp === "proximo_mes" ? "todos" : "proximo_mes")}
            icone={CalendarClock}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nenhum compromisso a pagar com os filtros atuais.
        </div>
      ) : (
        <>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Atraso</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Forma PG</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const atrasada = isAtrasada(l);
                  const dias = diasAtraso(l);
                  const formaNome = l.forma_pagamento_id && mapFormas[l.forma_pagamento_id];
                  const categoriaNome = l.categoria_id && mapCategorias[l.categoria_id];
                  const flags = statusFlagsMap.get(l.id);
                  const docPendente = !!flags?.tem_doc_pendente;
                  return (
                    <TableRow
                      key={l.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        atrasada && "bg-red-50/60 hover:bg-red-50",
                        !atrasada && classFundoFuturo(l.data_vencimento),
                      )}
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
                            {l.fatura_vencimento && (
                              <span className="ml-0.5 opacity-80">
                                · venc {new Date(l.fatura_vencimento).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDateBR(l.data_vencimento)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {atrasada ? (
                          <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                            {dias} {dias === 1 ? "dia" : "dias"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {categoriaNome ? (
                          <div className="truncate max-w-[160px]" title={categoriaNome}>
                            {categoriaNome}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {(() => {
                          if (!formaNome) return "—";
                          const ico = getMeioPagamentoIcon(formaNome);
                          if (ico) {
                            return (
                              <span
                                className="flex items-center gap-1.5 whitespace-nowrap"
                                title={formaNome}
                              >
                                <ico.Icon className={`h-4 w-4 ${ico.cor} shrink-0`} />
                                <span>{formaNome}</span>
                              </span>
                            );
                          }
                          return formaNome;
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {formatBRL(l.valor)}
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <TooltipProvider>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const qNF = getQualidadeNF(l, nfMap);
                              const qCat = getQualidadeCategoria(l, nfMap);
                              const qVinc = getQualidadeVinculado(l);
                              const qConc = getQualidadeConciliado(l);
                              return (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Receipt className={cn("h-3.5 w-3.5 cursor-help", corClass(qNF.cor))} strokeWidth={2.2} />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-xs">📄 {qNF.motivo}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <FolderTree className={cn("h-3.5 w-3.5 cursor-help", corClass(qCat.cor))} strokeWidth={2.2} />
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
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <CircleDollarSign className={cn("h-3.5 w-3.5 cursor-help", corClass(qConc.cor))} strokeWidth={2.2} />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-xs">💰 {qConc.motivo}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  {l.categoria_inconsistente && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 cursor-help" strokeWidth={2.2} />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-xs">
                                          {l.inconsistencia_motivo || "Categoria diverge da NF vinculada."}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </>
                              );
                            })()}
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
            {filtered.length} {filtered.length === 1 ? "compromisso" : "compromissos"}
          </p>
        </>
      )}
    </div>
  );
}
