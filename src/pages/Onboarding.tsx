import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, AlertTriangle, Loader2, ChevronRight, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Checklist = {
  id: string;
  colaborador_id: string | null;
  colaborador_tipo: string;
  convite_id: string | null;
  status: string;
  created_at: string;
  concluido_em: string | null;
  nome?: string;
  cargo?: string;
  departamento?: string;
  tarefas?: Tarefa[];
};

type Tarefa = {
  id: string;
  checklist_id: string;
  titulo: string;
  descricao: string | null;
  responsavel_role: string;
  responsavel_user_id: string | null;
  prazo_dias: number;
  prazo_data: string | null;
  status: string;
  concluida_em: string | null;
  concluida_por: string | null;
};

const statusFilter = [
  { value: "todos", label: "Todos" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "atrasado", label: "Atrasado" },
  { value: "concluido", label: "Concluído" },
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin_rh: "Admin RH",
  gestor_rh: "Gestor RH",
  gestor_direto: "Gestor Direto",
  colaborador: "Colaborador",
  financeiro: "Financeiro",
};

export default function Onboarding() {
  const { user } = useAuth();
  const { userRoles: roles } = usePermissions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [filter, setFilter] = useState("todos");
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const isHR = roles.some((r) => ["super_admin", "admin_rh", "gestor_rh"].includes(r));
  const isGestor = roles.includes("gestor_direto");
  const isColaborador = !isHR && !isGestor;

  useEffect(() => {
    loadChecklists();
  }, []);

  async function loadChecklists() {
    setLoading(true);
    const { data: cls, error } = await supabase
      .from("onboarding_checklists")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar onboardings");
      setLoading(false);
      return;
    }

    // Load tarefas for all checklists
    const ids = (cls || []).map((c: any) => c.id);
    let tarefasMap: Record<string, Tarefa[]> = {};
    if (ids.length > 0) {
      const { data: tarefas } = await supabase
        .from("onboarding_tarefas")
        .select("*")
        .in("checklist_id", ids)
        .order("prazo_dias", { ascending: true });

      (tarefas || []).forEach((t: any) => {
        if (!tarefasMap[t.checklist_id]) tarefasMap[t.checklist_id] = [];
        tarefasMap[t.checklist_id].push(t);
      });
    }

    // Load colaborador/contrato names
    const cltIds = (cls || []).filter((c: any) => c.colaborador_tipo === "clt" && c.colaborador_id).map((c: any) => c.colaborador_id);
    const pjIds = (cls || []).filter((c: any) => c.colaborador_tipo === "pj" && c.colaborador_id).map((c: any) => c.colaborador_id);

    let cltMap: Record<string, any> = {};
    let pjMap: Record<string, any> = {};

    if (cltIds.length > 0) {
      const { data } = await supabase.from("colaboradores_clt").select("id, nome_completo, cargo, departamento").in("id", cltIds);
      (data || []).forEach((c: any) => { cltMap[c.id] = c; });
    }
    if (pjIds.length > 0) {
      const { data } = await supabase.from("contratos_pj").select("id, contato_nome, tipo_servico, departamento").in("id", pjIds);
      (data || []).forEach((c: any) => { pjMap[c.id] = c; });
    }

    const enriched: Checklist[] = (cls || []).map((c: any) => {
      const tarefas = tarefasMap[c.id] || [];
      let nome = "—", cargo = "—", departamento = "—";
      if (c.colaborador_tipo === "clt" && cltMap[c.colaborador_id]) {
        const col = cltMap[c.colaborador_id];
        nome = col.nome_completo; cargo = col.cargo; departamento = col.departamento;
      } else if (c.colaborador_tipo === "pj" && pjMap[c.colaborador_id]) {
        const ct = pjMap[c.colaborador_id];
        nome = ct.contato_nome; cargo = ct.tipo_servico; departamento = ct.departamento;
      }
      return { ...c, nome, cargo, departamento, tarefas };
    });

    setChecklists(enriched);
    setLoading(false);
  }

  function getProgress(cl: Checklist) {
    const t = cl.tarefas || [];
    if (t.length === 0) return 0;
    return Math.round((t.filter((x) => x.status === "concluida").length / t.length) * 100);
  }

  function hasOverdue(cl: Checklist) {
    return (cl.tarefas || []).some((t) => t.status === "atrasada" || (t.status === "pendente" && t.prazo_data && new Date(t.prazo_data) < new Date()));
  }

  const filtered = checklists.filter((cl) => {
    if (filter === "todos") return true;
    if (filter === "concluido") return cl.status === "concluido";
    if (filter === "atrasado") return cl.status === "em_andamento" && hasOverdue(cl);
    return cl.status === "em_andamento" && !hasOverdue(cl);
  });

  async function toggleTarefa(tarefa: Tarefa) {
    if (!user) return;
    setUpdatingTask(tarefa.id);
    const newStatus = tarefa.status === "concluida" ? "pendente" : "concluida";
    const updateData: any = {
      status: newStatus,
      concluida_em: newStatus === "concluida" ? new Date().toISOString() : null,
      concluida_por: newStatus === "concluida" ? user.id : null,
    };
    const { error } = await supabase.from("onboarding_tarefas").update(updateData).eq("id", tarefa.id);
    if (error) {
      toast.error("Erro ao atualizar tarefa");
    } else {
      // Refresh
      if (selectedChecklist) {
        const updated = { ...selectedChecklist };
        updated.tarefas = (updated.tarefas || []).map((t) =>
          t.id === tarefa.id ? { ...t, ...updateData } : t
        );
        // Check if all done
        const allDone = (updated.tarefas || []).every((t) => t.status === "concluida");
        if (allDone && updated.status !== "concluido") {
          await supabase.from("onboarding_checklists").update({ status: "concluido", concluido_em: new Date().toISOString() } as any).eq("id", updated.id);
          updated.status = "concluido";
          updated.concluido_em = new Date().toISOString();

          // Notify HR
          await supabase.from("notificacoes_rh").insert({
            tipo: "onboarding_concluido",
            titulo: `Onboarding concluído: ${updated.nome}`,
            mensagem: `Todas as tarefas de onboarding de ${updated.nome} foram concluídas.`,
            link: "/onboarding",
            user_id: null,
          });
          toast.success("Onboarding concluído!");
        }
        setSelectedChecklist(updated);
      }
      await loadChecklists();
    }
    setUpdatingTask(null);
  }

  function openChecklist(cl: Checklist) {
    setSelectedChecklist(cl);
    setDrawerOpen(true);
  }

  // Colaborador view — show only own tasks
  if (isColaborador) {
    const myChecklists = checklists.filter((cl) => cl.tarefas?.some((t) => t.responsavel_user_id === user?.id));
    const myTarefas = myChecklists.flatMap((cl) =>
      (cl.tarefas || []).filter((t) => t.responsavel_user_id === user?.id).map((t) => ({ ...t, checklistNome: cl.nome }))
    );
    const totalTarefas = myTarefas.length;
    const concluidas = myTarefas.filter((t) => t.status === "concluida").length;
    const progress = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;

    return (
      <div className="p-4 max-w-lg mx-auto space-y-6">
        <h1 className="text-xl font-bold">Meu Onboarding</h1>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : myTarefas.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Nenhuma tarefa de onboarding pendente.</p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{concluidas}/{totalTarefas}</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            <div className="space-y-3">
              {myTarefas.map((t) => (
                <Card key={t.id} className={t.status === "atrasada" ? "border-warning" : ""}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <Checkbox
                      checked={t.status === "concluida"}
                      disabled={updatingTask === t.id}
                      onCheckedChange={() => toggleTarefa(t)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                        {t.titulo}
                      </p>
                      {t.descricao && <p className="text-xs text-muted-foreground mt-1">{t.descricao}</p>}
                      {t.prazo_data && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Prazo: {format(new Date(t.prazo_data), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                    {t.status === "atrasada" && <Badge variant="outline" className="bg-warning/10 text-warning border-0 text-xs">Atrasada</Badge>}
                    {t.status === "concluida" && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // HR / Gestor view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Onboarding</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusFilter.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{checklists.filter((c) => c.status === "em_andamento").length}</p>
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-warning" />
            <div>
              <p className="text-2xl font-bold">{checklists.filter((c) => c.status === "em_andamento" && hasOverdue(c)).length}</p>
              <p className="text-xs text-muted-foreground">Com atraso</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{checklists.filter((c) => c.status === "concluido").length}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum onboarding encontrado.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((cl) => {
            const progress = getProgress(cl);
            const overdue = hasOverdue(cl);
            return (
              <Card
                key={cl.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${overdue ? "border-warning" : ""}`}
                onClick={() => openChecklist(cl)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{cl.nome}</p>
                      <Badge variant="outline" className="text-xs">
                        {cl.colaborador_tipo.toUpperCase()}
                      </Badge>
                      {cl.status === "concluido" && (
                        <Badge variant="outline" className="bg-success/10 text-success border-0 text-xs">Concluído</Badge>
                      )}
                      {overdue && cl.status !== "concluido" && (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-0 text-xs">Atrasado</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{cl.cargo} • {cl.departamento}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{progress}%</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Checklist Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedChecklist && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedChecklist.nome}</SheetTitle>
                <SheetDescription>
                  {selectedChecklist.cargo} • {selectedChecklist.departamento} • {selectedChecklist.colaborador_tipo.toUpperCase()}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{(selectedChecklist.tarefas || []).filter((t) => t.status === "concluida").length}/{(selectedChecklist.tarefas || []).length}</span>
                </div>
                <Progress value={getProgress(selectedChecklist)} className="h-3" />
              </div>
              <div className="mt-6 space-y-3">
                {(selectedChecklist.tarefas || []).map((t) => (
                  <div key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border ${t.status === "atrasada" ? "border-warning bg-warning/5" : "border-border"}`}>
                    <Checkbox
                      checked={t.status === "concluida"}
                      disabled={updatingTask === t.id || (!isHR && t.responsavel_user_id !== user?.id)}
                      onCheckedChange={() => toggleTarefa(t)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                        {t.titulo}
                      </p>
                      {t.descricao && <p className="text-xs text-muted-foreground mt-1">{t.descricao}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{roleLabels[t.responsavel_role] || t.responsavel_role}</Badge>
                        {t.prazo_data && (
                          <span className="text-xs text-muted-foreground">
                            Prazo: {format(new Date(t.prazo_data), "dd/MM/yyyy")}
                          </span>
                        )}
                        {t.status === "concluida" && t.concluida_em && (
                          <span className="text-xs text-success">
                            ✓ {format(new Date(t.concluida_em), "dd/MM HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                    {t.status === "atrasada" && <AlertTriangle className="h-4 w-4 text-warning shrink-0" />}
                    {t.status === "concluida" && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                  </div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
