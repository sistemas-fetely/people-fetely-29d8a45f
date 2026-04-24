import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { LayoutDashboard, Upload } from "lucide-react";
import { formatBRL } from "@/lib/format-currency";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const COLORS = {
  receita: "#1A4A3A",
  despesa: "#8B1A2F",
  alerta: "#D97706",
  neutro: "#6B7280",
  azul: "#2563EB",
  vermelho: "#DC2626",
  verde: "#16A34A",
};

type Periodo = "mes_atual" | "3m" | "6m" | "ano";

function getRangeFromPeriodo(p: Periodo): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0); // último dia mês
  let from: Date;
  if (p === "mes_atual") from = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (p === "3m") from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  else if (p === "6m") from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  else from = new Date(now.getFullYear(), 0, 1);
  return { from, to };
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DashboardFinanceiro() {
  const [periodo, setPeriodo] = useState<Periodo>("mes_atual");
  const range = useMemo(() => getRangeFromPeriodo(periodo), [periodo]);

  const { data: lanc, isLoading: loadingLanc } = useQuery({
    queryKey: ["dashboard-financeiro-lanc", periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("valor, tipo_lancamento, data_competencia, fornecedor")
        .gte("data_competencia", toISODate(range.from))
        .lte("data_competencia", toISODate(range.to));
      if (error) throw error;
      return data || [];
    },
  });

  const { data: lancAll } = useQuery({
    queryKey: ["dashboard-financeiro-lanc-6m"],
    queryFn: async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("valor, tipo_lancamento, data_competencia, fornecedor")
        .gte("data_competencia", toISODate(from));
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contas, isLoading: loadingContas } = useQuery({
    queryKey: ["dashboard-financeiro-contas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar_receber")
        .select("tipo, status, valor, data_vencimento, fornecedor_cliente");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingLanc || loadingContas;

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const lancMes = (lancAll || []).filter((l) => {
      const d = l.data_competencia ? new Date(l.data_competencia + "T00:00:00") : null;
      return d && d >= inicioMes && d <= fimMes;
    });
    const receitaMes = lancMes
      .filter((l) => l.tipo_lancamento === "credito")
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const despesaMes = lancMes
      .filter((l) => l.tipo_lancamento === "debito")
      .reduce((s, l) => s + Number(l.valor || 0), 0);

    const limite30 = new Date(now);
    limite30.setDate(limite30.getDate() + 30);
    const aPagar30 = (contas || [])
      .filter(
        (c) =>
          c.tipo === "pagar" &&
          (c.status === "aberto" || c.status === "atrasado") &&
          c.data_vencimento &&
          new Date(c.data_vencimento + "T00:00:00") <= limite30
      )
      .reduce((s, c) => s + Number(c.valor || 0), 0);

    return {
      receitaMes,
      despesaMes,
      resultadoMes: receitaMes - despesaMes,
      aPagar30,
    };
  }, [lancAll, contas]);

  // Gráfico 1: Receita vs Despesa (6 meses)
  const grafico1 = useMemo(() => {
    const now = new Date();
    const meses: { key: string; label: string; receita: number; despesa: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" });
      meses.push({ key, label, receita: 0, despesa: 0 });
    }
    (lancAll || []).forEach((l) => {
      if (!l.data_competencia) return;
      const key = l.data_competencia.slice(0, 7);
      const m = meses.find((x) => x.key === key);
      if (!m) return;
      const v = Number(l.valor || 0);
      if (l.tipo_lancamento === "credito") m.receita += v;
      else if (l.tipo_lancamento === "debito") m.despesa += v;
    });
    return meses;
  }, [lancAll]);

  // Gráfico 2: por status
  const grafico2 = useMemo(() => {
    const counts: Record<string, number> = { aberto: 0, atrasado: 0, pago: 0 };
    (contas || []).forEach((c) => {
      if (counts[c.status] !== undefined) counts[c.status] += 1;
    });
    return [
      { name: "Aberto", value: counts.aberto, color: COLORS.azul },
      { name: "Atrasado", value: counts.atrasado, color: COLORS.vermelho },
      { name: "Pago", value: counts.pago, color: COLORS.verde },
    ].filter((x) => x.value > 0);
  }, [contas]);

  // Gráfico 3: top 10 fornecedores (despesas)
  const grafico3 = useMemo(() => {
    const map = new Map<string, number>();
    (contas || [])
      .filter((c) => c.tipo === "pagar" && c.fornecedor_cliente)
      .forEach((c) => {
        const k = c.fornecedor_cliente!;
        map.set(k, (map.get(k) || 0) + Number(c.valor || 0));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.length > 30 ? name.slice(0, 30) + "…" : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [contas]);

  // Gráfico 4: fluxo próximos 30 dias
  const grafico4 = useMemo(() => {
    const now = new Date();
    const dias: { dia: string; receber: number; pagar: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      dias.push({
        dia: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        receber: 0,
        pagar: 0,
      });
    }
    const limite = new Date(now);
    limite.setDate(limite.getDate() + 30);
    (contas || []).forEach((c) => {
      if (c.status !== "aberto" && c.status !== "atrasado") return;
      if (!c.data_vencimento) return;
      const dv = new Date(c.data_vencimento + "T00:00:00");
      if (dv < now || dv > limite) return;
      const idx = Math.floor((dv.getTime() - new Date(now.toDateString()).getTime()) / (1000 * 60 * 60 * 24));
      if (idx < 0 || idx >= 30) return;
      const v = Number(c.valor || 0);
      if (c.tipo === "receber") dias[idx].receber += v;
      else if (c.tipo === "pagar") dias[idx].pagar += v;
    });
    return dias;
  }, [contas]);

  const semDados = !isLoading && (contas || []).length === 0 && (lancAll || []).length === 0;
  const semLancamentos = !isLoading && (lancAll || []).length === 0 && (contas || []).length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-admin" />
            Dashboard Financeiro
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão analítica em tempo real: receita, despesa, fluxo de caixa e indicadores.
          </p>
        </div>
        <div className="flex gap-1">
          {(
            [
              { v: "mes_atual", l: "Mês atual" },
              { v: "3m", l: "3 meses" },
              { v: "6m", l: "6 meses" },
              { v: "ano", l: "Este ano" },
            ] as const
          ).map((p) => (
            <Button
              key={p.v}
              size="sm"
              variant={periodo === p.v ? "default" : "outline"}
              onClick={() => setPeriodo(p.v as Periodo)}
            >
              {p.l}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : semDados ? (
        <Card className="border-admin/20">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-admin-muted">
              <Upload className="h-8 w-8 text-admin" />
            </div>
            <div className="max-w-md">
              <p className="text-lg font-semibold">Sem dados financeiros</p>
              <p className="text-sm text-muted-foreground mt-2">
                Sincronize com o Bling para ver seus dados financeiros.
              </p>
            </div>
            <Button asChild className="bg-admin hover:bg-admin-accent text-admin-foreground">
              <Link to="/administrativo/importar">Ir para importação</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">Receita do mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: COLORS.receita }}>
                  {formatBRL(kpis.receitaMes)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">Despesa do mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: COLORS.despesa }}>
                  {formatBRL(kpis.despesaMes)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="text-2xl font-bold"
                  style={{ color: kpis.resultadoMes >= 0 ? COLORS.verde : COLORS.vermelho }}
                >
                  {formatBRL(kpis.resultadoMes)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">A pagar 30 dias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: COLORS.alerta }}>
                  {formatBRL(kpis.aPagar30)}
                </div>
              </CardContent>
            </Card>
          </div>

          {semLancamentos && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-3 text-sm text-amber-900">
                Dados de lançamentos aparecerão quando contas forem pagas no Bling.
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receita vs Despesa (6 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={grafico1}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Legend />
                    <Bar dataKey="receita" fill={COLORS.receita} name="Receita" />
                    <Bar dataKey="despesa" fill={COLORS.despesa} name="Despesa" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contas por status</CardTitle>
              </CardHeader>
              <CardContent>
                {grafico2.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Sem dados.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={grafico2}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        label
                      >
                        {grafico2.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 fornecedores (despesas)</CardTitle>
              </CardHeader>
              <CardContent>
                {grafico3.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Sem dados.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={grafico3} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatBRL(v)} />
                      <Bar dataKey="value" fill={COLORS.despesa} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fluxo previsto (próx. 30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={grafico4}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="receber"
                      stroke={COLORS.receita}
                      name="A receber"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="pagar"
                      stroke={COLORS.despesa}
                      name="A pagar"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
