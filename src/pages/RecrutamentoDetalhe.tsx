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
  ArrowLeft, ChevronDown, Copy, Globe, MoreHorizontal, Plus, Loader2,
  GripVertical, UserPlus, ArrowRight, XCircle, User, CheckCircle2, ExternalLink
} from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  aberta: { label: "Aberta", className: "bg-success/15 text-success border-success/30" },
  em_selecao: { label: "Em seleção", className: "bg-info/15 text-info border-info/30" },
  encerrada: { label: "Encerrada", className: "bg-muted text-muted-foreground" },
  cancelada: { label: "Cancelada", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const KANBAN_STAGES = [
  { key: "recebido", label: "Recebido" },
  { key: "triagem", label: "Triagem" },
  { key: "entrevista_rh", label: "Entrevista RH" },
  { key: "entrevista_gestor", label: "Entrevista Gestor" },
  { key: "teste_tecnico", label: "Teste Técnico" },
  { key: "oferta", label: "Oferta" },
  { key: "contratado", label: "Contratado" },
  { key: "recusado", label: "Recusado" },
] as const;

export default function RecrutamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isSuperAdmin, isAdminRH } = usePermissions();
  const canSeeFaixa = isSuperAdmin || isAdminRH;

  const [addCandidatoOpen, setAddCandidatoOpen] = useState(false);
  const [newCandidato, setNewCandidato] = useState({ nome: "", email: "", telefone: "", origem: "indicacao" });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedCandidato, setSelectedCandidato] = useState<any | null>(null);
  const [notaTexto, setNotaTexto] = useState("");

  // Contratar flow
  const [contratarOpen, setContratarOpen] = useState(false);
  const [contratarCandidato, setContratarCandidato] = useState<any | null>(null);
  const [contratarForm, setContratarForm] = useState({
    cargo: "", tipo: "clt" as string, salario: "",
    data_inicio: "", lider_direto_id: "", beneficios_ids: [] as string[], jornada: "",
  });
  const [encerrarVagaOpen, setEncerrarVagaOpen] = useState(false);

  const { data: beneficiosParam = [] } = useParametros("beneficio");

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
          moveCandidatoMutation.mutate({ candidatoId: draggingId, newStatus: stageKey });
        }
      }
      setDraggingId(null);
    }
  };

  const advanceCandidato = (candidatoId: string) => {
    const c = candidatos.find((x) => x.id === candidatoId);
    if (!c) return;
    const idx = KANBAN_STAGES.findIndex((s) => s.key === c.status);
    if (idx < 0 || idx >= KANBAN_STAGES.length - 2) return;
    const nextStatus = KANBAN_STAGES[idx + 1].key;
    if (nextStatus === "contratado") {
      openContratarDialog(c);
    } else {
      moveCandidatoMutation.mutate({ candidatoId, newStatus: nextStatus });
    }
  };

  const rejectCandidato = (candidatoId: string) => {
    moveCandidatoMutation.mutate({ candidatoId, newStatus: "recusado" });
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
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/recrutamento")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{vaga.titulo}</h1>
        <Badge className={statusConfig[vaga.status]?.className}>
          {statusConfig[vaga.status]?.label || vaga.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[30%_1fr] gap-6">
        {/* Left column — Vacancy details */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              {/* Action buttons */}
              {vaga.status === "rascunho" && (
                <Button className="w-full" onClick={() => updateStatusMutation.mutate("aberta")}
                  disabled={updateStatusMutation.isPending}>
                  {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Globe className="h-4 w-4 mr-2" /> Publicar Vaga
                </Button>
              )}
              {(vaga.status === "aberta" || vaga.status === "em_selecao") && (
                <Button variant="outline" className="w-full" onClick={() => updateStatusMutation.mutate("encerrada")}
                  disabled={updateStatusMutation.isPending}>
                  Encerrar Vaga
                </Button>
              )}

              <Button variant="outline" size="sm" className="w-full" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-2" /> Copiar link do portal
              </Button>

              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">Área:</strong> {vaga.area}</p>
                <p><strong className="text-foreground">Tipo:</strong> {vaga.tipo_contrato === "clt" ? "CLT" : vaga.tipo_contrato === "pj" ? "PJ" : "CLT/PJ"}</p>
                <p><strong className="text-foreground">Nível:</strong> {vaga.nivel}</p>
                {vaga.local_trabalho && <p><strong className="text-foreground">Local:</strong> {vaga.local_trabalho}</p>}
                {vaga.jornada && <p><strong className="text-foreground">Jornada:</strong> {vaga.jornada}</p>}
                {vaga.vigencia_fim && <p><strong className="text-foreground">Vigência até:</strong> {format(new Date(vaga.vigencia_fim), "dd/MM/yyyy")}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Collapsible sections */}
          {vaga.missao && (
            <CollapsibleSection title="Missão">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vaga.missao}</p>
            </CollapsibleSection>
          )}

          {(vaga.responsabilidades as string[] | null)?.length ? (
            <CollapsibleSection title="Responsabilidades">
              <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                {(vaga.responsabilidades as string[]).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </CollapsibleSection>
          ) : null}

          {((vaga.skills_obrigatorias as string[] | null)?.length || (vaga.skills_desejadas as string[] | null)?.length) ? (
            <CollapsibleSection title="Skills">
              {(vaga.skills_obrigatorias as string[] | null)?.length ? (
                <div className="mb-2">
                  <p className="text-xs font-medium mb-1">Obrigatórias</p>
                  <div className="flex flex-wrap gap-1">
                    {(vaga.skills_obrigatorias as string[]).map((s) => (
                      <Badge key={s} variant="default" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {(vaga.skills_desejadas as string[] | null)?.length ? (
                <div>
                  <p className="text-xs font-medium mb-1">Desejadas</p>
                  <div className="flex flex-wrap gap-1">
                    {(vaga.skills_desejadas as string[]).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CollapsibleSection>
          ) : null}

          {(beneficiosLabels.length > 0 || vaga.beneficios_outros) && (
            <CollapsibleSection title="Benefícios">
              <div className="flex flex-wrap gap-1">
                {beneficiosLabels.map((b) => (
                  <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
                ))}
              </div>
              {vaga.beneficios_outros && (
                <p className="text-sm text-muted-foreground mt-2">{vaga.beneficios_outros}</p>
              )}
            </CollapsibleSection>
          )}

          {canSeeFaixa && (vaga.faixa_min || vaga.faixa_max) && (
            <CollapsibleSection title="Faixa Salarial">
              <p className="text-sm text-muted-foreground">
                {vaga.faixa_min ? `R$ ${Number(vaga.faixa_min).toLocaleString("pt-BR")}` : "—"}
                {" — "}
                {vaga.faixa_max ? `R$ ${Number(vaga.faixa_max).toLocaleString("pt-BR")}` : "—"}
              </p>
            </CollapsibleSection>
          )}
        </div>

        {/* Right column — Kanban */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pipeline de Candidatos</h2>
            <Button size="sm" onClick={() => setAddCandidatoOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Adicionar Candidato
            </Button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4">
            {KANBAN_STAGES.map((stage) => {
              const stageCandidatos = candidatos.filter((c) => c.status === stage.key);
              return (
                <div
                  key={stage.key}
                  className="min-w-[200px] w-[200px] shrink-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(stage.key)}
                >
                  <div className="bg-muted/50 rounded-lg p-2 min-h-[300px]">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {stage.label}
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 min-w-[20px] justify-center">
                        {stageCandidatos.length}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {stageCandidatos.map((c) => (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={() => handleDragStart(c.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition-shadow ${
                            draggingId === c.id ? "opacity-50" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                                {getInitials(c.nome)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{c.nome}</p>
                                <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedCandidato(c); }}>
                                  <User className="h-4 w-4 mr-2" /> Ver perfil
                                </DropdownMenuItem>
                                {c.status === "oferta" && (
                                  <DropdownMenuItem onClick={() => openContratarDialog(c)}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Contratar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => advanceCandidato(c.id)}>
                                  <ArrowRight className="h-4 w-4 mr-2" /> Avançar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => rejectCandidato(c.id)} className="text-destructive">
                                  <XCircle className="h-4 w-4 mr-2" /> Recusar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {c.origem && (
                              <Badge variant="outline" className="text-[10px] h-4">{c.origem}</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {c.created_at ? format(new Date(c.created_at), "dd/MM") : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* Drawer do candidato — inline simples */}
      <Sheet open={!!selectedCandidato} onOpenChange={(open) => { if (!open) setSelectedCandidato(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCandidato && (
            <div className="space-y-6 py-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-semibold shrink-0 text-white" style={{ backgroundColor: "#1A4A3A" }}>
                  {selectedCandidato.nome?.split(" ").map((n: string) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
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

              {/* Abas */}
              <Tabs defaultValue="perfil">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="perfil" className="text-xs">Perfil</TabsTrigger>
                  <TabsTrigger value="avaliacao" className="text-xs">Avaliação</TabsTrigger>
                  <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
                  <TabsTrigger value="notas" className="text-xs">Notas</TabsTrigger>
                </TabsList>

                <TabsContent value="perfil" className="space-y-4 mt-4">
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
                  {!selectedCandidato.linkedin_url && !selectedCandidato.portfolio_url && (
                    <p className="text-sm text-muted-foreground italic">Nenhum link informado pelo candidato.</p>
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
                  <p className="text-sm text-muted-foreground italic">Histórico de movimentações do candidato.</p>
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

              {/* Ações */}
              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1" onClick={() => { advanceCandidato(selectedCandidato.id); setSelectedCandidato(null); }}>
                  <ArrowRight className="h-4 w-4 mr-1" /> Avançar etapa
                </Button>
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => { rejectCandidato(selectedCandidato.id); setSelectedCandidato(null); }}>
                  <XCircle className="h-4 w-4 mr-1" /> Recusar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{title}</CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-3">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
