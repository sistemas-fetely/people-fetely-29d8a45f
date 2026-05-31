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
import { TrendingUp } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { InputMoedaBR } from "@/components/compras/InputMoedaBR";
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

interface LinhaFluxo {
  dia: string;
  entradas_dia: number;
  saidas_dia: number;
  entradas_conservador_dia: number;
  saldo_otimista: number;
  saldo_conservador: number;
}

const COR_POSITIVO = "#1A4A3A";
const COR_NEGATIVO = "#8B1A2F";
const COR_SALDO = "#2563EB";

function formatK(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${Math.round(v / 1_000)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function diaCurto(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function FluxoCaixa() {
  const [horizonte, setHorizonte] = useState<30 | 60 | 90>(90);
  const [saldoInicialOverride, setSaldoInicialOverride] = useState<number | null>(null);
  const [saldoInput, setSaldoInput] = useState<number>(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["fluxo-caixa", horizonte, saldoInicialOverride],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_fluxo_caixa_projetado", {
        p_horizonte: horizonte,
        p_saldo_inicial: saldoInicialOverride,
      } as never);
      if (error) throw error;
      return (data || []) as LinhaFluxo[];
    },
  });

  const linhas = data || [];

  const indicadores = useMemo(() => {
    if (linhas.length === 0) {
      return {
        saldoHoje: 0, runwayDias: null as number | null, runwayData: null as string | null,
        menorSaldo: 0, menorSaldoData: null as string | null,
        maiorPico: 0, maiorPicoData: null as string | null,
        totalEntradas: 0, totalSaidas: 0,
      };
    }
    const l0 = linhas[0];
    const ancora = saldoInicialOverride != null
      ? saldoInicialOverride
      : l0.saldo_otimista - l0.entradas_dia + l0.saidas_dia;

    let runwayDias: number | null = null;
    let runwayData: string | null = null;
    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i].saldo_conservador < 0) {
        runwayDias = i;
        runwayData = linhas[i].dia;
        break;
      }
    }

    let menorSaldo = linhas[0].saldo_conservador;
    let menorSaldoData = linhas[0].dia;
    let maiorPico = linhas[0].saldo_otimista;
    let maiorPicoData = linhas[0].dia;
    let totalEntradas = 0;
    let totalSaidas = 0;
    for (const l of linhas) {
      if (l.saldo_conservador < menorSaldo) { menorSaldo = l.saldo_conservador; menorSaldoData = l.dia; }
      if (l.saldo_otimista > maiorPico) { maiorPico = l.saldo_otimista; maiorPicoData = l.dia; }
      totalEntradas += Number(l.entradas_dia || 0);
      totalSaidas += Number(l.saidas_dia || 0);
    }

    return { saldoHoje: ancora, runwayDias, runwayData, menorSaldo, menorSaldoData, maiorPico, maiorPicoData, totalEntradas, totalSaidas };
  }, [linhas, saldoInicialOverride]);

  const grafico = useMemo(() => linhas.map((l) => ({
    diaLabel: diaCurto(l.dia),
    diaISO: l.dia,
    saldo_otimista: Number(l.saldo_otimista),
    saldo_conservador: Number(l.saldo_conservador),
    entradas_dia: Number(l.entradas_dia),
    saidas_dia: Number(l.saidas_dia),
  })), [linhas]);

  const eventos = useMemo(() => {
    const out: { dia: string; tipo: "Entrada" | "Saída"; valor: number; saldoConservador: number }[] = [];
    for (const l of linhas) {
      if (l.entradas_dia > 0) out.push({ dia: l.dia, tipo: "Entrada", valor: l.entradas_dia, saldoConservador: l.saldo_conservador });
      if (l.saidas_dia > 0) out.push({ dia: l.dia, tipo: "Saída", valor: l.saidas_dia, saldoConservador: l.saldo_conservador });
    }
    return out.slice(0, 15);
  }, [linhas]);

  const semMovimento = linhas.length > 0 && eventos.length === 0;

  // Cor do menor saldo
  const menorSaldoCor =
    indicadores.menorSaldo < 0 ? "text-red-700"
    : indicadores.menorSaldo < indicadores.saldoHoje * 0.1 ? "text-amber-700"
    : "text-green-700";

  // Frase CFO
  const frase = indicadores.runwayDias == null
    ? `No cenário conservador, seu caixa permanece positivo nos próximos ${horizonte} dias. Menor folga: ${formatBRL(indicadores.menorSaldo)} em ${formatDateBR(indicadores.menorSaldoData)}.`
    : `Atenção: no cenário conservador o caixa zera em ${indicadores.runwayDias} dias (${formatDateBR(indicadores.runwayData)}). Diferença para o cenário otimista = risco de inadimplência a monitorar.`;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-admin" />
            Fluxo de Caixa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Projeção gerencial ancorada no saldo de hoje (otimista x conservador).
          </p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex gap-1">
            {([30, 60, 90] as const).map((h) => (
              <Button key={h} size="sm" variant={horizonte === h ? "default" : "outline"} onClick={() => setHorizonte(h)}>
                {h} dias
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Saldo inicial (override)</label>
            <div className="flex gap-2">
              <div className="w-44">
                <InputMoedaBR value={saldoInput} onChange={setSaldoInput} />
              </div>
              <Button size="sm" variant="outline" onClick={() => setSaldoInicialOverride(saldoInput > 0 ? saldoInput : null)}>
                Aplicar
              </Button>
              {saldoInicialOverride != null && (
                <Button size="sm" variant="ghost" onClick={() => { setSaldoInicialOverride(null); setSaldoInput(0); }}>
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-sm text-red-700">
            Erro ao carregar projeção: {(error as Error).message}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
          </div>
          <Skeleton className="h-[340px] w-full" />
        </div>
      ) : (
        <>
          {/* KPIs PRINCIPAIS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Saldo hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-mono font-semibold tabular-nums">{formatBRL(indicadores.saldoHoje)}</div>
                <div className="text-xs text-muted-foreground mt-1">ponto de partida</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Dias de caixa (runway)</CardTitle>
              </CardHeader>
              <CardContent>
                {indicadores.runwayDias == null ? (
                  <div className="text-3xl font-mono font-semibold tabular-nums text-green-700">Positivo no horizonte</div>
                ) : (
                  <>
                    <div className="text-3xl font-mono font-semibold tabular-nums text-red-700">
                      fura em {indicadores.runwayDias} dias
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{formatDateBR(indicadores.runwayData)}</div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Menor saldo projetado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-mono font-semibold tabular-nums ${menorSaldoCor}`}>
                  {formatBRL(indicadores.menorSaldo)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">em {formatDateBR(indicadores.menorSaldoData)} (conservador)</div>
              </CardContent>
            </Card>
          </div>

          {/* FRASE CFO */}
          <div className={`px-4 py-3 rounded-md text-sm border ${indicadores.runwayDias == null ? "bg-green-50 text-green-900 border-green-200" : "bg-red-50 text-red-900 border-red-200"}`}>
            {frase}
          </div>

          {/* GRÁFICO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projeção de saldo — otimista x conservador</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={grafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="diaLabel" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const p = payload[0].payload as typeof grafico[number];
                      return (
                        <div className="rounded-md border bg-background p-2 text-xs shadow-sm">
                          <div className="font-semibold mb-1">{formatDateBR(p.diaISO)}</div>
                          <div>Otimista: <span className="font-mono">{formatBRL(p.saldo_otimista)}</span></div>
                          <div>Conservador: <span className="font-mono">{formatBRL(p.saldo_conservador)}</span></div>
                          <div className="text-green-700">Entradas dia: <span className="font-mono">{formatBRL(p.entradas_dia)}</span></div>
                          <div className="text-red-700">Saídas dia: <span className="font-mono">{formatBRL(p.saidas_dia)}</span></div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke={COR_NEGATIVO} strokeDasharray="4 4" label={{ value: "Zero", position: "insideTopRight", fontSize: 10, fill: COR_NEGATIVO }} />
                  <Area type="monotone" dataKey="saldo_conservador" fill={COR_NEGATIVO} fillOpacity={0.1} stroke="none" name="" legendType="none" />
                  <Line type="monotone" dataKey="saldo_otimista" stroke={COR_SALDO} strokeWidth={2} dot={false} name="Saldo otimista" />
                  <Line type="monotone" dataKey="saldo_conservador" stroke={COR_NEGATIVO} strokeWidth={2} strokeDasharray="5 4" dot={false} name="Saldo conservador" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* KPIs SECUNDÁRIOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Maior pico de caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono font-semibold tabular-nums" style={{ color: COR_SALDO }}>
                  {formatBRL(indicadores.maiorPico)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  em {formatDateBR(indicadores.maiorPicoData)} — melhor janela para antecipar compras.
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Total a receber ({horizonte}d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono font-semibold tabular-nums" style={{ color: COR_POSITIVO }}>
                  {formatBRL(indicadores.totalEntradas)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Total a pagar ({horizonte}d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-mono font-semibold tabular-nums" style={{ color: COR_NEGATIVO }}>
                  {formatBRL(indicadores.totalSaidas)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TABELA EVENTOS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximos eventos de caixa</CardTitle>
            </CardHeader>
            <CardContent>
              {semMovimento ? (
                <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
                  Sem lançamentos no horizonte ainda. Defina um saldo inicial acima para visualizar a projeção,
                  ou cadastre títulos a receber e contas a pagar.
                </div>
              ) : eventos.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Sem eventos.</div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Saldo conservador no dia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventos.map((e, i) => (
                        <TableRow key={`${e.dia}-${e.tipo}-${i}`}>
                          <TableCell className="whitespace-nowrap">{formatDateBR(e.dia)}</TableCell>
                          <TableCell>
                            <Badge
                              className={e.tipo === "Entrada"
                                ? "bg-[#1A4A3A] text-white hover:bg-[#1A4A3A]"
                                : "bg-[#8B1A2F] text-white hover:bg-[#8B1A2F]"}
                            >
                              {e.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                            {formatBRL(e.valor)}
                          </TableCell>
                          <TableCell className={`text-right font-mono tabular-nums whitespace-nowrap ${e.saldoConservador < 0 ? "text-red-700" : ""}`}>
                            {formatBRL(e.saldoConservador)}
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
