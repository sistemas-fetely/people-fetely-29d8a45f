import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useParametros } from "@/hooks/useParametros";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Copy, Globe, MoreHorizontal, Plus, Loader2,
  UserPlus, ArrowRight, XCircle, User, CheckCircle2, ExternalLink, Users, Link, Trash2, Check, Mail, AlertTriangle, Pencil, X
} from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  aberta: { label: "Aberta", className: "bg-success/15 text-success border-success/30" },
  em_selecao: { label: "Em seleção", className: "bg-info/15 text-info border-info/30" },
  encerrada: { label: "Encerrada", className: "bg-muted text-muted-foreground" },
  cancelada: { label: "Cancelada", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const KANBAN_STAGES = [
  { key: "recebido",          label: "Recebido",           cor: "#6B7280", bg: "#F3F4F6" },
  { key: "triagem",           label: "Triagem",            cor: "#D97706", bg: "#FFFBEB" },
  { key: "entrevista_rh",     label: "Entrevista RH",      cor: "#2563EB", bg: "#EFF6FF" },
  { key: "entrevista_gestor", label: "Entrevista Gestor",  cor: "#7C3AED", bg: "#F5F3FF" },
  { key: "teste_tecnico",     label: "Teste Técnico",      cor: "#0891B2", bg: "#ECFEFF" },
  { key: "oferta",            label: "Oferta",             cor: "#D97706", bg: "#FFF7ED" },
  { key: "contratado",        label: "Contratado",         cor: "#1A4A3A", bg: "#D8F3DC" },
  { key: "recusado",          label: "Recusado",           cor: "#DC2626", bg: "#FEF2F2" },
] as const;

export default function RecrutamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isSuperAdmin, isAdminRH } = usePermissions();
  const canSeeFaixa = isSuperAdmin || isAdminRH;
  const podeExcluir = isSuperAdmin || isAdminRH;

  const [addCandidatoOpen, setAddCandidatoOpen] = useState(false);
  const [newCandidato, setNewCandidato] = useState({ nome: "", email: "", telefone: "", origem: "indicacao" });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedCandidato, setSelectedCandidato] = useState<any | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [vagaPublicada, setVagaPublicada] = useState(false);

  // Contratar flow
  const [contratarOpen, setContratarOpen] = useState(false);
  const [contratarCandidato, setContratarCandidato] = useState<any | null>(null);
  const [contratarForm, setContratarForm] = useState({
    cargo: "", tipo: "clt" as string, salario: "",
    data_inicio: "", lider_direto_id: "", beneficios_ids: [] as string[], jornada: "",
  });
  const [encerrarVagaOpen, setEncerrarVagaOpen] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [solicitando, setSolicitando] = useState(false);

  const [gatilhoDialog, setGatilhoDialog] = useState(false);
  const [gatilhoCandidato, setGatilhoCandidato] = useState<any>(null);
  const [gatilhoProximoStatus, setGatilhoProximoStatus] = useState("");
  const [gatilhoJustificativa, setGatilhoJustificativa] = useState("");
  const SCORE_MINIMO_ENTREVISTA = 40;

  const [editarVagaOpen, setEditarVagaOpen] = useState(false);
  const [editarForm, setEditarForm] = useState<any>({});

  async function solicitarPerfilCompleto(candidato: any) {
    if (!candidato.email) {
      toast.error("Candidato sem e-mail cadastrado.");
      return;
    }
    setSolicitando(true);
    try {
      const link = `${window.location.origin}/vagas/${id}`;
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "solicitar-perfil-candidato",
          recipientEmail: candidato.email,
          idempotencyKey: `solicitar-perfil-${candidato.id}`,
          templateData: {
            nome: candidato.nome,
            cargo: vaga?.titulo ?? "",
            link_vaga: link,
          },
        },
      });
      if (error) throw error;
      toast.success(`E-mail enviado para ${candidato.email}`);
    } catch (e: any) {
      toast.error("Erro ao enviar e-mail: " + e.message);
    } finally {
      setSolicitando(false);
    }
  }

  const { data: beneficiosParam = [] } = useParametros("beneficio");

  const { data: vaga, isLoading: vagaLoading } = useQuery({
    queryKey: ["vaga", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vagas")
        .select("*, gestor:profiles!vagas_gestor_id_fkey(id, full_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: candidatos = [], isLoading: candidatosLoading } = useQuery({
    queryKey: ["candidatos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .eq("vaga_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch potential leaders for the select
  const { data: lideres = [] } = useQuery({
    queryKey: ["lideres-options"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, user_id, full_name");
      if (!profiles) return [];
      // Get user_ids that have gestor_direto or admin_rh role
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const liderUserIds = new Set(
        (roles || [])
          .filter((r) => r.role === "gestor_direto" || r.role === "admin_rh" || r.role === "super_admin")
          .map((r) => r.user_id)
      );
      return profiles.filter((p) => liderUserIds.has(p.user_id));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("vagas")
        .update({ status: newStatus } as any)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      const label = statusConfig[newStatus]?.label || newStatus;
      toast.success(`Vaga atualizada para "${label}"`);
      queryClient.invalidateQueries({ queryKey: ["vaga", id] });
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const moveCandidatoMutation = useMutation({
    mutationFn: async ({ candidatoId, newStatus }: { candidatoId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("candidatos")
        .update({ status: newStatus } as any)
        .eq("id", candidatoId);
      if (error) throw error;
    },
    onSuccess: (_, { candidatoId, newStatus }) => {
      const c = candidatos.find((x) => x.id === candidatoId);
      const stageLabel = KANBAN_STAGES.find((s) => s.key === newStatus)?.label || newStatus;
      toast.success(`${c?.nome || "Candidato"} movido para ${stageLabel}`);
      queryClient.invalidateQueries({ queryKey: ["candidatos", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addCandidatoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("candidatos").insert({
        vaga_id: id!,
        nome: newCandidato.nome,
        email: newCandidato.email,
        telefone: newCandidato.telefone || null,
        origem: newCandidato.origem,
        status: "recebido",
        consentimento_lgpd: true,
        consentimento_lgpd_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidato adicionado!");
      setAddCandidatoOpen(false);
      setNewCandidato({ nome: "", email: "", telefone: "", origem: "indicacao" });
      queryClient.invalidateQueries({ queryKey: ["candidatos", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const contratarMutation = useMutation({
    mutationFn: async () => {
      if (!contratarCandidato || !vaga) throw new Error("Dados incompletos");

      // 1. Create convite
      const tipoConvite = contratarForm.tipo === "pj" ? "pj" : "clt";
      const { error: conviteError } = await supabase.from("convites_cadastro").insert({
        nome: contratarCandidato.nome,
        email: contratarCandidato.email,
        tipo: tipoConvite,
        cargo: contratarForm.cargo,
        departamento: vaga.area,
        salario_previsto: contratarForm.salario ? Number(contratarForm.salario) : null,
        data_inicio_prevista: contratarForm.data_inicio || null,
        lider_direto_id: contratarForm.lider_direto_id || null,
        criado_por: user?.id || null,
        origem: "recrutamento",
        dados_preenchidos: {
          beneficios_ids: contratarForm.beneficios_ids,
          jornada: contratarForm.jornada,
        },
      } as any);
      if (conviteError) throw conviteError;

      // 2. Update candidato status
      const { error: candError } = await supabase
        .from("candidatos")
        .update({ status: "contratado" } as any)
        .eq("id", contratarCandidato.id);
      if (candError) throw candError;

      // 3. Log history
      await supabase.from("candidato_historico").insert({
        candidato_id: contratarCandidato.id,
        status_anterior: contratarCandidato.status,
        status_novo: "contratado",
        responsavel_id: user?.id || null,
      } as any);
    },
    onSuccess: () => {
      toast.success(`Convite gerado para ${contratarCandidato?.nome}! Acesse Convites de Cadastro para enviar.`);
      setContratarOpen(false);
      queryClient.invalidateQueries({ queryKey: ["candidatos", id] });
      // Ask about closing the vaga
      setEncerrarVagaOpen(true);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openContratarDialog = (candidato: any) => {
    if (!vaga) return;
    setContratarCandidato(candidato);
    setContratarForm({
      cargo: vaga.titulo || "",
      tipo: vaga.tipo_contrato === "ambos" ? "clt" : (vaga.tipo_contrato || "clt"),
      salario: "",
      data_inicio: "",
      lider_direto_id: vaga.gestor_id || "",
      beneficios_ids: (vaga.beneficios_ids as string[] | null) || [],
      jornada: vaga.jornada || "",
    });
    setContratarOpen(true);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/vagas/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  async function publicarVaga() {
    setPublicando(true);
    try {
      const { error } = await supabase
        .from("vagas")
        .update({ status: "aberta", publicado_em: new Date().toISOString() } as any)
        .eq("id", id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["vaga", id] });
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      setVagaPublicada(true);
    } catch (e: any) {
      toast.error("Erro ao publicar vaga: " + e.message);
    } finally {
      setPublicando(false);
    }
  }

  async function excluirVaga() {
    setExcluindo(true);
    try {
      await supabase.from("candidatos").delete().eq("vaga_id", id!);
      const { error } = await supabase.from("vagas").delete().eq("id", id!);
      if (error) throw error;
      toast.success("Vaga excluída com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      navigate("/recrutamento");
    } catch (e: any) {
      toast.error("Erro ao excluir vaga: " + e.message);
    } finally {
      setExcluindo(false);
      setConfirmarExclusao(false);
    }
  }

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const handleDragStart = (candidatoId: string) => setDraggingId(candidatoId);
  const handleDragEnd = () => setDraggingId(null);
  const handleDrop = (stageKey: string) => {
    if (draggingId) {
      const c = candidatos.find((x) => x.id === draggingId);
      if (c && c.status !== stageKey) {
        if (stageKey === "contratado") {
          openContratarDialog(c);
        } else {
          moverCandidatoComHistorico(draggingId, c.status, stageKey, null, (c as any).score_total);
        }
      }
      setDraggingId(null);
    }
  };

  const moverCandidatoComHistorico = async (
    candidatoId: string,
    deStatus: string,
    paraStatus: string,
    justificativa: string | null,
    score: number | null
  ) => {
    moveCandidatoMutation.mutate({ candidatoId, newStatus: paraStatus });
    try {
      await supabase.from("candidato_historico").insert({
        candidato_id: candidatoId,
        status_anterior: deStatus,
        status_novo: paraStatus,
        responsavel_id: user?.id || null,
        justificativa: justificativa || null,
        score_no_momento: score || null,
        vaga_id: id || null,
      } as any);
    } catch (e) {
      console.error("Erro ao registrar histórico:", e);
    }
  };

  const advanceCandidato = (candidatoId: string) => {
    const c = candidatos.find((x) => x.id === candidatoId);
    if (!c) return;
    const idx = KANBAN_STAGES.findIndex((s) => s.key === c.status);
    if (idx < 0 || idx >= KANBAN_STAGES.length - 2) return;
    const nextStatus = KANBAN_STAGES[idx + 1].key;

    // Bloqueio suave: Triagem → Entrevista RH com score < 40%
    if (c.status === "triagem" && nextStatus === "entrevista_rh") {
      const score = (c as any).score_total ?? 0;
      if (score < SCORE_MINIMO_ENTREVISTA) {
        setGatilhoCandidato(c);
        setGatilhoProximoStatus(nextStatus);
        setGatilhoJustificativa("");
        setGatilhoDialog(true);
        return;
      }
    }

    // Alerta: perfil incompleto ao sair de Recebido
    if (c.status === "recebido" && nextStatus === "triagem") {
      const temPerfil = (c as any).experiencias?.length > 0 ||
                        (c as any).skills_candidato?.length > 0;
      if (!temPerfil) {
        toast.warning(
          `${c.nome} não tem perfil completo. Considere solicitar o perfil antes de avançar.`,
          { duration: 5000 }
        );
      }
    }

    if (nextStatus === "contratado") {
      openContratarDialog(c);
    } else {
      moverCandidatoComHistorico(candidatoId, c.status, nextStatus, null, (c as any).score_total);
    }
  };

  const rejectCandidato = (candidatoId: string) => {
    const c = candidatos.find((x) => x.id === candidatoId);
    if (c) {
      moverCandidatoComHistorico(candidatoId, c.status, "recusado", null, (c as any).score_total);
    } else {
      moveCandidatoMutation.mutate({ candidatoId, newStatus: "recusado" });
    }
  };

  const scrollToColuna = (colId: string) => {
    document.getElementById(`col-${colId}`)?.scrollIntoView({
      behavior: "smooth", block: "nearest", inline: "center",
    });
  };

  if (vagaLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-[30%_70%] gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!vaga) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Vaga não encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/recrutamento")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const beneficiosLabels = (vaga.beneficios_ids as string[] | null)?.map(
    (v) => beneficiosParam.find((b) => b.valor === v)?.label || v
  ) || [];

  return (
    <div className="flex flex-col h-full -m-6 overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/recrutamento")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{vaga.titulo}</h1>
            <p className="text-xs text-muted-foreground">
              {vaga.area}
              {vaga.tipo_contrato ? ` · ${vaga.tipo_contrato.toUpperCase()}` : ""}
              {vaga.local_trabalho ? ` · ${vaga.local_trabalho}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(isSuperAdmin || isAdminRH) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditarForm({
                  titulo: vaga.titulo ?? "",
                  area: vaga.area ?? "",
                  nivel: (vaga as any).nivel ?? "",
                  local_trabalho: (vaga as any).local_trabalho ?? "",
                  jornada: (vaga as any).jornada ?? "",
                  salario_min: (vaga as any).salario_min?.toString() ?? "",
                  salario_max: (vaga as any).salario_max?.toString() ?? "",
                  skills_obrigatorias: (vaga as any).skills_obrigatorias ?? [],
                  skills_desejadas: (vaga as any).skills_desejadas ?? [],
                  ferramentas: (vaga as any).ferramentas ?? [],
                  beneficios: (vaga as any).beneficios ?? [],
                  descricao: (vaga as any).descricao ?? "",
                });
                setEditarVagaOpen(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" /> Editar vaga
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setAddCandidatoOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Adicionar Candidato
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Link className="h-4 w-4 mr-2" /> Copiar link
          </Button>
          {vaga.status === "rascunho" && (
            <Button size="sm" onClick={publicarVaga}
              disabled={publicando}>
              {publicando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Globe className="h-4 w-4 mr-2" /> Publicar
            </Button>
          )}
          {(vaga.status === "aberta" || vaga.status === "em_selecao") && (
            <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate("encerrada")}
              disabled={updateStatusMutation.isPending}>
              Encerrar vaga
            </Button>
          )}
          {vaga.status === "encerrada" && (
            <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate("aberta")}
              disabled={updateStatusMutation.isPending}>
              Reabrir vaga
            </Button>
           )}
          {podeExcluir && (
            <Button variant="outline" size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setConfirmarExclusao(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir vaga
            </Button>
          )}
        </div>
      </div>

      {/* KANBAN — full width */}
      <div className="flex-1 overflow-hidden bg-muted/20">
        <div className="flex gap-3 p-4 h-full overflow-x-auto">
          {KANBAN_STAGES.map((stage) => {
            const cards = candidatos.filter((c) => c.status === stage.key);
            return (
              <div
                key={stage.key}
                id={`col-${stage.key}`}
                className="flex flex-col min-w-[200px] flex-1 rounded-xl overflow-hidden"
                style={{ backgroundColor: stage.bg }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.key)}
              >
                {/* Column header */}
                <div className="px-3 py-2.5 flex items-center justify-between"
                  style={{ backgroundColor: stage.cor }}>
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    {stage.label}
                  </span>
                  <span className="bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
                  {cards.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => handleDragStart(c.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white rounded-lg p-3 cursor-pointer shadow-sm border-l-4 hover:shadow-md transition-all group ${
                        draggingId === c.id ? "opacity-50" : ""
                      }`}
                      style={{ borderLeftColor: stage.cor }}
                      onClick={() => setSelectedCandidato(c)}
                    >
                      {/* Avatar + Name */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: stage.cor }}
                        >
                          {getInitials(c.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate leading-tight">{c.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: stage.bg, color: stage.cor }}>
                          {c.origem || "portal"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.created_at ? format(new Date(c.created_at), "dd/MM") : ""}
                        </span>
                      </div>

                      {/* Score badge */}
                      {(c as any).score_total > 0 && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className="text-xs text-muted-foreground">Score</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            (c as any).score_total >= 80
                              ? "bg-green-100 text-green-700"
                              : (c as any).score_total >= 50
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}>
                            {(c as any).score_total}%
                          </span>
                        </div>
                      )}

                      {/* Hover actions */}
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 text-xs flex-1 px-2 hover:bg-gray-100"
                          onClick={(e) => { e.stopPropagation(); advanceCandidato(c.id); }}
                        >
                          Avançar →
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 text-xs text-destructive hover:bg-red-50 px-2"
                          onClick={(e) => { e.stopPropagation(); rejectCandidato(c.id); }}
                        >
                          Recusar
                        </Button>
                      </div>
                    </div>
                  ))}

                  {cards.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-8 h-8 rounded-full mb-2 flex items-center justify-center opacity-20"
                        style={{ backgroundColor: stage.cor }}>
                        <Plus className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-xs text-muted-foreground opacity-50">Nenhum candidato</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILS — always visible */}
      <div className="border-t flex-shrink-0">
        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Col 1 — Info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Informações</p>
            {[
              { label: "Tipo", value: vaga.tipo_contrato === "clt" ? "CLT" : vaga.tipo_contrato === "pj" ? "PJ" : "CLT/PJ" },
              { label: "Nível", value: vaga.nivel },
              { label: "Local", value: vaga.local_trabalho },
              { label: "Jornada", value: vaga.jornada },
              { label: "Gestor", value: (vaga as any).gestor?.full_name ?? "—" },
              { label: "Vigência", value: vaga.vigencia_fim ? new Date(vaga.vigencia_fim).toLocaleDateString("pt-BR") : "—" },
            ].map(item => item.value ? (
              <div key={item.label} className="flex justify-between gap-2">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-medium text-right">{item.value}</span>
              </div>
            ) : null)}
            {vaga.missao && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Missão</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{vaga.missao}</p>
              </div>
            )}
          </div>

          {/* Col 2 — Salary & Benefits */}
          <div className="space-y-3">
            {canSeeFaixa && (vaga.faixa_min || vaga.faixa_max) && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Remuneração</p>
                <p className="text-sm font-semibold text-[#1A4A3A]">
                  {vaga.faixa_min ? `R$ ${Number(vaga.faixa_min).toLocaleString("pt-BR")}` : "—"}
                  {" – "}
                  {vaga.faixa_max ? `R$ ${Number(vaga.faixa_max).toLocaleString("pt-BR")}` : "—"}
                </p>
              </>
            )}
            {(beneficiosLabels.length > 0 || vaga.beneficios_outros) && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Benefícios</p>
                <div className="flex flex-wrap gap-1">
                  {beneficiosLabels.map((b) => (
                    <Badge key={b} variant="outline" className="text-xs">{b}</Badge>
                  ))}
                </div>
                {vaga.beneficios_outros && (
                  <p className="text-xs text-muted-foreground mt-1">{vaga.beneficios_outros}</p>
                )}
              </div>
            )}
            {(vaga.responsabilidades as string[] | null)?.length ? (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Responsabilidades</p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  {(vaga.responsabilidades as string[]).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Col 3 — Skills */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Skills</p>
            {(vaga.skills_obrigatorias as string[] | null)?.length ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Obrigatórias</p>
                <div className="flex flex-wrap gap-1">
                  {(vaga.skills_obrigatorias as string[]).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-[#1A4A3A] text-white">{s}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {(vaga.skills_desejadas as string[] | null)?.length ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Desejadas</p>
                <div className="flex flex-wrap gap-1">
                  {(vaga.skills_desejadas as string[]).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">{s}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {(vaga.ferramentas as string[] | null)?.length ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ferramentas</p>
                <div className="flex flex-wrap gap-1">
                  {(vaga.ferramentas as string[]).map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Add candidato dialog */}
      <Dialog open={addCandidatoOpen} onOpenChange={setAddCandidatoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Candidato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={newCandidato.nome} onChange={(e) => setNewCandidato({ ...newCandidato, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" value={newCandidato.email} onChange={(e) => setNewCandidato({ ...newCandidato, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={newCandidato.telefone} onChange={(e) => setNewCandidato({ ...newCandidato, telefone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <Input value={newCandidato.origem} onChange={(e) => setNewCandidato({ ...newCandidato, origem: e.target.value })} placeholder="indicacao" />
            </div>
            <Button className="w-full" disabled={!newCandidato.nome.trim() || !newCandidato.email.trim() || addCandidatoMutation.isPending}
              onClick={() => addCandidatoMutation.mutate()}>
              {addCandidatoMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contratar dialog */}
      <Dialog open={contratarOpen} onOpenChange={setContratarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Contratar {contratarCandidato?.nome}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Preencha os dados para gerar o convite de cadastro automaticamente.
          </p>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Cargo</Label>
              <Input value={contratarForm.cargo}
                onChange={(e) => setContratarForm({ ...contratarForm, cargo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Tipo de contrato</Label>
              <Select value={contratarForm.tipo}
                onValueChange={(v) => setContratarForm({ ...contratarForm, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canSeeFaixa && (
              <div className="space-y-1">
                <Label>{contratarForm.tipo === "pj" ? "Honorários acordado (R$)" : "Salário acordado (R$)"}</Label>
                <Input type="number" value={contratarForm.salario}
                  onChange={(e) => setContratarForm({ ...contratarForm, salario: e.target.value })}
                  placeholder="0,00" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Data de início</Label>
              <Input type="date" value={contratarForm.data_inicio}
                onChange={(e) => setContratarForm({ ...contratarForm, data_inicio: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Líder direto</Label>
              <Select value={contratarForm.lider_direto_id}
                onValueChange={(v) => setContratarForm({ ...contratarForm, lider_direto_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {lideres.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.full_name || l.user_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Benefícios</Label>
              <div className="flex flex-wrap gap-1.5">
                {beneficiosParam.map((b) => {
                  const selected = contratarForm.beneficios_ids.includes(b.valor);
                  return (
                    <Badge
                      key={b.valor}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        setContratarForm({
                          ...contratarForm,
                          beneficios_ids: selected
                            ? contratarForm.beneficios_ids.filter((x) => x !== b.valor)
                            : [...contratarForm.beneficios_ids, b.valor],
                        });
                      }}
                    >
                      {b.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Jornada</Label>
              <Input value={contratarForm.jornada}
                onChange={(e) => setContratarForm({ ...contratarForm, jornada: e.target.value })}
                placeholder="Ex: Segunda a sexta, 9h-18h" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContratarOpen(false)}>Cancelar</Button>
            <Button onClick={() => contratarMutation.mutate()}
              disabled={!contratarForm.cargo.trim() || contratarMutation.isPending}>
              {contratarMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Gerar convite de cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Encerrar vaga alert */}
      <AlertDialog open={encerrarVagaOpen} onOpenChange={setEncerrarVagaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja encerrar esta vaga?</AlertDialogTitle>
            <AlertDialogDescription>
              O candidato foi contratado. Deseja encerrar a vaga "{vaga.titulo}" agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setEncerrarVagaOpen(false);
              navigate("/convites-cadastro");
            }}>
              Não, manter aberta
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              updateStatusMutation.mutate("encerrada");
              setEncerrarVagaOpen(false);
              navigate("/convites-cadastro");
            }}>
              Sim, encerrar vaga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir vaga dialog */}
      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vaga</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a vaga "{vaga.titulo}"?
              Esta ação não pode ser desfeita e todos os candidatos vinculados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={excluindo}
              onClick={(e) => { e.preventDefault(); excluirVaga(); }}
            >
              {excluindo ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!selectedCandidato} onOpenChange={(open) => { if (!open) setSelectedCandidato(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCandidato && (
            <div className="space-y-6 py-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-semibold shrink-0 bg-primary text-primary-foreground">
                  {getInitials(selectedCandidato.nome)}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-lg font-semibold leading-tight">{selectedCandidato.nome}</p>
                  <p className="text-sm text-muted-foreground">{selectedCandidato.email}</p>
                  {selectedCandidato.telefone && (
                    <p className="text-sm text-muted-foreground">{selectedCandidato.telefone}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-xs capitalize">{selectedCandidato.status}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{selectedCandidato.origem || "portal"}</Badge>
                  </div>
                  {selectedCandidato.created_at && (
                    <p className="text-xs text-muted-foreground">
                      Candidatura em {new Date(selectedCandidato.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </div>

              <Tabs defaultValue="perfil">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="perfil" className="text-xs">Perfil</TabsTrigger>
                  <TabsTrigger value="avaliacao" className="text-xs">Avaliação</TabsTrigger>
                  <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
                  <TabsTrigger value="notas" className="text-xs">Notas</TabsTrigger>
                </TabsList>

                <TabsContent value="perfil" className="space-y-4 mt-4">
                  {/* Score se existir */}
                  {(selectedCandidato as any).score_total > 0 && (
                    <div className="p-3 rounded-lg border space-y-2"
                      style={{ backgroundColor:
                        (selectedCandidato as any).score_total >= 80 ? '#F0FFF4' :
                        (selectedCandidato as any).score_total >= 50 ? '#FFFBEB' : '#FEF2F2'
                      }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Score de aderência</p>
                        <span className="text-lg font-bold" style={{ color:
                          (selectedCandidato as any).score_total >= 80 ? '#1A4A3A' :
                          (selectedCandidato as any).score_total >= 50 ? '#D97706' : '#DC2626'
                        }}>
                          {(selectedCandidato as any).score_total}%
                        </span>
                      </div>
                      {(selectedCandidato as any).score_detalhado?.resumo && (
                        <p className="text-xs text-muted-foreground">
                          {(selectedCandidato as any).score_detalhado.resumo}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Links */}
                  {selectedCandidato.linkedin_url && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">LinkedIn</p>
                      <a href={selectedCandidato.linkedin_url.startsWith("http") ? selectedCandidato.linkedin_url : `https://${selectedCandidato.linkedin_url}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-sm text-primary flex items-center gap-1 hover:underline">
                        {selectedCandidato.linkedin_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {selectedCandidato.portfolio_url && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Portfólio</p>
                      <a href={selectedCandidato.portfolio_url.startsWith("http") ? selectedCandidato.portfolio_url : `https://${selectedCandidato.portfolio_url}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-sm text-primary flex items-center gap-1 hover:underline">
                        {selectedCandidato.portfolio_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {/* Experiências */}
                  {(selectedCandidato as any).experiencias?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Experiências</p>
                      {(selectedCandidato as any).experiencias.map((exp: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-0.5">
                          <p className="text-sm font-medium">{exp.cargo}</p>
                          <p className="text-xs text-muted-foreground">{exp.empresa}</p>
                          <p className="text-xs text-muted-foreground">
                            {exp.periodo_inicio} – {exp.atual ? 'atual' : exp.periodo_fim}
                          </p>
                          {exp.descricao && (
                            <p className="text-xs text-muted-foreground mt-1">{exp.descricao}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formações */}
                  {(selectedCandidato as any).formacoes?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formação</p>
                      {(selectedCandidato as any).formacoes.map((form: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-0.5">
                          <p className="text-sm font-medium">{form.curso}</p>
                          <p className="text-xs text-muted-foreground">{form.instituicao}</p>
                          <p className="text-xs text-muted-foreground capitalize">{form.nivel} · {form.status}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skills */}
                  {(selectedCandidato as any).skills_candidato?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills declaradas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedCandidato as any).skills_candidato.map((s: any, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                            {s.skill}
                            {s.nivel && s.nivel !== 'intermediario' && (
                              <span className="ml-1 opacity-70">· {s.nivel}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sistemas */}
                  {(selectedCandidato as any).sistemas_candidato?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sistemas e ferramentas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedCandidato as any).sistemas_candidato.map((s: any, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {s.sistema}
                            {s.nivel && s.nivel !== 'intermediario' && (
                              <span className="ml-1 opacity-70">· {s.nivel}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Motivação */}
                  {selectedCandidato.mensagem && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por que a Fetely</p>
                      <p className="text-sm text-muted-foreground italic">"{selectedCandidato.mensagem}"</p>
                    </div>
                  )}

                  {/* Perfil incompleto — botão solicitar */}
                  {!(selectedCandidato as any).experiencias?.length && (
                    <div className="p-4 rounded-lg border border-dashed text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Este candidato não preencheu o perfil completo.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={solicitando}
                        onClick={() => solicitarPerfilCompleto(selectedCandidato)}
                      >
                        {solicitando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                        Solicitar perfil por e-mail
                      </Button>
                    </div>
                  )}

                  {/* LGPD */}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Consentimento LGPD: {selectedCandidato.consentimento_lgpd_at
                      ? new Date(selectedCandidato.consentimento_lgpd_at).toLocaleDateString("pt-BR")
                      : "não registrado"}
                  </div>
                </TabsContent>

                <TabsContent value="avaliacao" className="mt-4">
                  <p className="text-sm text-muted-foreground italic">Avaliações disponíveis no scorecard do candidato.</p>
                </TabsContent>

                <TabsContent value="historico" className="mt-4">
                  <HistoricoCandidato candidatoId={selectedCandidato?.id} />
                </TabsContent>

                <TabsContent value="notas" className="space-y-3 mt-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={notaTexto}
                      onChange={(e) => setNotaTexto(e.target.value)}
                      placeholder="Adicionar nota interna..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button size="sm" className="self-end" disabled={!notaTexto.trim()}>
                      Salvar
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1" onClick={() => { advanceCandidato(selectedCandidato.id); setSelectedCandidato(null); }}>
                  <ArrowRight className="h-4 w-4 mr-1" /> Avançar etapa
                </Button>
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => { rejectCandidato(selectedCandidato.id); setSelectedCandidato(null); }}>
                  <XCircle className="h-4 w-4 mr-1" /> Recusar
                </Button>
                {selectedCandidato.status === "oferta" && (
                  <Button variant="default" onClick={() => { openContratarDialog(selectedCandidato); setSelectedCandidato(null); }}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Contratar
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de vaga publicada */}
      <Dialog open={vagaPublicada} onOpenChange={setVagaPublicada}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
              Vaga publicada!
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A vaga <strong>{vaga?.titulo}</strong> está aberta e o portal
            de candidatura já está no ar. Compartilhe o link abaixo.
          </p>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground truncate flex-1 font-mono">
              {window.location.origin}/vagas/{id}
            </p>
            <Button size="sm" variant="outline" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/vagas/${id}`);
              toast.success("Link copiado!");
            }}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Compartilhe este link no LinkedIn, WhatsApp ou onde preferir.
            Os candidatos podem se inscrever sem precisar de login.
          </p>
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/vagas/${id}`);
              toast.success("Link copiado!");
              setVagaPublicada(false);
            }}>
              <Copy className="h-4 w-4 mr-2" /> Copiar e fechar
            </Button>
            <Button variant="outline" onClick={() => setVagaPublicada(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de gatilho — score abaixo do mínimo */}
      <Dialog open={gatilhoDialog} onOpenChange={(open) => {
        if (!open) {
          setGatilhoDialog(false);
          setGatilhoCandidato(null);
          setGatilhoJustificativa("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Score abaixo do mínimo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>{gatilhoCandidato?.nome}</strong> tem score de{" "}
                <strong>{(gatilhoCandidato as any)?.score_total ?? 0}%</strong>{" "}
                (mínimo recomendado: {SCORE_MINIMO_ENTREVISTA}%).
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Por que está avançando para Entrevista RH? *
              </Label>
              <Textarea
                value={gatilhoJustificativa}
                onChange={e => setGatilhoJustificativa(e.target.value)}
                placeholder="Ex: Candidato tem experiência específica relevante que não foi capturada pelo score automático..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Esta justificativa ficará registrada no histórico do candidato.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setGatilhoDialog(false);
                setGatilhoCandidato(null);
                setGatilhoJustificativa("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!gatilhoJustificativa.trim()}
              onClick={() => {
                moverCandidatoComHistorico(
                  gatilhoCandidato.id,
                  gatilhoCandidato.status,
                  gatilhoProximoStatus,
                  gatilhoJustificativa,
                  (gatilhoCandidato as any)?.score_total
                );
                setGatilhoDialog(false);
                setGatilhoCandidato(null);
                setGatilhoJustificativa("");
              }}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Avançar com justificativa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoricoCandidato({ candidatoId }: { candidatoId?: string }) {
  const { data: historico = [] } = useQuery({
    queryKey: ["candidato-historico", candidatoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidato_historico")
        .select("*")
        .eq("candidato_id", candidatoId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!candidatoId,
  });

  const stageLabel = (key: string) =>
    KANBAN_STAGES.find(s => s.key === key)?.label ?? key;

  if (!candidatoId || historico.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nenhuma movimentação registrada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {historico.map((h: any) => (
        <div key={h.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <div className="w-px flex-1 bg-border mt-1" />
          </div>
          <div className="pb-3 flex-1 min-w-0">
            <p className="text-sm">
              <span className="text-muted-foreground">
                {stageLabel(h.status_anterior ?? "")}
              </span>
              {" → "}
              <span className="font-medium">{stageLabel(h.status_novo)}</span>
            </p>
            {h.justificativa && (
              <div className="mt-1.5 p-2 rounded-md bg-amber-50 border border-amber-100">
                <p className="text-xs text-amber-800">
                  <span className="font-medium">Exceção: </span>
                  {h.justificativa}
                </p>
                {h.score_no_momento != null && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Score no momento: {h.score_no_momento}%
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(h.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
