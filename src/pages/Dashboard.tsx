import {
  Users, Briefcase, Calendar, AlertTriangle, FileText, CreditCard, Gift,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativos",
  inativo: "Inativos",
  ferias: "Férias",
  afastado: "Afastados",
  desligado: "Desligados",
};

const STATUS_COLORS: Record<string, string> = {
  ativo: "hsl(142, 72%, 35%)",
  inativo: "hsl(0, 0%, 60%)",
  ferias: "hsl(200, 80%, 50%)",
  afastado: "hsl(32, 95%, 50%)",
  desligado: "hsl(0, 70%, 50%)",
};

export default function Dashboard() {
  const {
    clt, pj, headcount, ferias, aniversariantes,
    statusClt, turnover, folha, nfPendentes, pagPjPendentes, isLoading,
  } = useDashboardData();

  const statusData = Object.entries(statusClt).map(([status, value]) => ({
    name: STATUS_LABELS[status] || status,
    value,
    color: STATUS_COLORS[status] || "hsl(215, 70%, 50%)",
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do seu RH</p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Alertas dinâmicos
  const alertas: { titulo: string; detalhe: string; prioridade: "alta" | "media" | "baixa" }[] = [];
  if (ferias.periodoVencido > 0) alertas.push({ titulo: `${ferias.periodoVencido} período(s) de férias vencido(s)`, detalhe: "Saldo pendente", prioridade: "alta" });
  if (pj.vencendo > 0) alertas.push({ titulo: `${pj.vencendo} contrato(s) PJ vencendo`, detalhe: "Próximos 30 dias", prioridade: "alta" });
  if (nfPendentes > 0) alertas.push({ titulo: `${nfPendentes} nota(s) fiscal(is) pendente(s)`, detalhe: "Aguardando processamento", prioridade: "media" });
  if (pagPjPendentes > 0) alertas.push({ titulo: `${pagPjPendentes} pagamento(s) PJ pendente(s)`, detalhe: "Aguardando pagamento", prioridade: "media" });
  if (folha && folha.status === "aberta") alertas.push({ titulo: `Folha ${folha.competencia} em aberto`, detalhe: "Fechar folha", prioridade: "media" });

  const prioridadeStyles: Record<string, string> = {
    alta: "bg-destructive/10 text-destructive border-0",
    media: "bg-warning/10 text-warning border-0",
    baixa: "bg-info/10 text-info border-0",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do seu RH</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard
          title="Colaboradores CLT"
          value={clt.ativos}
          subtitle={clt.experiencia > 0 ? `${clt.experiencia} em experiência` : undefined}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Prestadores PJ"
          value={pj.ativos}
          subtitle={pj.vencendo > 0 ? `${pj.vencendo} contratos vencendo` : undefined}
          icon={Briefcase}
          variant="info"
        />
        <StatCard
          title="Férias em Gozo"
          value={ferias.emGozo}
          subtitle={ferias.programadas > 0 ? `${ferias.programadas} programadas` : undefined}
          icon={Calendar}
          variant="success"
        />
        <StatCard
          title="NFs Pendentes"
          value={nfPendentes}
          icon={FileText}
          variant={nfPendentes > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Pagamentos PJ"
          value={pagPjPendentes}
          subtitle="Pendentes"
          icon={CreditCard}
          variant={pagPjPendentes > 0 ? "destructive" : "default"}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="card-shadow animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Headcount por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            {headcount.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={headcount} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="dept" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="clt" name="CLT" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pj" name="PJ" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Nenhum dado disponível. Cadastre colaboradores para ver o gráfico.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Admissões vs Desligamentos (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {turnover.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={turnover}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Line type="monotone" dataKey="admissoes" name="Admissões" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="desligamentos" name="Desligamentos" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">

          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status dos Colaboradores</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
          {statusData.length > 0 && (
            <div className="px-6 pb-4 flex flex-wrap gap-3">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="card-shadow animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-warning" />
              Aniversariantes do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aniversariantes.length > 0 ? (
              aniversariantes.map((a) => (
                <div key={a.nome} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {a.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{a.nome}</p>
                    <p className="text-xs text-muted-foreground">{a.depto}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{a.data}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum aniversariante este mês</p>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertas e Pendências
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertas.length > 0 ? (
              alertas.map((t) => (
                <div key={t.titulo} className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-warning shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.titulo}</p>
                    <p className="text-xs text-muted-foreground">{t.detalhe}</p>
                  </div>
                  <Badge variant="outline" className={prioridadeStyles[t.prioridade]}>
                    {t.prioridade}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">✅ Nenhuma pendência no momento</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
