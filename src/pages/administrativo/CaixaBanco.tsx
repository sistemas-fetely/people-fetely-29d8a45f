import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  CreditCard,
  Repeat,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";

import ContaPagarDetalheDrawer from "@/components/financeiro/ContaPagarDetalheDrawer";
import { getCompromissoInfoMap, type CompromissoInfo } from "@/lib/financeiro/get-compromisso-info";
import { getMeioPagamentoIcon } from "@/lib/financeiro/meio-pagamento-icon";

import { getStatusFlagsMap, type FlagsContaPagar } from "@/lib/financeiro/get-status-flags";
import { classFundoFuturo } from "@/lib/financeiro/is-vencimento-futuro";
import { cn } from "@/lib/utils";
import { useFiltrosPersistentes } from "@/hooks/useFiltrosPersistentes";

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
  categoria_id: string | null;
  unidade: string | null;
  nf_numero: string | null;
  origem_view: "conta_pagar" | "cartao_lancamento";
  origem?: string | null;
  fatura_id: string | null;
  vinculada_cartao?: boolean | null;
  fatura_vencimento?: string | null;
};

/**
 * Status visual = espelho do status decisório de Contas a Pagar.
 * Lançamentos de cartão (que ainda não viraram conta a pagar individual)
 * não têm status_conta_pagar — caem em fallback derivado.
 */
function statusVisual(l: Lancamento): string {
  if (l.origem_view === "cartao_lancamento") {
    // Lançamentos de fatura ainda não viraram conta a pagar autônoma.
    // Usa derivação simples: se conciliado/pago, "paga"; senão "aguardando_pagamento".
    if (l.movimentacao_bancaria_id || l.status_caixa === "conciliado") return "paga";
    if (l.status_caixa === "pago") return "paga";
    return "aguardando_pagamento";
  }
  // Conta a pagar normal: espelha direto
  return l.status_conta_pagar || "aberto";
}

/**
 * Conta a pagar é "atrasada" quando vencimento passou e não foi paga/cancelada.
 * Computado client-side (view não expõe campo equivalente).
 */
function isAtrasada(l: Lancamento): boolean {
  if (!l.data_vencimento) return false;
  const status = statusVisual(l);
  if (status === "paga" || status === "cancelado") return false;
  // Comparação de data sem hora (evita TZ surpresas)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(l.data_vencimento + "T00:00:00");
  return venc < hoje;
}

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

type CategoriaLite = {
  id: string;
  nome: string;
};

// Status visual em Caixa & Banco ESPELHA status decisório de Contas a Pagar.
// Doutrina: status é status — sem tradução, sem derivação.
const STATUS_STYLES: Record<string, string> = {
  aberto: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  aprovado: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  aguardando_pagamento: "bg-teal-100 text-teal-800 hover:bg-teal-100",
  paga: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  cancelado: "bg-red-100 text-red-800 hover:bg-red-100",
};

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  aprovado: "Aprovado",
  aguardando_pagamento: "Aguardando pagamento",
  paga: "Paga",
  cancelado: "Cancelado",
};

const PAGE_SIZE = 25;

export default function CaixaBanco() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useFiltrosPersistentes<string>("caixabanco_status", "todos");
  const [contaBancariaFilter, setContaBancariaFilter] = useFiltrosPersistentes<string>("caixabanco_conta", "todas");
  const [busca, setBusca] = useFiltrosPersistentes<string>("caixabanco_busca", "");
  const [page, setPage] = useFiltrosPersistentes<number>("caixabanco_page", 1);
  const [contaIdDrawer, setContaIdDrawer] = useState<string | null>(null);
  const navigate = useNavigate();

  // Query da view unificada
  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ["lancamentos-caixa-banco"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("vw_lancamentos_caixa_banco")
        .select("*")
        .in("status_conta_pagar", ["aguardando_pagamento", "paga"])
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

  // Formas de pagamento
  const { data: formasPagamento } = useQuery({
    queryKey: ["formas-pagamento-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("formas_pagamento")
        .select("id, nome");
      return (data || []) as FormaPgtoLite[];
    },
  });

  // Parceiros
  const { data: parceiros } = useQuery({
    queryKey: ["parceiros-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parceiros_comerciais")
        .select("id, razao_social");
      return (data || []) as Parceiro[];
    },
  });

  // Plano de contas (categorias)
  const { data: categorias } = useQuery({
    queryKey: ["plano-contas-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plano_contas")
        .select("id, nome");
      return (data || []) as CategoriaLite[];
    },
  });

  // Map: lancamento.id -> { tipo: 'recorrente'|'parcelado', titulo }
  // Só busca pra lançamentos vindos de contas a pagar (não pra cartão_lancamento)
  const idsParaCompromisso = useMemo(
    () =>
      (lancamentos || [])
        .filter((l) => l.origem_view === "conta_pagar")
        .map((l) => l.id),
    [lancamentos],
  );

  const { data: compromissoInfoMap = new Map<string, CompromissoInfo>() } = useQuery({
    queryKey: ["compromisso-info-map-caixa-banco", idsParaCompromisso.join(",")],
    enabled: idsParaCompromisso.length > 0,
    queryFn: () => getCompromissoInfoMap(idsParaCompromisso),
  });

  // Map: lancamento.id -> { tem_doc_pendente, atrasada }
  // Necessário porque vw_lancamentos_caixa_banco não expõe esses derivados.
  const { data: statusFlagsMap = new Map<string, FlagsContaPagar>() } = useQuery({
    queryKey: ["status-flags-map-caixa-banco", idsParaCompromisso.join(",")],
    enabled: idsParaCompromisso.length > 0,
    queryFn: () => getStatusFlagsMap(idsParaCompromisso),
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

  const mapCategorias = useMemo(() => {
    const m: Record<string, string> = {};
    (categorias || []).forEach((c) => (m[c.id] = c.nome));
    return m;
  }, [categorias]);

  // Filtros
  const filtered = useMemo(() => {
    let list = lancamentos || [];
    if (statusFilter !== "todos") {
      list = list.filter((l) => statusVisual(l) === statusFilter);
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

  // Totais
  const totals = useMemo(() => {
    const all = lancamentos || [];
    const emAberto = all
      .filter((l) => {
        const s = statusVisual(l);
        return s !== "paga" && s !== "cancelado" && l.origem_view !== "cartao_lancamento";
      })
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const pago = all
      .filter((l) => statusVisual(l) === "paga")
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const conciliado = all
      .filter((l) => l.movimentacao_bancaria_id)
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    return {
      emAberto,
      pago,
      conciliado,
      countAberto: all.filter((l) => {
        const s = statusVisual(l);
        return s !== "paga" && s !== "cancelado" && l.origem_view !== "cartao_lancamento";
      }).length,
      countPago: all.filter((l) => statusVisual(l) === "paga").length,
      countConciliado: all.filter((l) => l.movimentacao_bancaria_id).length,
    };
  }, [lancamentos]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSucessoPagamento() {
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
            Movimentações — espinha dorsal financeira (realizado + comprometido).
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
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Dt. Vencimento</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Dt. Pagamento</TableHead>
                      <TableHead>Meio PG</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((l) => {
                      const isSel = selecionados.has(l.id);
                      const sVisual = statusVisual(l);
                      const podeSel =
                        l.origem_view !== "cartao_lancamento" &&
                        sVisual !== "paga" &&
                        sVisual !== "cancelado";
                      const atrasada = isAtrasada(l);
                      const formaNome =
                        l.forma_pagamento_id && mapFormas[l.forma_pagamento_id];
                      const categoriaNome =
                        l.categoria_id && mapCategorias[l.categoria_id];
                      const conciliada = !!l.movimentacao_bancaria_id;
                      const flags = statusFlagsMap.get(l.id);
                      const docPendente = !!flags?.tem_doc_pendente;
                      return (
                        <TableRow
                          key={l.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors",
                            atrasada && "bg-red-50/60 hover:bg-red-50",
                            !atrasada && classFundoFuturo(l.data_vencimento),
                            isSel && "bg-primary/5 hover:bg-primary/10",
                          )}
                          onClick={(e) => {
                            // Modo seleção: se já existe alguma seleção ativa,
                            // clique na linha alterna a seleção em vez de abrir drawer.
                            if (selecionados.size > 0 && podeSel) {
                              toggleSelecionado(l.id);
                              return;
                            }
                            if (l.origem_view === "cartao_lancamento") {
                              navigate("/administrativo/faturas-cartao");
                            } else {
                              setContaIdDrawer(l.id);
                            }
                          }}
                        >
                          <TableCell
                            className="px-3 py-2 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (podeSel) toggleSelecionado(l.id);
                            }}
                          >
                            <div className="flex items-center justify-center -m-2 p-2">
                              <Checkbox
                                checked={isSel}
                                disabled={!podeSel}
                                onCheckedChange={() => podeSel && toggleSelecionado(l.id)}
                                aria-label="Selecionar"
                                className="h-5 w-5 pointer-events-none"
                              />
                            </div>
                          </TableCell>
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
                                    <span
                                      className="shrink-0"
                                      title={`Recorrente — ${ci.titulo}`}
                                    >
                                      <Repeat className="h-3.5 w-3.5 text-indigo-600" />
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              {conciliada && (
                                <span
                                  className="shrink-0"
                                  title="Conciliada — bateu com extrato bancário"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                </span>
                              )}
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
                          <TableCell className="text-xs">
                            {categoriaNome ? (
                              <div
                                className="truncate max-w-[160px]"
                                title={categoriaNome}
                              >
                                {categoriaNome}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {l.data_pagamento ? (
                              formatDateBR(l.data_pagamento)
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
                          <TableCell>
                            <Badge className={STATUS_STYLES[sVisual] || "bg-muted"}>
                              {STATUS_LABEL[sVisual] || sVisual}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <div className="flex flex-wrap gap-1">
                              {docPendente && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] py-0 px-1.5 h-4 border-amber-400 text-amber-700 bg-amber-50 gap-1 whitespace-nowrap"
                                  title="Pagamento foi enviado ao financeiro mas falta NF/Recibo"
                                >
                                  <FileWarning className="h-2.5 w-2.5" />
                                  Doc pendente
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
    </div>
  );
}
