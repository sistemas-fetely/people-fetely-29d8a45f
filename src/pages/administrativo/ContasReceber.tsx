import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownToLine, Search, Inbox } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";

// KPI CANDIDATO: Prazo médio de recebimento (dias entre emissão e recebimento)
// KPI CANDIDATO: % de contas recebidas em atraso
// KPI CANDIDATO: Concentração de clientes (top 3 = X% do total)
// KPI CANDIDATO: Ticket médio por cliente
// KPI CANDIDATO: Inadimplência (% atrasado / a receber)

type Titulo = {
  id: string;
  numero_titulo: string | null;
  data_vencimento_atual: string | null;
  data_pagamento: string | null;
  valor_atual: number | null;
  status: string;
  numero_parcela: number | null;
  total_parcelas: number | null;
  conta_id: string | null;
  cliente?: { razao_social: string | null } | null;
};

type StatusGrupo = "a_receber" | "vencido" | "pago" | "cancelado";
type FiltroGrupo = "todos" | StatusGrupo;

const GRUPO_DE_STATUS: Record<string, StatusGrupo> = {
  // a_receber
  aguardando_pagamento: "a_receber",
  aguardando_envio_bling: "a_receber",
  aguardando_emissao_nf: "a_receber",
  vigente: "a_receber",
  vigente_parcial: "a_receber",
  renegociado: "a_receber",
  // vencido
  vencido: "vencido",
  vencido_suspenso: "vencido",
  em_juridico: "vencido",
  // pago
  pago: "pago",
  pago_com_atraso: "pago",
  pago_judicial: "pago",
  // cancelado
  cancelado: "cancelado",
  cancelado_recuperacao: "cancelado",
  baixado_por_perda: "cancelado",
};

const GRUPO_LABEL: Record<StatusGrupo, string> = {
  a_receber: "A receber",
  vencido: "Vencido",
  pago: "Pago",
  cancelado: "Cancelado",
};

const GRUPO_BADGE: Record<StatusGrupo, string> = {
  a_receber: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  vencido: "bg-red-100 text-red-800 hover:bg-red-100",
  pago: "bg-green-100 text-green-800 hover:bg-green-100",
  cancelado: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

const FILTRO_LABEL: Record<FiltroGrupo, string> = {
  todos: "Todos",
  a_receber: "A receber",
  vencido: "Vencido",
  pago: "Pago",
  cancelado: "Cancelado",
};

const grupoDe = (status: string): StatusGrupo | null =>
  GRUPO_DE_STATUS[status] ?? null;

const PAGE_SIZE = 20;

export default function ContasReceber() {
  const [statusFilter, setStatusFilter] = useState<FiltroGrupo>("todos");
  const [busca, setBusca] = useState("");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["contas-receber-titulos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("titulo_a_receber")
        .select(
          "id, numero_titulo, data_vencimento_atual, data_pagamento, valor_atual, status, numero_parcela, total_parcelas, conta_id, cliente:titulo_a_receber_conta_id_fkey(razao_social)"
        )
        .order("data_vencimento_atual", { ascending: true });
      if (error) throw error;
      return data as unknown as Titulo[];
    },
  });

  const filtered = useMemo(() => {
    let list = data || [];
    if (statusFilter !== "todos") {
      list = list.filter((t) => grupoDe(t.status) === statusFilter);
    }
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter(
        (t) =>
          t.numero_titulo?.toLowerCase().includes(q) ||
          t.cliente?.razao_social?.toLowerCase().includes(q)
      );
    }
    if (dataDe) list = list.filter((t) => (t.data_vencimento_atual || "") >= dataDe);
    if (dataAte) list = list.filter((t) => (t.data_vencimento_atual || "") <= dataAte);
    return list;
  }, [data, statusFilter, busca, dataDe, dataAte]);

  const totals = useMemo(() => {
    const all = data || [];
    const valor = (t: Titulo) => Number(t.valor_atual || 0);

    const aReceber = all
      .filter((t) => {
        const g = grupoDe(t.status);
        return g === "a_receber" || g === "vencido";
      })
      .reduce((s, t) => s + valor(t), 0);

    const vencido = all
      .filter((t) => grupoDe(t.status) === "vencido")
      .reduce((s, t) => s + valor(t), 0);

    const pagosNoPeriodo = all.filter((t) => {
      if (grupoDe(t.status) !== "pago") return false;
      const ref = t.data_pagamento || t.data_vencimento_atual || "";
      if (dataDe && ref < dataDe) return false;
      if (dataAte && ref > dataAte) return false;
      return true;
    });
    const recebidoPeriodo = pagosNoPeriodo.reduce((s, t) => s + valor(t), 0);

    return { aReceber, vencido, recebidoPeriodo };
  }, [data, dataDe, dataAte]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ArrowDownToLine className="h-6 w-6 text-admin" />
          Contas a Receber
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Faturas e recebimentos previstos — por canal e cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Total a receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatBRL(totals.aReceber)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Total vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatBRL(totals.vencido)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Recebido no período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatBRL(totals.recebidoPeriodo)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar número do título ou cliente..."
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
            <div className="flex flex-wrap gap-1">
              {(["todos", "a_receber", "vencido", "pago", "cancelado"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                >
                  {FILTRO_LABEL[s]}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (data || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-admin-muted">
                <Inbox className="h-8 w-8 text-admin" />
              </div>
              <p className="text-lg font-semibold">Nenhum título a receber ainda</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Os títulos a receber nascem automaticamente quando um pedido é faturado. Assim que o primeiro pedido fechar o ciclo, ele aparece aqui.
              </p>
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
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((t) => {
                      const grupo = grupoDe(t.status);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="whitespace-nowrap">{formatDateBR(t.data_vencimento_atual)}</TableCell>
                          <TableCell className="font-mono text-xs">{t.numero_titulo || "—"}</TableCell>
                          <TableCell>{t.cliente?.razao_social || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                            {t.numero_parcela ?? "—"}/{t.total_parcelas ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono whitespace-nowrap">
                            {formatBRL(Number(t.valor_atual || 0))}
                          </TableCell>
                          <TableCell>
                            <Badge className={grupo ? GRUPO_BADGE[grupo] : "bg-muted"}>
                              {grupo ? GRUPO_LABEL[grupo] : t.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {filtered.length} registro{filtered.length === 1 ? "" : "s"} • Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
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
    </div>
  );
}
