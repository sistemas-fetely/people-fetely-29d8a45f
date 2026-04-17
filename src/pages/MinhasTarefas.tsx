import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ClipboardList, CheckCircle2, AlertTriangle, Clock, Eye, Inbox, Plus,
  Play, Pencil, X, MoreVertical, Users, ExternalLink, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Tarefa {
  id: string;
  tipo_processo: string;
  sistema_origem: string;
  processo_id: string | null;
  colaborador_id: string | null;
  colaborador_tipo: string | null;
  colaborador_nome: string | null;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  area_destino: string | null;
  responsavel_role: string | null;
  responsavel_user_id: string | null;
  accountable_user_id: string | null;
  prazo_data: string | null;
  status: string;
  concluida_em: string | null;
  bloqueante: boolean | null;
  evidencia_texto: string | null;
  evidencia_url: string | null;
  criado_por: string | null;
  created_at: string;
}

type StatusFilter = "ativas" | "pendente" | "atrasada" | "em_andamento" | "concluida" | "todas";
type AgrupamentoTipo = "prioridade" | "area" | "prazo" | "processo" | "nenhum";

const PRIORIDADE_ORDER: Record<string, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 };

export default function MinhasTarefas() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"minhas" | "acompanhamento">("minhas");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ativas");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [sistemaFilter, setSistemaFilter] = useState<string>("todos");
  const [agrupamento, setAgrupamento] = useState<AgrupamentoTipo>("prioridade");

  // Conclusão
  const [concluirTarefa, setConcluirTarefa] = useState<Tarefa | null>(null);
  const [evidenciaTexto, setEvidenciaTexto] = useState("");
  const [evidenciaUrl, setEvidenciaUrl] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Cancelar
  const [cancelarTarefa, setCancelarTarefa] = useState<Tarefa | null>(null);

  const loadTarefas = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Marcar atrasadas
    const hoje = new Date().toISOString().split("T")[0];
    await supabase
      .from("sncf_tarefas")
      .update({ status: "atrasada" })
      .eq("responsavel_user_id", user.id)
      .eq("status", "pendente")
      .lt("prazo_data", hoje);

    // Buscar tarefas: minhas (responsavel ou role) + acompanhamento (accountable)
    const filters: string[] = [`responsavel_user_id.eq.${user.id}`, `accountable_user_id.eq.${user.id}`];
    if (roles?.length) {
      filters.push(`responsavel_role.in.(${roles.join(",")})`);
    }

    const { data, error } = await supabase
      .from("sncf_tarefas")
      .select("*")
      .or(filters.join(","))
      .order("prazo_data", { ascending: true, nullsFirst: false });

    if (error) {
      toast.error("Erro ao carregar tarefas: " + error.message);
      setTarefas([]);
    } else {
      setTarefas((data ?? []) as Tarefa[]);
    }
    setLoading(false);
  }, [user, roles]);

  useEffect(() => {
    void loadTarefas();
  }, [loadTarefas]);

  // Separar minhas vs acompanhamento
  const { minhasTarefas, tarefasAcompanhamento } = useMemo(() => {
    const minhas: Tarefa[] = [];
    const acomp: Tarefa[] = [];
    for (const t of tarefas) {
      const ehResponsavel =
        t.responsavel_user_id === user?.id ||
        (t.responsavel_role && roles?.includes(t.responsavel_role as never));
      const ehAccountable = t.accountable_user_id === user?.id;
      if (ehResponsavel) minhas.push(t);
      else if (ehAccountable) acomp.push(t);
    }
    return { minhasTarefas: minhas, tarefasAcompanhamento: acomp };
  }, [tarefas, user, roles]);

  // Filtros aplicados
  const aplicarFiltros = (lista: Tarefa[]) =>
    lista.filter((t) => {
      // status
      if (statusFilter === "ativas" && !["pendente", "atrasada"].includes(t.status)) return false;
      if (["pendente", "atrasada", "em_andamento", "concluida"].includes(statusFilter) && t.status !== statusFilter) return false;
      // tipo
      if (tipoFilter !== "todos" && t.tipo_processo !== tipoFilter) return false;
      // sistema
      if (sistemaFilter !== "todos" && t.sistema_origem !== sistemaFilter) return false;
      return true;
    });

  const minhasFiltradas = aplicarFiltros(minhasTarefas);
  const acompanhamentoFiltradas = aplicarFiltros(tarefasAcompanhamento);

  // KPIs (sobre minhasTarefas — execução do usuário)
  const kpis = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    const pendentes = minhasTarefas.filter((t) => t.status === "pendente").length;
    const atrasadas = minhasTarefas.filter((t) => t.status === "atrasada").length;
    const emAndamento = minhasTarefas.filter((t) => t.status === "em_andamento").length;
    const concluidasHoje = minhasTarefas.filter(
      (t) => t.status === "concluida" && t.concluida_em?.startsWith(hoje),
    ).length;
    return {
      pendentes,
      atrasadas,
      emAndamento,
      concluidasHoje,
      acompanhamento: tarefasAcompanhamento.filter((t) => !["concluida", "cancelada"].includes(t.status)).length,
    };
  }, [minhasTarefas, tarefasAcompanhamento]);

  // Ações
  const handleConcluir = (t: Tarefa) => {
    setConcluirTarefa(t);
    setEvidenciaTexto("");
    setEvidenciaUrl("");
  };

  const confirmarConclusao = async () => {
    if (!concluirTarefa || evidenciaTexto.trim().length < 5) {
      toast.error("Descreva brevemente o que foi feito (mínimo 5 caracteres)");
      return;
    }
    setSalvando(true);
    const { error } = await supabase
      .from("sncf_tarefas")
      .update({
        status: "concluida",
        concluida_em: new Date().toISOString(),
        concluida_por: user?.id,
        evidencia_texto: evidenciaTexto.trim(),
        evidencia_url: evidenciaUrl.trim() || null,
      })
      .eq("id", concluirTarefa.id);

    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa concluída!");
      setConcluirTarefa(null);
      void loadTarefas();
    }
    setSalvando(false);
  };

  const handleIniciar = async (t: Tarefa) => {
    const { error } = await supabase
      .from("sncf_tarefas")
      .update({ status: "em_andamento" })
      .eq("id", t.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa iniciada");
      void loadTarefas();
    }
  };

  const confirmarCancelamento = async () => {
    if (!cancelarTarefa) return;
    const { error } = await supabase
      .from("sncf_tarefas")
      .update({ status: "cancelada" })
      .eq("id", cancelarTarefa.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa cancelada");
      setCancelarTarefa(null);
      void loadTarefas();
    }
  };

  // Agrupamento
  const agrupar = (lista: Tarefa[]): Array<{ nome: string; tarefas: Tarefa[] }> => {
    if (agrupamento === "nenhum") {
      const ordenadas = [...lista].sort((a, b) => {
        const pa = PRIORIDADE_ORDER[a.prioridade] ?? 9;
        const pb = PRIORIDADE_ORDER[b.prioridade] ?? 9;
        if (pa !== pb) return pa - pb;
        return (a.prazo_data ?? "9999").localeCompare(b.prazo_data ?? "9999");
      });
      return [{ nome: "Todas", tarefas: ordenadas }];
    }

    const grupos = new Map<string, Tarefa[]>();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const t of lista) {
      let chave = "Outros";
      if (agrupamento === "prioridade") {
        const map: Record<string, string> = {
          urgente: "🔴 Urgente",
          alta: "🟠 Alta",
          normal: "🟡 Normal",
          baixa: "🟢 Baixa",
        };
        chave = map[t.prioridade] ?? "Sem prioridade";
      } else if (agrupamento === "area") {
        chave = t.area_destino ? t.area_destino.toUpperCase() : "Geral";
      } else if (agrupamento === "prazo") {
        if (!t.prazo_data) chave = "Sem prazo";
        else {
          const prazo = new Date(t.prazo_data + "T00:00:00");
          const diff = Math.floor((prazo.getTime() - hoje.getTime()) / 86400000);
          if (diff < 0) chave = "🔴 Atrasadas";
          else if (diff === 0) chave = "🟠 Hoje";
          else if (diff <= 7) chave = "🟡 Esta semana";
          else if (diff <= 14) chave = "🔵 Próxima semana";
          else chave = "📅 Mais tarde";
        }
      } else if (agrupamento === "processo") {
        const map: Record<string, string> = {
          onboarding: "Onboarding",
          manual: "Tarefas Manuais",
          manutencao: "Manutenção",
        };
        chave = map[t.tipo_processo] ?? t.tipo_processo;
      }
      const arr = grupos.get(chave) ?? [];
      arr.push(t);
      grupos.set(chave, arr);
    }

    // Ordem dos grupos
    const ordemPrioridade = ["🔴 Urgente", "🟠 Alta", "🟡 Normal", "🟢 Baixa"];
    const ordemPrazo = ["🔴 Atrasadas", "🟠 Hoje", "🟡 Esta semana", "🔵 Próxima semana", "📅 Mais tarde", "Sem prazo"];
    const ordem = agrupamento === "prioridade" ? ordemPrioridade : agrupamento === "prazo" ? ordemPrazo : null;

    const entries = Array.from(grupos.entries()).map(([nome, tarefas]) => ({
      nome,
      tarefas: tarefas.sort((a, b) => (a.prazo_data ?? "9999").localeCompare(b.prazo_data ?? "9999")),
    }));

    if (ordem) {
      entries.sort((a, b) => {
        const ia = ordem.indexOf(a.nome);
        const ib = ordem.indexOf(b.nome);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
    } else {
      entries.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return entries;
  };

  const renderTarefa = (tarefa: Tarefa) => {
    const diasAtraso = tarefa.prazo_data
      ? Math.ceil((Date.now() - new Date(tarefa.prazo_data + "T00:00:00").getTime()) / 86400000)
      : 0;

    return (
      <div
        key={tarefa.id}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border transition-colors",
          tarefa.status === "atrasada"
            ? "bg-destructive/5 border-destructive/30"
            : tarefa.bloqueante
            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
            : tarefa.status === "concluida"
            ? "bg-muted/30 border-border"
            : "hover:bg-muted/50 border-border",
        )}
      >
        <button
          onClick={() => handleConcluir(tarefa)}
          disabled={tarefa.status === "concluida"}
          className={cn(
            "mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
            tarefa.status === "concluida"
              ? "bg-emerald-500 border-emerald-500"
              : "border-muted-foreground/30 hover:border-emerald-400",
          )}
          aria-label="Concluir tarefa"
        >
          {tarefa.status === "concluida" && <CheckCircle2 className="h-3 w-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={cn(
                "font-medium text-sm",
                tarefa.status === "concluida" && "line-through text-muted-foreground",
              )}
            >
              {tarefa.titulo}
            </p>
            {tarefa.bloqueante && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                ⚠ Legal
              </Badge>
            )}
            {tarefa.prioridade === "urgente" && (
              <Badge variant="destructive" className="text-[10px]">Urgente</Badge>
            )}
            {tarefa.tipo_processo !== "manual" && (
              <Badge variant="secondary" className="text-[10px]">{tarefa.tipo_processo}</Badge>
            )}
            {tarefa.tipo_processo === "manual" && (
              <Badge variant="outline" className="text-[10px]">Manual</Badge>
            )}
            {tarefa.status === "atrasada" && (
              <Badge variant="destructive" className="text-[10px]">
                Atrasada {diasAtraso > 0 ? `há ${diasAtraso} dia${diasAtraso !== 1 ? "s" : ""}` : ""}
              </Badge>
            )}
            {tarefa.status === "em_andamento" && (
              <Badge className="text-[10px] bg-blue-500 hover:bg-blue-500/90">Em andamento</Badge>
            )}
          </div>

          {tarefa.descricao && (
            <p className="text-xs text-muted-foreground mt-1">{tarefa.descricao}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            {tarefa.colaborador_nome && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {tarefa.colaborador_nome}
              </span>
            )}
            {tarefa.area_destino && (
              <Badge variant="outline" className="text-[10px]">{tarefa.area_destino}</Badge>
            )}
            {tarefa.sistema_origem && tarefa.sistema_origem !== "manual" && (
              <Badge variant="outline" className="text-[10px]">
                {tarefa.sistema_origem === "people"
                  ? "People"
                  : tarefa.sistema_origem === "ti"
                  ? "TI"
                  : tarefa.sistema_origem}
              </Badge>
            )}
            <span>
              Prazo: {tarefa.prazo_data ? new Date(tarefa.prazo_data + "T00:00:00").toLocaleDateString("pt-BR") : "Sem prazo"}
            </span>
            {tarefa.created_at && (
              <span>Criada: {new Date(tarefa.created_at).toLocaleDateString("pt-BR")}</span>
            )}
          </div>

          {tarefa.status === "concluida" && tarefa.evidencia_texto && (
            <div className="mt-2 p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Concluída em{" "}
                {tarefa.concluida_em
                  ? new Date(tarefa.concluida_em).toLocaleDateString("pt-BR")
                  : "—"}
              </p>
              <p className="text-xs mt-0.5">{tarefa.evidencia_texto}</p>
              {tarefa.evidencia_url && (
                <a
                  href={tarefa.evidencia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs inline-flex items-center gap-1 mt-1 hover:underline text-emerald-700 dark:text-emerald-400"
                >
                  Ver evidência <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {tarefa.status !== "concluida" && (
              <DropdownMenuItem onClick={() => handleConcluir(tarefa)} className="gap-2">
                <CheckCircle2 className="h-4 w-4" /> Concluir
              </DropdownMenuItem>
            )}
            {tarefa.status === "pendente" && (
              <DropdownMenuItem onClick={() => handleIniciar(tarefa)} className="gap-2">
                <Play className="h-4 w-4" /> Iniciar
              </DropdownMenuItem>
            )}
            {tarefa.tipo_processo === "manual" && tarefa.criado_por === user?.id && (
              <DropdownMenuItem className="gap-2" disabled>
                <Pencil className="h-4 w-4" /> Editar
              </DropdownMenuItem>
            )}
            {tarefa.status !== "concluida" && tarefa.status !== "cancelada" && (
              <DropdownMenuItem
                onClick={() => setCancelarTarefa(tarefa)}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <X className="h-4 w-4" /> Cancelar
              </DropdownMenuItem>
            )}
            {tarefa.colaborador_id && (
              <DropdownMenuItem
                onClick={() =>
                  navigate(
                    tarefa.colaborador_tipo === "clt"
                      ? `/colaboradores/${tarefa.colaborador_id}`
                      : `/contratos-pj/${tarefa.colaborador_id}`,
                  )
                }
                className="gap-2"
              >
                <Eye className="h-4 w-4" /> Ver colaborador
              </DropdownMenuItem>
            )}
            {tarefa.processo_id && tarefa.tipo_processo === "onboarding" && (
              <DropdownMenuItem
                onClick={() => navigate(`/onboarding/${tarefa.processo_id}`)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" /> Ver onboarding
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderTarefasAgrupadas = (lista: Tarefa[]) => {
    if (lista.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
            <p className="text-lg font-semibold">Inbox zero!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Todas as suas tarefas estão em dia.
            </p>
          </CardContent>
        </Card>
      );
    }

    const grupos = agrupar(lista);
    return (
      <div className="space-y-4">
        {grupos.map((g) => (
          <Card key={g.nome}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{g.nome}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {g.tarefas.length} {g.tarefas.length === 1 ? "tarefa" : "tarefas"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">{g.tarefas.map(renderTarefa)}</CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Tarefas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão unificada de todas as suas pendências
          </p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" /> Nova Tarefa
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{kpis.pendentes}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{kpis.atrasadas}</p>
            <p className="text-xs text-muted-foreground">Atrasadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Play className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{kpis.emAndamento}</p>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{kpis.concluidasHoje}</p>
            <p className="text-xs text-muted-foreground">Concluídas hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{kpis.acompanhamento}</p>
            <p className="text-xs text-muted-foreground">Acompanhamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Filtros
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativas">Ativas (pendente + atrasada)</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="atrasada">Atrasadas</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluídas</SelectItem>
                  <SelectItem value="todas">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sistema</Label>
              <Select value={sistemaFilter} onValueChange={setSistemaFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="people">People Fetely</SelectItem>
                  <SelectItem value="ti">TI Fetely</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Agrupar por</Label>
              <Select value={agrupamento} onValueChange={(v) => setAgrupamento(v as AgrupamentoTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prioridade">Prioridade</SelectItem>
                  <SelectItem value="area">Área</SelectItem>
                  <SelectItem value="prazo">Prazo</SelectItem>
                  <SelectItem value="processo">Processo</SelectItem>
                  <SelectItem value="nenhum">Sem agrupamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "minhas" | "acompanhamento")}>
        <TabsList>
          <TabsTrigger value="minhas" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Minha execução
            {kpis.pendentes + kpis.atrasadas > 0 && (
              <Badge variant="secondary" className="ml-1">{kpis.pendentes + kpis.atrasadas}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="acompanhamento" className="gap-2">
            <Eye className="h-4 w-4" /> Acompanhamento
            {kpis.acompanhamento > 0 && (
              <Badge variant="secondary" className="ml-1">{kpis.acompanhamento}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="minhas" className="mt-4">
          {loading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>
          ) : (
            renderTarefasAgrupadas(minhasFiltradas)
          )}
        </TabsContent>
        <TabsContent value="acompanhamento" className="mt-4">
          {loading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>
          ) : (
            renderTarefasAgrupadas(acompanhamentoFiltradas)
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de conclusão */}
      <AlertDialog open={!!concluirTarefa} onOpenChange={(open) => { if (!open) setConcluirTarefa(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir: {concluirTarefa?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>
              {concluirTarefa?.colaborador_nome && `Colaborador: ${concluirTarefa.colaborador_nome}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-sm">O que foi feito? *</Label>
              <Textarea
                value={evidenciaTexto}
                onChange={(e) => setEvidenciaTexto(e.target.value)}
                placeholder="Ex: Acesso criado, documento enviado, equipamento entregue..."
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Link de evidência (opcional)</Label>
              <Input
                value={evidenciaUrl}
                onChange={(e) => setEvidenciaUrl(e.target.value)}
                placeholder="URL de comprovação"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarConclusao}
              disabled={salvando || evidenciaTexto.trim().length < 5}
            >
              {salvando ? "Salvando..." : "Concluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de cancelamento */}
      <AlertDialog open={!!cancelarTarefa} onOpenChange={(open) => { if (!open) setCancelarTarefa(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar "{cancelarTarefa?.titulo}"? Esta ação pode ser revertida posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarCancelamento}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
