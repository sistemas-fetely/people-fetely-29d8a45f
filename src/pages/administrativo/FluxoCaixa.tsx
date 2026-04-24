import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Link } from "react-router-dom";
import { TrendingUp, Upload } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

type Conta = {
  id: string;
  tipo: string;
  status: string;
  descricao: string;
  valor: number;
  data_vencimento: string | null;
  fornecedor_cliente: string | null;
};

const COLORS = {
  receita: "#1A4A3A",
  despesa: "#8B1A2F",
  saldo: "#2563EB",
};

export default function FluxoCaixa() {
  const [horizonte, setHorizonte] = useState<30 | 60 | 90>(30);
  const [tipoFilter, setTipoFilter] = useState<"todos" | "pagar" | "receber">("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["fluxo-caixa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar_receber")
        .select("id, tipo, status, descricao, valor, data_vencimento, fornecedor_cliente")
        .in("status", ["aberto", "atrasado"])
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return (data || []) as Conta[];
    },
  });

  const inicio = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const dentro = useMemo(() => {
    const limite = new Date(inicio);
    limite.setDate(limite.getDate() + horizonte);
    return (data || []).filter((c) => {
      if (!c.data_vencimento) return false;
      const dv = new Date(c.data_vencimento + "T00:00:00");
      return dv >= inicio && dv <= limite;
    });
  }, [data, horizonte, inicio]);

  const grafico = useMemo(() => {
    const dias: {
      dia: string; receber: number; pagar: number;
      acumReceber: number; acumPagar: number; saldo: number;
    }[] = [];
    for (let i = 0; i < horizonte; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      dias.push({
        dia: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        receber: 0, pagar: 0, acumReceber: 0, acumPagar: 0, saldo: 0,
      });
    }
    dentro.forEach((c) => {
      if (!c.data_vencimento) return;
      const dv = new Date(c.data_vencimento + "T00:00:00");
      const idx = Math.floor((dv.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      if (idx < 0 || idx >= horizonte) return;
      const v = Number(c.valor || 0);
      if (c.tipo === "receber") dias[idx].receber += v;
      else if (c.tipo === "pagar") dias[idx].pagar += v;
    });
    let ar = 0, ap = 0;
    dias.forEach((d) => {
      ar += d.receber;
      ap += d.pagar;
      d.acumReceber = ar;
      d.acumPagar = ap;
      d.saldo = ar - ap;
    });
    return dias;
  }, [dentro, horizonte, inicio]);

  const tabelaFiltrada = useMemo(() => {
    if (tipoFilter === "todos") return dentro;
    return dentro.filter((c) => c.tipo === tipoFilter);
  }, [dentro, tipoFilter]);

  const saldoFinal = grafico.length ? grafico[grafico.length - 1].saldo : 0;
  const temSaldoNegativo = grafico.some((d) => d.saldo < 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-admin" />
            Fluxo de Caixa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Projeção baseada em contas a pagar e receber em aberto.
          </p>
        </div>
        <div className="flex gap-1">
          {([30, 60, 90] as const).map((h) => (
            <Button key={h} size="sm" variant={horizonte === h ? "default" : "outline"} onClick={() => setHorizonte(h)}>
              {h} dias
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (data || []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-admin-muted">
              <Upload className="h-8 w-8 text-admin" />
            </div>
            <p className="text-lg font-semibold">Sem dados para projetar</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Sincronize com o Bling para ver a projeção de fluxo de caixa.
            </p>
            <Button asChild className="bg-admin hover:bg-admin-accent text-admin-foreground">
              <Link to="/administrativo/importar">Ir para importação</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Projeção acumulada</span>
                <span className={`text-sm font-mono ${saldoFinal >= 0 ? "text-green-700" : "text-red-700"}`}>
                  Saldo final: {formatBRL(saldoFinal)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {temSaldoNegativo && (
                <div className="mb-3 px-3 py-2 rounded-md bg-red-50 text-red-800 text-xs border border-red-200">
                  ⚠️ Saldo projetado fica negativo em algum ponto do horizonte.
                </div>
              )}
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={grafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#999" />
                  <Area type="monotone" dataKey="saldo" fill={COLORS.saldo} fillOpacity={0.15} stroke="none" name="Saldo (área)" />
                  <Line type="monotone" dataKey="acumReceber" stroke={COLORS.receita} name="Recebimentos acum." strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="acumPagar" stroke={COLORS.despesa} name="Pagamentos acum." strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="saldo" stroke={COLORS.saldo} name="Saldo projetado" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-base">Vencimentos no período</CardTitle>
                <div className="flex gap-1">
                  {(["todos", "pagar", "receber"] as const).map((t) => (
                    <Button key={t} size="sm" variant={tipoFilter === t ? "default" : "outline"} onClick={() => setTipoFilter(t)} className="capitalize">
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tabelaFiltrada.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Sem vencimentos no período/filtro.
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Fornecedor/Cliente</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabelaFiltrada.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="whitespace-nowrap">{formatDateBR(c.data_vencimento)}</TableCell>
                          <TableCell>
                            <Badge className={c.tipo === "pagar" ? "bg-[#8B1A2F] text-white hover:bg-[#8B1A2F]" : "bg-[#1A4A3A] text-white hover:bg-[#1A4A3A]"}>
                              {c.tipo === "pagar" ? "Pagar" : "Receber"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={c.descricao}>{c.descricao}</TableCell>
                          <TableCell>{c.fornecedor_cliente || "—"}</TableCell>
                          <TableCell className="text-right font-mono whitespace-nowrap">{formatBRL(c.valor)}</TableCell>
                          <TableCell>
                            <Badge className={c.status === "atrasado" ? "bg-red-100 text-red-800 hover:bg-red-100" : "bg-blue-100 text-blue-800 hover:bg-blue-100"}>
                              {c.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
