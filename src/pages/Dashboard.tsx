import {
  Users, UserPlus, UserMinus, Clock, Calendar, AlertTriangle,
  TrendingUp, Briefcase, Award, Gift,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const headcountData = [
  { dept: "TI", clt: 45, pj: 12 },
  { dept: "Comercial", clt: 30, pj: 5 },
  { dept: "Financeiro", clt: 18, pj: 3 },
  { dept: "RH", clt: 12, pj: 1 },
  { dept: "Marketing", clt: 15, pj: 8 },
  { dept: "Operações", clt: 25, pj: 4 },
];

const turnoverData = [
  { mes: "Jan", admissoes: 8, desligamentos: 3 },
  { mes: "Fev", admissoes: 5, desligamentos: 2 },
  { mes: "Mar", admissoes: 12, desligamentos: 4 },
  { mes: "Abr", admissoes: 6, desligamentos: 5 },
  { mes: "Mai", admissoes: 9, desligamentos: 3 },
  { mes: "Jun", admissoes: 7, desligamentos: 6 },
];

const statusData = [
  { name: "Ativos", value: 178, color: "hsl(142, 72%, 35%)" },
  { name: "Férias", value: 12, color: "hsl(200, 80%, 50%)" },
  { name: "Afastados", value: 5, color: "hsl(32, 95%, 50%)" },
  { name: "Experiência", value: 8, color: "hsl(215, 70%, 28%)" },
];

const aniversariantes = [
  { nome: "Ana Silva", data: "15/04", depto: "TI" },
  { nome: "Carlos Souza", data: "18/04", depto: "Comercial" },
  { nome: "Maria Oliveira", data: "22/04", depto: "RH" },
  { nome: "Pedro Santos", data: "25/04", depto: "Financeiro" },
];

const tarefasPendentes = [
  { titulo: "Fechamento folha Março", prazo: "10/04", prioridade: "alta" },
  { titulo: "Renovação contrato PJ - João", prazo: "15/04", prioridade: "media" },
  { titulo: "Avaliação semestral - TI", prazo: "20/04", prioridade: "baixa" },
  { titulo: "Vencimento experiência - Ana", prazo: "12/04", prioridade: "alta" },
  { titulo: "NF pendente - Empresa X", prazo: "08/04", prioridade: "alta" },
];

const prioridadeStyles: Record<string, string> = {
  alta: "bg-destructive/10 text-destructive border-0",
  media: "bg-warning/10 text-warning border-0",
  baixa: "bg-info/10 text-info border-0",
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do seu RH</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard title="Colaboradores CLT" value={178} subtitle="12 em experiência" icon={Users} variant="default" trend={{ value: 4.2, label: "vs mês anterior" }} />
        <StatCard title="Prestadores PJ" value={33} subtitle="5 contratos vencendo" icon={Briefcase} variant="info" />
        <StatCard title="Admissões (30d)" value={9} icon={UserPlus} variant="success" trend={{ value: 12, label: "vs mês anterior" }} />
        <StatCard title="Desligamentos (30d)" value={3} icon={UserMinus} variant="destructive" trend={{ value: -25, label: "vs mês anterior" }} />
        <StatCard title="Horas Extras" value="342h" subtitle="Acumulado no mês" icon={Clock} variant="warning" />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="card-shadow animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Headcount por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={headcountData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="dept" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="clt" name="CLT" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pj" name="PJ" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-shadow animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Admissões vs Desligamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Line type="monotone" dataKey="admissoes" name="Admissões" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="desligamentos" name="Desligamentos" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="card-shadow animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status dos Colaboradores</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
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
          </CardContent>
          <div className="px-6 pb-4 flex flex-wrap gap-3">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-muted-foreground">{s.name}</span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="card-shadow animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-warning" />
              Aniversariantes do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aniversariantes.map((a) => (
              <div key={a.nome} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {a.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.nome}</p>
                  <p className="text-xs text-muted-foreground">{a.depto}</p>
                </div>
                <span className="text-xs text-muted-foreground">{a.data}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-shadow animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Tarefas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tarefasPendentes.map((t) => (
              <div key={t.titulo} className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-warning shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.titulo}</p>
                  <p className="text-xs text-muted-foreground">Prazo: {t.prazo}</p>
                </div>
                <Badge variant="outline" className={prioridadeStyles[t.prioridade]}>
                  {t.prioridade}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
