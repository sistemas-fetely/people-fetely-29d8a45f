import { useState, useRef, useEffect } from "react";
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
  UserPlus, ArrowRight, XCircle, User, CheckCircle2, ExternalLink, Users, Link, Trash2, Check, Mail, AlertTriangle, Pencil, X, Sparkles, ClipboardList
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
  const [editandoEmail, setEditandoEmail] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [salvandoEmail, setSalvandoEmail] = useState(false);

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
          idempotencyKey: `solicitar-perfil-${candidato.id}-${Date.now()}`,
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

  async function salvarEmailCandidato(candidatoId: string, email: string) {
    if (!email || !email.includes("@")) {
      toast.error("E-mail inválido.");
      return;
    }
    setSalvandoEmail(true);
    try {
      const { error } = await supabase
        .from("candidatos")
        .update({ email } as any)
        .eq("id", candidatoId);
      if (error) throw error;
      setSelectedCandidato((c: any) => ({ ...c, email }));
      queryClient.invalidateQueries({ queryKey: ["candidatos", id] });
      setEditandoEmail(false);
      toast.success("E-mail atualizado!");
    } catch (e: any) {
      toast.error("Erro ao atualizar e-mail: " + e.message);
    } finally {
      setSalvandoEmail(false);
    }
  }

  const { data: beneficiosParam = [] } = useParametros("beneficio");

  const { data: entrevistasRH = [] } = useQuery({
    queryKey: ["entrevista-rh", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("entrevistas_candidato")
        .select("candidato_id, recomendacao")
        .eq("vaga_id", id!)
        .eq("tipo", "rh");
      return (data ?? []) as any[];
    },
    enabled: !!id,
  });

  // Buscar entrevistas do gestor em lote
  const { data: entrevistasGestor = [] } = useQuery({
    queryKey: ["entrevista-gestor", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("entrevistas_candidato")
        .select("candidato_id, recomendacao")
        .eq("vaga_id", id!)
        .eq("tipo", "gestor");
      return (data ?? []) as any[];
    },
    enabled: !!id,
  });

  // Buscar testes técnicos em lote
  const { data: testesTecnicos = [] } = useQuery({
    queryKey: ["testes-tecnicos-vaga", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("testes_tecnicos" as any)
        .select("candidato_id, enviado_em, entregue_em, resultado, prazo_entrega")
        .eq("vaga_id", id!);
      return (data ?? []) as any[];
    },
    enabled: !!id,
  });

  const { data: vaga, isLoading: vagaLoading } = useQuery({
    queryKey: ["vaga", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: gestorNome } = useQuery({
    queryKey: ["gestor-nome", (vaga as any)?.gestor_id],
    queryFn: async () => {
      const gestorId = (vaga as any)?.gestor_id;
      if (!gestorId) return null;
      const { data: clt } = await supabase
        .from("colaboradores_clt")
        .select("nome_completo")
        .eq("id", gestorId)
        .maybeSingle();
      if (clt?.nome_completo) return clt.nome_completo;
      const { data: pj } = await supabase
        .from("contratos_pj")
        .select("contato_nome")
        .eq("id", gestorId)
        .maybeSingle();
      if (pj?.contato_nome) return pj.contato_nome;
      return null;
    },
    enabled: !!(vaga as any)?.gestor_id,
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

  // Fetch potential leaders from active colaboradores CLT + PJ
  const { data: lideres = [] } = useQuery({
    queryKey: ["gestores-para-vaga"],
    queryFn: async () => {
      const { data: clt } = await supabase
        .from("colaboradores_clt")
        .select("id, nome_completo, cargo, departamento")
        .eq("status", "ativo")
        .order("nome_completo");
      const { data: pj } = await supabase
        .from("contratos_pj")
        .select("id, contato_nome, tipo_servico, departamento")
        .eq("status", "ativo")
        .order("contato_nome");
      const todos = [
        ...(clt ?? []).map(c => ({ id: c.id, nome: c.nome_completo, cargo: c.cargo, tipo: "CLT" })),
        ...(pj ?? []).map(c => ({ id: c.id, nome: c.contato_nome, cargo: c.tipo_servico, tipo: "PJ" })),
      ];
      return todos.sort((a, b) => a.nome.localeCompare(b.nome));
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

  const editarVagaMutation = useMutation({
    mutationFn: async (dados: any) => {
      const { data: vagaAtual, error: checkError } = await supabase
        .from("vagas")
        .select("id")
        .eq("id", id!)
        .single();

      if (checkError || !vagaAtual) {
        throw new Error("Vaga não encontrada. Atualize a página.");
      }

      const updateData: any = {};
      if (dados.titulo) updateData.titulo = dados.titulo;
      if (dados.area !== undefined) updateData.area = dados.area;
      if (dados.nivel !== undefined) updateData.nivel = dados.nivel;
      if (dados.local_trabalho !== undefined) updateData.local_trabalho = dados.local_trabalho;
      if (dados.jornada !== undefined) updateData.jornada = dados.jornada;
      if (dados.salario_min !== undefined) updateData.faixa_min = dados.salario_min ? Number(dados.salario_min) : null;
      if (dados.salario_max !== undefined) updateData.faixa_max = dados.salario_max ? Number(dados.salario_max) : null;
      if (dados.skills_obrigatorias !== undefined) updateData.skills_obrigatorias = dados.skills_obrigatorias;
      if (dados.skills_desejadas !== undefined) updateData.skills_desejadas = dados.skills_desejadas;
      if (dados.ferramentas !== undefined) updateData.ferramentas = dados.ferramentas;
      if (dados.descricao !== undefined) updateData.missao = dados.descricao;
      if (dados.gestor_id !== undefined) updateData.gestor_id = dados.gestor_id || null;

      const { error } = await supabase
        .from("vagas")
        .update(updateData)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vaga atualizada!");
      queryClient.invalidateQueries({ queryKey: ["vaga", id] });
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      setEditarVagaOpen(false);
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
      console.error("Erro editarVaga:", err);
    },
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

  function getStatusCard(c: any) {
    switch (c.status) {
      case "recebido": {
        const temPerfil = (c as any).experiencias?.length > 0 || (c as any).skills_candidato?.length > 0;
        if (!temPerfil) return { label: "Perfil incompleto", cor: "#D97706" };
        return null;
      }
      case "triagem": {
        const score = (c as any).score_total ?? 0;
        if (score < 40) return { label: `Score ${score}%`, cor: "#DC2626" };
        return { label: `Score ${score}%`, cor: score >= 80 ? "#1A4A3A" : "#D97706" };
      }
      case "entrevista_rh": {
        const temEntrevistaRH = entrevistasRH.some((e: any) => e.candidato_id === c.id);
        if (!temEntrevistaRH) return { label: "Preencher formulário", cor: "#DC2626" };
        const recRH = entrevistasRH.find((e: any) => e.candidato_id === c.id)?.recomendacao;
        if (recRH === "nao_avançar") return { label: "Não avançar", cor: "#DC2626" };
        if (recRH === "aguardar") return { label: "Aguardar", cor: "#D97706" };
        return { label: "Formulário ok", cor: "#1A4A3A" };
      }
      case "entrevista_gestor": {
        const temEntrevistaG = entrevistasGestor.some((e: any) => e.candidato_id === c.id);
        if (!temEntrevistaG) return { label: "Preencher formulário", cor: "#DC2626" };
        const recG = entrevistasGestor.find((e: any) => e.candidato_id === c.id)?.recomendacao;
        if (recG === "nao_avançar") return { label: "Não avançar", cor: "#DC2626" };
        if (recG === "aguardar") return { label: "Aguardar", cor: "#D97706" };
        return { label: "Formulário ok", cor: "#1A4A3A" };
      }
      case "teste_tecnico": {
        const testeCand = testesTecnicos.find((t: any) => t.candidato_id === c.id);
        if (!testeCand?.enviado_em) return { label: "Enviar teste", cor: "#DC2626" };
        const prazoVencidoCard = testeCand.prazo_entrega &&
          new Date(testeCand.prazo_entrega + "T23:59:59") < new Date();
        if (!testeCand.entregue_em) {
          if (prazoVencidoCard) return { label: "Prazo vencido", cor: "#DC2626" };
          return { label: "Aguardando entrega", cor: "#D97706" };
        }
        if (testeCand.entregue_em && (!testeCand.resultado || testeCand.resultado === "pendente"))
          return { label: "Avaliar entrega", cor: "#2563EB" };
        if (testeCand.resultado === "reprovado") return { label: "Reprovado", cor: "#DC2626" };
        return { label: "Aprovado", cor: "#1A4A3A" };
      }
      case "oferta":
        return { label: "Em negociação", cor: "#D97706" };
      default:
        return null;
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
          // Verificar bloqueios de entrevista no drag
          if (c.status === "entrevista_rh" && stageKey === "entrevista_gestor") {
            const temEntrevista = entrevistasRH.some((e: any) => e.candidato_id === c.id);
            if (!temEntrevista) {
              toast.error("Preencha o formulário de Entrevista RH antes de avançar.");
              setDraggingId(null);
              return;
            }
          }
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

  const advanceCandidato = async (candidatoId: string) => {
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

    // Bloqueio: Entrevista RH → Entrevista Gestor sem formulário RH
    if (c.status === "entrevista_rh" && nextStatus === "entrevista_gestor") {
      const { data: entrevistaRH } = await supabase
        .from("entrevistas_candidato")
        .select("id, recomendacao")
        .eq("candidato_id", candidatoId)
        .eq("vaga_id", id!)
        .eq("tipo", "rh")
        .maybeSingle();
      if (!entrevistaRH) {
        toast.error("Preencha o formulário de Entrevista RH antes de avançar.", { duration: 5000 });
        setSelectedCandidato(c);
        return;
      }
      if ((entrevistaRH as any).recomendacao === "nao_avançar") {
        toast.warning("O formulário de RH indica 'Não avançar'. Tem certeza?", { duration: 5000 });
      }
    }

    // Bloqueio: Entrevista Gestor → próxima etapa sem formulário Gestor
    if (c.status === "entrevista_gestor" && ["teste_tecnico", "oferta"].includes(nextStatus)) {
      const { data: entrevistaGestor } = await supabase
        .from("entrevistas_candidato")
        .select("id, recomendacao")
        .eq("candidato_id", candidatoId)
        .eq("vaga_id", id!)
        .eq("tipo", "gestor")
        .maybeSingle();
      if (!entrevistaGestor) {
        toast.error("Preencha o formulário de Entrevista Gestor antes de avançar.", { duration: 5000 });
        setSelectedCandidato(c);
        return;
      }
      if ((entrevistaGestor as any).recomendacao === "nao_avançar") {
        toast.warning("O formulário do Gestor indica 'Não avançar'. Tem certeza?", { duration: 5000 });
      }
    }

    // Bloqueio: Teste Técnico → Oferta sem resultado registrado
    if (c.status === "teste_tecnico" && nextStatus === "oferta") {
      const { data: teste } = await supabase
        .from("testes_tecnicos" as any)
        .select("resultado")
        .eq("candidato_id", candidatoId)
        .eq("vaga_id", id!)
        .maybeSingle();

      if (!teste || !(teste as any).resultado) {
        toast.error(
          "Registre o resultado do Teste Técnico antes de avançar.",
          { duration: 5000 }
        );
        setSelectedCandidato(c);
        return;
      }

      if ((teste as any).resultado === "reprovado") {
        toast.warning(
          "O resultado do Teste Técnico é Reprovado. Tem certeza que quer avançar?",
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
                  gestor_id: (vaga as any).gestor_id ?? "",
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

                      {/* Status / próxima ação */}
                      {(() => {
                        const statusCard = getStatusCard(c);
                        if (!statusCard) return null;
                        return (
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                            <span className="text-xs text-muted-foreground">Status</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: statusCard.cor + "18",
                                color: statusCard.cor,
                              }}>
                              {statusCard.label}
                            </span>
                          </div>
                        );
                      })()}

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
              { label: "Gestor", value: gestorNome ?? "—" },
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
                  {lideres.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome} {l.cargo ? `— ${l.cargo}` : ""}
                      <span className="text-xs text-muted-foreground ml-1">({l.tipo})</span>
                    </SelectItem>
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

      <Sheet open={!!selectedCandidato} onOpenChange={(open) => { if (!open) { setSelectedCandidato(null); setEditandoEmail(false); setNovoEmail(""); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCandidato && (
            <div className="space-y-6 py-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-semibold shrink-0 bg-primary text-primary-foreground">
                  {getInitials(selectedCandidato.nome)}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-lg font-semibold leading-tight">{selectedCandidato.nome}</p>
                  {editandoEmail ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={novoEmail}
                        onChange={e => setNovoEmail(e.target.value)}
                        className="h-7 text-xs px-2 w-48"
                        placeholder="novo@email.com"
                        onKeyDown={e => {
                          if (e.key === "Enter") salvarEmailCandidato(selectedCandidato.id, novoEmail);
                          if (e.key === "Escape") setEditandoEmail(false);
                        }}
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => salvarEmailCandidato(selectedCandidato.id, novoEmail)}>
                        {salvandoEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setEditandoEmail(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <p className="text-sm text-muted-foreground">{selectedCandidato.email}</p>
                      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { setNovoEmail(selectedCandidato.email); setEditandoEmail(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
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
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="perfil" className="text-xs">Perfil</TabsTrigger>
                  <TabsTrigger value="entrevistas" className="text-xs">Entrevistas</TabsTrigger>
                  <TabsTrigger value="teste" className="text-xs">Teste</TabsTrigger>
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

                <TabsContent value="entrevistas" className="space-y-6 mt-4">
                  {["entrevista_rh", "entrevista_gestor", "teste_tecnico", "oferta", "contratado"]
                    .includes(selectedCandidato.status) ? (
                    <>
                      <FormularioEntrevista
                        candidatoId={selectedCandidato.id}
                        vagaId={id!}
                        tipo="rh"
                        candidato={selectedCandidato}
                        vaga={vaga}
                        readOnly={
                          selectedCandidato.status !== "entrevista_rh" &&
                          !["entrevista_gestor", "teste_tecnico", "oferta", "contratado"]
                            .includes(selectedCandidato.status)
                        }
                      />
                      {["entrevista_gestor", "teste_tecnico", "oferta", "contratado"]
                        .includes(selectedCandidato.status) && (
                        <div className="border-t pt-4">
                          <FormularioEntrevista
                            candidatoId={selectedCandidato.id}
                            vagaId={id!}
                            tipo="gestor"
                            candidato={selectedCandidato}
                            vaga={vaga}
                            readOnly={selectedCandidato.status !== "entrevista_gestor"}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                      Formulários disponíveis a partir da etapa Entrevista RH.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="teste" className="mt-4">
                  <TesteTecnico
                    candidatoId={selectedCandidato.id}
                    vagaId={id!}
                    candidato={selectedCandidato}
                    vaga={vaga}
                  />
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

      {/* Dialog editar vaga */}
      <Dialog open={editarVagaOpen} onOpenChange={setEditarVagaOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Editar vaga
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título da vaga</Label>
              <Input value={editarForm.titulo ?? ""}
                onChange={e => setEditarForm((f: any) => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Área</Label>
                <Input value={editarForm.area ?? ""}
                  onChange={e => setEditarForm((f: any) => ({ ...f, area: e.target.value }))} />
              </div>
              <div>
                <Label>Nível</Label>
                <Select value={editarForm.nivel ?? ""}
                  onValueChange={v => setEditarForm((f: any) => ({ ...f, nivel: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jr">Júnior</SelectItem>
                    <SelectItem value="pl">Pleno</SelectItem>
                    <SelectItem value="sr">Sênior</SelectItem>
                    <SelectItem value="coordenacao">Coordenação</SelectItem>
                    <SelectItem value="especialista">Especialista</SelectItem>
                    <SelectItem value="c_level">C-Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Local de trabalho</Label>
                <Input value={editarForm.local_trabalho ?? ""}
                  onChange={e => setEditarForm((f: any) => ({ ...f, local_trabalho: e.target.value }))} />
              </div>
              <div>
                <Label>Jornada</Label>
                <Input value={editarForm.jornada ?? ""}
                  onChange={e => setEditarForm((f: any) => ({ ...f, jornada: e.target.value }))} />
              </div>
            </div>
            {/* Gestor responsável */}
            <div>
              <Label>Gestor responsável</Label>
              <Select
                value={editarForm.gestor_id || "__none__"}
                onValueChange={v => setEditarForm((f: any) => ({ ...f, gestor_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem gestor —</SelectItem>
                  {lideres.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome} {l.cargo ? `— ${l.cargo}` : ""}
                      <span className="text-xs text-muted-foreground ml-1">({l.tipo})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Salário mínimo</Label>
                <Input type="number" value={editarForm.salario_min ?? ""} placeholder="R$ 0"
                  onChange={e => setEditarForm((f: any) => ({ ...f, salario_min: e.target.value }))} />
              </div>
              <div>
                <Label>Salário máximo</Label>
                <Input type="number" value={editarForm.salario_max ?? ""} placeholder="R$ 0"
                  onChange={e => setEditarForm((f: any) => ({ ...f, salario_max: e.target.value }))} />
              </div>
            </div>

            {/* Skills obrigatórias */}
            <div>
              <Label>Skills obrigatórias</Label>
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] p-2 border rounded-lg bg-muted/20">
                {(editarForm.skills_obrigatorias ?? []).map((s: string, i: number) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary text-primary-foreground">
                    {s}
                    <button type="button" onClick={() =>
                      setEditarForm((f: any) => ({
                        ...f, skills_obrigatorias: f.skills_obrigatorias.filter((_: string, idx: number) => idx !== i)
                      }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <Input placeholder="Digite e pressione Enter para adicionar"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      setEditarForm((f: any) => ({ ...f, skills_obrigatorias: [...(f.skills_obrigatorias ?? []), val] }));
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }} />
            </div>

            {/* Skills desejadas */}
            <div>
              <Label>Skills desejadas</Label>
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] p-2 border rounded-lg bg-muted/20">
                {(editarForm.skills_desejadas ?? []).map((s: string, i: number) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-info/20 text-info">
                    {s}
                    <button type="button" onClick={() =>
                      setEditarForm((f: any) => ({
                        ...f, skills_desejadas: f.skills_desejadas.filter((_: string, idx: number) => idx !== i)
                      }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <Input placeholder="Digite e pressione Enter para adicionar"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      setEditarForm((f: any) => ({ ...f, skills_desejadas: [...(f.skills_desejadas ?? []), val] }));
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }} />
            </div>

            {/* Ferramentas */}
            <div>
              <Label>Ferramentas e sistemas</Label>
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] p-2 border rounded-lg bg-muted/20">
                {(editarForm.ferramentas ?? []).map((s: string, i: number) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent text-accent-foreground">
                    {s}
                    <button type="button" onClick={() =>
                      setEditarForm((f: any) => ({
                        ...f, ferramentas: f.ferramentas.filter((_: string, idx: number) => idx !== i)
                      }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <Input placeholder="Digite e pressione Enter para adicionar"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      setEditarForm((f: any) => ({ ...f, ferramentas: [...(f.ferramentas ?? []), val] }));
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }} />
            </div>

            {/* Descrição */}
            <div>
              <Label>Descrição / Missão da vaga</Label>
              <Textarea rows={3} value={editarForm.descricao ?? ""}
                placeholder="Descreva o contexto e o propósito desta vaga..."
                onChange={e => setEditarForm((f: any) => ({ ...f, descricao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarVagaOpen(false)}>Cancelar</Button>
            <Button
              disabled={!editarForm.titulo || editarVagaMutation.isPending}
              onClick={() => editarVagaMutation.mutate(editarForm)}
            >
              {editarVagaMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
              ) : "Salvar alterações"}
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

function FormularioEntrevista({
  candidatoId,
  vagaId,
  tipo,
  readOnly = false,
  candidato,
  vaga,
}: {
  candidatoId: string;
  vagaId: string;
  tipo: "rh" | "gestor";
  readOnly?: boolean;
  candidato?: any;
  vaga?: any;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    impressao_geral: 0,
    fit_cultural: 0,
    pontos_fortes: "",
    pontos_atencao: "",
    recomendacao: "",
    observacoes: "",
  });

  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [resumoIA, setResumoIA] = useState<{
    resumo: string;
    pontos_fortes: string[];
    pontos_atencao: string[];
    recomendacao_ia: string;
    score_fit: number;
  } | null>(null);

  const { data: entrevista, isLoading } = useQuery({
    queryKey: ["entrevista", candidatoId, tipo],
    queryFn: async () => {
      const { data } = await supabase
        .from("entrevistas_candidato")
        .select("*")
        .eq("candidato_id", candidatoId)
        .eq("vaga_id", vagaId)
        .eq("tipo", tipo)
        .maybeSingle();
      return data;
    },
    enabled: !!candidatoId && !!vagaId,
  });

  useEffect(() => {
    if (entrevista) {
      setForm({
        impressao_geral: (entrevista as any).impressao_geral ?? 0,
        fit_cultural: (entrevista as any).fit_cultural ?? 0,
        pontos_fortes: (entrevista as any).pontos_fortes ?? "",
        pontos_atencao: (entrevista as any).pontos_atencao ?? "",
        recomendacao: (entrevista as any).recomendacao ?? "",
        observacoes: (entrevista as any).observacoes ?? "",
      });
    }
  }, [entrevista]);

  async function salvar() {
    if (!form.impressao_geral || !form.fit_cultural || !form.recomendacao) {
      toast.error("Preencha impressão geral, fit cultural e recomendação.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("entrevistas_candidato")
        .upsert({
          candidato_id: candidatoId,
          vaga_id: vagaId,
          tipo,
          impressao_geral: form.impressao_geral,
          fit_cultural: form.fit_cultural,
          pontos_fortes: form.pontos_fortes || null,
          pontos_atencao: form.pontos_atencao || null,
          recomendacao: form.recomendacao,
          observacoes: form.observacoes || null,
          preenchido_por: user?.id || null,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: "candidato_id,vaga_id,tipo",
        });
      if (error) throw error;
      toast.success("Formulário salvo!");
      queryClient.invalidateQueries({ queryKey: ["entrevista", candidatoId, tipo] });
      queryClient.invalidateQueries({ queryKey: ["entrevista-rh", vagaId] });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function gerarResumoIA() {
    if (!candidato) return;
    setGerandoResumo(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-candidato", {
        body: {
          candidato: {
            nome: candidato.nome,
            experiencias: candidato.experiencias ?? [],
            formacoes: candidato.formacoes ?? [],
            skills_candidato: candidato.skills_candidato ?? [],
            sistemas_candidato: candidato.sistemas_candidato ?? [],
            score_total: candidato.score_total ?? 0,
            mensagem: candidato.mensagem ?? "",
          },
          vaga: {
            titulo: vaga?.titulo ?? "",
            skills_obrigatorias: vaga?.skills_obrigatorias ?? [],
            skills_desejadas: vaga?.skills_desejadas ?? [],
          },
          tipo,
        },
      });
      if (error) throw error;

      setResumoIA(data);
      // Pre-fill empty fields with AI analysis (still editable)
      setForm(f => ({
        ...f,
        pontos_fortes: f.pontos_fortes || data.pontos_fortes?.join("\n") || "",
        pontos_atencao: f.pontos_atencao || data.pontos_atencao?.join("\n") || "",
        recomendacao: f.recomendacao || data.recomendacao_ia || "",
      }));
    } catch (e: any) {
      console.error("Erro ao gerar resumo:", e);
      toast.error("Não foi possível gerar o resumo. Preencha manualmente.");
    } finally {
      setGerandoResumo(false);
    }
  }

  // Auto-generate AI summary when form opens for the first time without saved data
  useEffect(() => {
    if (!entrevista && candidato && !gerandoResumo && !resumoIA && !readOnly && !isLoading) {
      gerarResumoIA();
    }
  }, [entrevista, candidato, isLoading]);

  const titulo = tipo === "rh" ? "Entrevista RH" : "Entrevista Gestor";
  const corTema = tipo === "rh" ? "#2563EB" : "#7C3AED";

  const StarRating = ({ value, onChange, disabled }: { value: number; onChange?: (v: number) => void; disabled?: boolean }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange?.(n)}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            n <= value
              ? "text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          style={n <= value ? { backgroundColor: corTema } : undefined}
        >
          {n}
        </button>
      ))}
    </div>
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: corTema }} />
        <p className="text-sm font-semibold">{titulo}</p>
        {entrevista && (
          <span className="text-xs text-muted-foreground ml-auto">
            Preenchido em {new Date((entrevista as any).updated_at).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      {/* Resumo da IA */}
      {(gerandoResumo || resumoIA) && (
        <div className="rounded-lg border p-3 space-y-2"
          style={{ borderColor: corTema + "40", backgroundColor: corTema + "08" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold flex items-center gap-1.5"
              style={{ color: corTema }}>
              <Sparkles className="h-3.5 w-3.5" />
              Pré-análise por IA
            </p>
            {!gerandoResumo && (
              <button
                type="button"
                onClick={gerarResumoIA}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Atualizar
              </button>
            )}
          </div>
          {gerandoResumo ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Analisando perfil do candidato...
              </p>
            </div>
          ) : resumoIA && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Fit com a vaga</p>
                <span className="text-sm font-semibold" style={{ color:
                  resumoIA.score_fit >= 70 ? "#1A4A3A" :
                  resumoIA.score_fit >= 40 ? "#D97706" : "#DC2626"
                }}>
                  {resumoIA.score_fit}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {resumoIA.resumo}
              </p>
              {resumoIA.pontos_fortes?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: "#1A4A3A" }}>
                    Pontos fortes identificados
                  </p>
                  <ul className="space-y-0.5">
                    {resumoIA.pontos_fortes.map((p: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span style={{ color: "#1A4A3A" }}>·</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {resumoIA.pontos_atencao?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1 text-amber-600">
                    Pontos de atenção
                  </p>
                  <ul className="space-y-0.5">
                    {resumoIA.pontos_atencao.map((p: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-amber-500">·</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1 border-t"
                style={{ borderColor: corTema + "30" }}>
                <p className="text-xs text-muted-foreground">Sugestão da IA:</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  resumoIA.recomendacao_ia === "avançar"
                    ? "bg-[#D8F3DC] text-[#1A4A3A]"
                    : resumoIA.recomendacao_ia === "aguardar"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                }`}>
                  {resumoIA.recomendacao_ia === "avançar" ? "✓ Avançar" :
                   resumoIA.recomendacao_ia === "aguardar" ? "⏳ Aguardar" : "✗ Não avançar"}
                </span>
                <p className="text-xs text-muted-foreground ml-auto italic">
                  Você decide
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Impressão geral *</Label>
        <StarRating
          value={form.impressao_geral}
          onChange={v => !readOnly && setForm(f => ({ ...f, impressao_geral: v }))}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Fit cultural *</Label>
        <StarRating
          value={form.fit_cultural}
          onChange={v => !readOnly && setForm(f => ({ ...f, fit_cultural: v }))}
          disabled={readOnly}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Pontos fortes observados</Label>
        <Textarea
          value={form.pontos_fortes}
          rows={2}
          className="resize-none text-sm"
          placeholder="O que chamou atenção positivamente..."
          disabled={readOnly}
          onChange={e => setForm(f => ({ ...f, pontos_fortes: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Pontos de atenção</Label>
        <Textarea
          value={form.pontos_atencao}
          rows={2}
          className="resize-none text-sm"
          placeholder="Dúvidas ou preocupações levantadas..."
          disabled={readOnly}
          onChange={e => setForm(f => ({ ...f, pontos_atencao: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Recomendação *</Label>
        <div className="flex gap-2">
          {[
            { value: "avançar", label: "✅ Avançar", cor: "#1A4A3A" },
            { value: "aguardar", label: "⏳ Aguardar", cor: "#D97706" },
            { value: "nao_avançar", label: "❌ Não avançar", cor: "#DC2626" },
          ].map(op => (
            <button
              key={op.value}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && setForm(f => ({ ...f, recomendacao: op.value }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                form.recomendacao === op.value
                  ? "text-white border-transparent"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
              style={form.recomendacao === op.value ? { backgroundColor: op.cor } : undefined}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Observações livres</Label>
        <Textarea
          value={form.observacoes}
          rows={3}
          className="resize-none text-sm"
          placeholder="Anotações adicionais para o processo..."
          disabled={readOnly}
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
        />
      </div>

      {!readOnly && (
        <Button
          className="w-full text-white"
          style={{ backgroundColor: corTema }}
          disabled={salvando || !form.impressao_geral || !form.fit_cultural || !form.recomendacao}
          onClick={salvar}
        >
          {salvando ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
          ) : entrevista ? "Atualizar formulário" : "Salvar formulário"}
        </Button>
      )}
    </div>
  );
}

function TesteTecnico({
  candidatoId,
  vagaId,
  candidato,
  vaga,
}: {
  candidatoId: string;
  vagaId: string;
  candidato: any;
  vaga: any;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fase, setFase] = useState<"desafio" | "resultado">("desafio");

  const [formDesafio, setFormDesafio] = useState({
    desafio_contexto: "",
    desafio_descricao: "",
    desafio_entregaveis: "",
    desafio_criterios: "",
    prazo_entrega: "",
  });

  const [formResultado, setFormResultado] = useState({
    link_entrega: "",
    nota: 0,
    pontos_avaliados: "",
    resultado: "",
  });

  const { data: teste, isLoading } = useQuery({
    queryKey: ["teste-tecnico", candidatoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("testes_tecnicos" as any)
        .select("*")
        .eq("candidato_id", candidatoId)
        .eq("vaga_id", vagaId)
        .maybeSingle();
      return data;
    },
    enabled: !!candidatoId && !!vagaId,
  });

  useEffect(() => {
    if (teste) {
      setFormDesafio({
        desafio_contexto: (teste as any).desafio_contexto ?? "",
        desafio_descricao: (teste as any).desafio_descricao ?? "",
        desafio_entregaveis: (teste as any).desafio_entregaveis ?? "",
        desafio_criterios: (teste as any).desafio_criterios ?? "",
        prazo_entrega: (teste as any).prazo_entrega ?? "",
      });
      setFormResultado({
        link_entrega: (teste as any).link_entrega ?? "",
        nota: (teste as any).nota ?? 0,
        pontos_avaliados: (teste as any).pontos_avaliados ?? "",
        resultado: (teste as any).resultado ?? "",
      });
      if ((teste as any).enviado_em) setFase("resultado");
    }
  }, [teste]);

  async function gerarDesafioIA() {
    setGerando(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-candidato", {
        body: {
          candidato: {
            nome: candidato?.nome ?? "",
            experiencias: (candidato as any)?.experiencias ?? [],
            skills_candidato: (candidato as any)?.skills_candidato ?? [],
            sistemas_candidato: (candidato as any)?.sistemas_candidato ?? [],
          },
          vaga: {
            titulo: vaga?.titulo ?? "",
            nivel: (vaga as any)?.nivel ?? "",
            area: (vaga as any)?.area ?? "",
            skills_obrigatorias: (vaga as any)?.skills_obrigatorias ?? [],
            skills_desejadas: (vaga as any)?.skills_desejadas ?? [],
            responsabilidades: (vaga as any)?.responsabilidades ?? [],
          },
          tipo: "teste_tecnico",
        },
      });

      if (error) throw error;

      if (data?.contexto) {
        setFormDesafio(f => ({
          ...f,
          desafio_contexto: data.contexto || "",
          desafio_descricao: data.descricao || "",
          desafio_entregaveis: data.entregaveis || "",
          desafio_criterios: data.criterios || "",
        }));
        toast.success("Desafio gerado! Revise antes de enviar ao candidato.");
      } else {
        toast.error("Resposta inesperada da IA. Preencha manualmente.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar desafio. Preencha manualmente.");
    } finally {
      setGerando(false);
    }
  }

  async function salvarDesafio() {
    if (!formDesafio.desafio_descricao || !formDesafio.prazo_entrega) {
      toast.error("Preencha a descrição do desafio e o prazo.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("testes_tecnicos" as any)
        .upsert({
          candidato_id: candidatoId,
          vaga_id: vagaId,
          ...formDesafio,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "candidato_id,vaga_id" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["teste-tecnico", candidatoId] });
      toast.success("Desafio salvo!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function enviarDesafio() {
    if (!candidato?.email) {
      toast.error("Candidato sem e-mail cadastrado.");
      return;
    }
    if (!formDesafio.desafio_descricao || !formDesafio.prazo_entrega) {
      toast.error("Salve o desafio antes de enviar.");
      return;
    }
    setEnviando(true);
    try {
      await supabase.from("testes_tecnicos" as any).upsert({
        candidato_id: candidatoId,
        vaga_id: vagaId,
        ...formDesafio,
        enviado_em: new Date().toISOString(),
        enviado_por: user?.id || null,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "candidato_id,vaga_id" });

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "teste-tecnico-candidato",
          recipientEmail: candidato.email,
          idempotencyKey: `teste-tecnico-${candidatoId}`,
          templateData: {
            nome: candidato.nome,
            cargo: vaga?.titulo ?? "",
            contexto: formDesafio.desafio_contexto,
            descricao: formDesafio.desafio_descricao,
            entregaveis: formDesafio.desafio_entregaveis,
            criterios: formDesafio.desafio_criterios,
            prazo: (() => { if (!formDesafio.prazo_entrega) return ""; const parts = formDesafio.prazo_entrega.split("-"); if (parts.length !== 3) return formDesafio.prazo_entrega; const [ano, mes, dia] = parts; return `${dia}/${mes}/${ano}`; })(),
            link_portal: `${window.location.origin}/vagas/${vagaId}`,
          },
        },
      });

      queryClient.invalidateQueries({ queryKey: ["teste-tecnico", candidatoId] });
      setFase("resultado");
      toast.success(`Desafio enviado para ${candidato.email}!`);
    } catch (e: any) {
      toast.error("Erro ao enviar: " + e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function reenviarDesafio() {
    if (!candidato?.email) {
      toast.error("Candidato sem e-mail cadastrado.");
      return;
    }
    if (!teste) {
      toast.error("Dados do teste não carregados. Tente novamente.");
      return;
    }
    setEnviando(true);
    try {
      const prazoFormatado = (teste as any).prazo_entrega
        ? (() => {
            const [ano, mes, dia] = ((teste as any).prazo_entrega as string).split("-");
            return `${dia}/${mes}/${ano}`;
          })()
        : "";

      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "teste-tecnico-candidato",
          recipientEmail: candidato.email,
          idempotencyKey: `teste-tecnico-reenvio-${candidatoId}-${Date.now()}`,
          templateData: {
            nome: candidato.nome,
            cargo: vaga?.titulo ?? "",
            contexto: (teste as any).desafio_contexto ?? "",
            descricao: (teste as any).desafio_descricao ?? "",
            entregaveis: (teste as any).desafio_entregaveis ?? "",
            criterios: (teste as any).desafio_criterios ?? "",
            prazo: prazoFormatado,
            link_portal: `${window.location.origin}/vagas/${vagaId}`,
          },
        },
      });
      if (error) throw error;
      toast.success(`Teste reenviado para ${candidato.email}!`);
    } catch (e: any) {
      toast.error("Erro ao reenviar: " + e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function salvarResultado() {
    if (!formResultado.resultado) {
      toast.error("Selecione o resultado antes de salvar.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("testes_tecnicos" as any)
        .update({
          ...formResultado,
          avaliado_em: new Date().toISOString(),
          avaliado_por: user?.id || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("candidato_id", candidatoId)
        .eq("vaga_id", vagaId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["teste-tecnico", candidatoId] });
      queryClient.invalidateQueries({ queryKey: ["testes-tecnicos-vaga", vagaId] });
      toast.success("Resultado registrado!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  if (isLoading) return <div className="flex items-center gap-2 py-4"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm text-muted-foreground">Carregando...</span></div>;

  const corTema = "#0891B2";
  const jaEnviado = !!(teste as any)?.enviado_em;

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors border"
          style={n <= value ? { backgroundColor: corTema, color: "white", borderColor: corTema } : { borderColor: "#E5E7EB", color: "#6B7280" }}
        >
          {n}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" style={{ color: corTema }} />
          <p className="text-sm font-semibold">Teste Técnico</p>
        </div>
        {jaEnviado && (
          <Badge variant="outline" className="text-xs">
            Enviado em {new Date((teste as any).enviado_em).toLocaleDateString("pt-BR")}
          </Badge>
        )}
      </div>

      {/* Toggle Desafio / Resultado */}
      {jaEnviado && (
        <div className="flex gap-2">
          {(["desafio", "resultado"] as const).map(f => (
            <button key={f} type="button" onClick={() => setFase(f)}
              className="px-3 py-1 rounded-full text-xs border transition-colors capitalize"
              style={fase === f
                ? { backgroundColor: corTema, color: "white", borderColor: corTema }
                : { borderColor: "#E5E7EB", color: "#6B7280" }}>
              {f === "desafio" ? "Desafio enviado" : "Registrar resultado"}
            </button>
          ))}
        </div>
      )}

      {/* Botão reenviar — disponível quando já foi enviado */}
      {jaEnviado && fase === "desafio" && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
          <div>
            <p className="text-xs font-medium">Desafio enviado</p>
            <p className="text-xs text-muted-foreground">
              {new Date((teste as any).enviado_em).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={enviando}
            onClick={reenviarDesafio}
          >
            {enviando
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Reenviando...</>
              : <>↩ Reenviar</>}
          </Button>
        </div>
      )}

      {/* FASE: DESAFIO */}
      {fase === "desafio" && (
        <div className="space-y-3">
          {!jaEnviado && (
            <Button variant="outline" size="sm" disabled={gerando} onClick={gerarDesafioIA}
              className="w-full">
              {gerando ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />Gerando desafio com IA...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" />Gerar desafio com IA</>
              )}
            </Button>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Contexto *</Label>
            <Textarea value={formDesafio.desafio_contexto} rows={2} className="resize-none text-sm"
              placeholder="Cenário/problema que o candidato vai resolver..."
              disabled={jaEnviado}
              onChange={e => setFormDesafio(f => ({ ...f, desafio_contexto: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Desafio *</Label>
            <Textarea value={formDesafio.desafio_descricao} rows={3} className="resize-none text-sm"
              placeholder="O que o candidato deve fazer..."
              disabled={jaEnviado}
              onChange={e => setFormDesafio(f => ({ ...f, desafio_descricao: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Entregáveis</Label>
            <Textarea value={formDesafio.desafio_entregaveis} rows={2} className="resize-none text-sm"
              placeholder="O que deve ser entregue e em qual formato..."
              disabled={jaEnviado}
              onChange={e => setFormDesafio(f => ({ ...f, desafio_entregaveis: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Critérios de avaliação</Label>
            <Textarea value={formDesafio.desafio_criterios} rows={2} className="resize-none text-sm"
              placeholder="Como o trabalho será avaliado..."
              disabled={jaEnviado}
              onChange={e => setFormDesafio(f => ({ ...f, desafio_criterios: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Prazo de entrega *</Label>
            <Input type="date" value={formDesafio.prazo_entrega} disabled={jaEnviado}
              min={new Date().toISOString().split("T")[0]}
              onChange={e => setFormDesafio(f => ({ ...f, prazo_entrega: e.target.value }))} />
          </div>

          {!jaEnviado && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={salvando} onClick={salvarDesafio}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Salvar rascunho
              </Button>
              <Button size="sm" disabled={enviando || !formDesafio.desafio_descricao || !formDesafio.prazo_entrega}
                style={{ backgroundColor: corTema }} className="text-white"
                onClick={enviarDesafio}>
                {enviando
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Enviando...</>
                  : <><Mail className="h-4 w-4 mr-1" />Enviar para {candidato?.nome?.split(" ")[0]}</>}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* FASE: RESULTADO */}
      {fase === "resultado" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Link da entrega</Label>
            <Input value={formResultado.link_entrega} placeholder="Drive, Notion, GitHub, etc."
              onChange={e => setFormResultado(f => ({ ...f, link_entrega: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nota geral</Label>
            <StarRating value={formResultado.nota}
              onChange={v => setFormResultado(f => ({ ...f, nota: v }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Pontos avaliados</Label>
            <Textarea value={formResultado.pontos_avaliados} rows={3} className="resize-none text-sm"
              placeholder="O que se destacou na entrega? O que ficou abaixo do esperado?"
              onChange={e => setFormResultado(f => ({ ...f, pontos_avaliados: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Resultado *</Label>
            <div className="flex gap-2">
              {[
                { value: "aprovado", label: "✅ Aprovado", cor: "#1A4A3A" },
                { value: "pendente", label: "⏳ Pendente", cor: "#D97706" },
                { value: "reprovado", label: "❌ Reprovado", cor: "#DC2626" },
              ].map(op => (
                <button key={op.value} type="button"
                  onClick={() => setFormResultado(f => ({ ...f, resultado: op.value }))}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  style={formResultado.resultado === op.value
                    ? { backgroundColor: op.cor, color: "white", borderColor: op.cor }
                    : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full text-white" style={{ backgroundColor: corTema }}
            disabled={salvando || !formResultado.resultado}
            onClick={salvarResultado}>
            {salvando
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
              : teste && (teste as any).avaliado_em
                ? "Atualizar resultado"
                : "Registrar resultado"}
          </Button>
        </div>
      )}
    </div>
  );
}
