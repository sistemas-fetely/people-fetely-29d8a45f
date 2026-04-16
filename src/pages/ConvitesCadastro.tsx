import { useState, useEffect, useMemo } from "react";
import { publicUrl } from "@/lib/urls";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Loader2, Copy, Trash2, MoreHorizontal, Send, Clock, CheckCircle2,
  XCircle, Search, RefreshCw, ExternalLink, Eye, Mail, MailX, Lock, CalendarIcon,
  ArrowRightLeft, AlertTriangle, FileSearch, Undo2, UserCheck, X, UserPlus,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, addDays, differenceInDays, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParametros } from "@/hooks/useParametros";
import { useCargos } from "@/hooks/useCargos";
import { useCLevelCargos } from "@/hooks/useCLevelCargos";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ─── Status config ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: typeof Send }> = {
  pendente: { label: "Pendente", badge: "bg-amber-100 text-amber-700 border-0", icon: Clock },
  email_enviado: { label: "Enviado", badge: "bg-sky-100 text-sky-700 border-0", icon: Send },
  atrasado: { label: "Atrasado", badge: "bg-yellow-100 text-yellow-700 border-0", icon: AlertTriangle },
  preenchido: { label: "Preenchido", badge: "bg-emerald-100 text-emerald-700 border-0", icon: CheckCircle2 },
  devolvido: { label: "Devolvido", badge: "bg-orange-100 text-orange-700 border-0", icon: Undo2 },
  aprovado: { label: "Aprovado", badge: "bg-blue-100 text-blue-700 border-0", icon: CheckCircle2 },
  cadastrado: { label: "Cadastrado", badge: "bg-muted text-muted-foreground border-0", icon: UserCheck },
  cancelado: { label: "Cancelado", badge: "bg-muted text-muted-foreground border-0", icon: XCircle },
};

// ─── Funnel phases ───────────────────────────────────────────────────
const FUNNEL_PHASES = [
  { key: "email_enviado", label: "Enviados", emoji: "📤", color: "#5C9A80", bg: "#F0F7F4" },
  { key: "preenchido", label: "Preenchidos", emoji: "📝", color: "#4A8A6E", bg: "#E5F0EA" },
  { key: "devolvido", label: "Devolvidos", emoji: "↩️", color: "#D97706", bg: "#FFF7ED" },
  { key: "aprovado", label: "Aprovados", emoji: "👍", color: "#316A50", bg: "#CEE2D5" },
  { key: "cadastrado", label: "Cadastrados", emoji: "✅", color: "#1A4A3A", bg: "#A8C9B5" },
] as const;

interface Convite {
  id: string;
  token: string;
  tipo: string;
  nome: string;
  email: string;
  cargo: string | null;
  departamento: string | null;
  status: string;
  expira_em: string;
  preenchido_em: string | null;
  created_at: string;
  dados_preenchidos: any;
  lider_direto_id: string | null;
  grupo_acesso_id: string | null;
  salario_previsto: number | null;
  data_inicio_prevista: string | null;
  observacoes_colaborador: string | null;
  prazo_dias: number;
  colaborador_id: string | null;
  contrato_pj_id: string | null;
  lembretes_ativos: boolean;
}

interface LiderOption {
  profile_id: string;
  user_id: string;
  nome: string;
  cargo: string;
  tipo: "clt" | "pj";
}


const initialForm = {
  nome: "",
  email: "",
  tipo: "clt",
  cargo: "",
  departamento: "",
  grupo_acesso_id: "",
  lider_direto_id: "",
  salario_previsto: "",
  data_inicio_prevista: undefined as Date | undefined,
  observacoes_colaborador: "",
};

// ─── Helper: compute display status ─────────────────────────────────
function getDisplayStatus(c: Convite): string {
  if (c.status === "cancelado") return "cancelado";
  if (c.status === "cadastrado") return "cadastrado";
  if (c.status === "aprovado") return "aprovado";
  if (c.status === "devolvido") return "devolvido";
  if (c.status === "preenchido") return "preenchido";
  if (c.status === "email_enviado" || c.status === "pendente") return "email_enviado";
  return c.status;
}

// ─── Helper: row bg class based on status ────────────────────────────
function getRowClass(displayStatus: string): string {
  if (displayStatus === "atrasado") return "bg-yellow-50/50 dark:bg-yellow-950/10";
  return "";
}

export default function ConvitesCadastro() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasAnyRole, roles } = useAuth();
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Convite | null>(null);
  const [search, setSearch] = useState("");
  const [funnelFilter, setFunnelFilter] = useState<string | null>(null);
  const [filtroAtrasados, setFiltroAtrasados] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [liderSearch, setLiderSearch] = useState("");

  // Prefill from Recrutamento
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (prefill) {
      setForm({
        nome: prefill.nome || "",
        email: prefill.email || "",
        tipo: prefill.tipo || "clt",
        cargo: prefill.cargo || "",
        departamento: prefill.departamento || "",
        grupo_acesso_id: "",
        lider_direto_id: prefill.lider_direto_id || "",
        salario_previsto: prefill.salario_previsto || "",
        data_inicio_prevista: prefill.data_inicio_prevista ? new Date(prefill.data_inicio_prevista) : undefined,
        
        observacoes_colaborador: "",
      });
      setFormOpen(true);
      // Limpar o state para não reabrir ao navegar de volta
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Review drawer state
  const [reviewTarget, setReviewTarget] = useState<Convite | null>(null);
  const [returnComment, setReturnComment] = useState("");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: departamentos } = useParametros("departamento");
  const { data: cargosRaw } = useCargos();
  const cargos = (cargosRaw || []).map((c) => ({ id: c.id, valor: c.nome, label: c.nome, is_clevel: c.is_clevel }));
  const { isCargoClevel } = useCLevelCargos();
  const { canSeeSalary, isSuperAdmin } = usePermissions();

  const canSeeSensitive = hasAnyRole(["super_admin", "admin_rh"]);
  const isGestorDireto = !hasAnyRole(["super_admin", "admin_rh", "gestor_rh"]) && hasAnyRole(["gestor_direto"]);

  // Fetch grupos de acesso
  const [gruposAcesso, setGruposAcesso] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("grupos_acesso").select("*").eq("ativo", true).order("nome").then(({ data }) => {
      setGruposAcesso((data || []) as any[]);
    });
  }, []);

  // Fetch líderes
  const [lideres, setLideres] = useState<LiderOption[]>([]);
  useEffect(() => {
    const fetchLideres = async () => {
      const [cltRes, pjRes] = await Promise.all([
        supabase.from("colaboradores_clt").select("user_id, nome_completo, cargo").eq("status", "ativo").not("user_id", "is", null),
        supabase.from("contratos_pj").select("user_id, contato_nome, tipo_servico").eq("status", "ativo").not("user_id", "is", null),
      ]);
      const options: LiderOption[] = [];
      const userIds = [
        ...(cltRes.data || []).map(c => c.user_id),
        ...(pjRes.data || []).map(c => c.user_id),
      ].filter(Boolean);
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, user_id").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p.id]));
        
        for (const c of cltRes.data || []) {
          const pid = profileMap.get(c.user_id!);
          if (pid) options.push({ profile_id: pid, user_id: c.user_id as string, nome: c.nome_completo, cargo: c.cargo, tipo: "clt" });
        }
        for (const c of pjRes.data || []) {
          const pid = profileMap.get(c.user_id as string);
          if (pid) options.push({ profile_id: pid, user_id: c.user_id as string, nome: c.contato_nome, cargo: c.tipo_servico, tipo: "pj" });
        }
      }
      setLideres(options);
    };
    fetchLideres();
  }, []);

  // Get current user profile id for gestor_direto filtering
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("id").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setCurrentProfileId(data.id);
    });
  }, [user?.id]);

  const filteredLideres = useMemo(() => {
    if (!liderSearch) return lideres;
    const s = liderSearch.toLowerCase();
    return lideres.filter(l => l.nome.toLowerCase().includes(s) || l.cargo.toLowerCase().includes(s));
  }, [lideres, liderSearch]);

  const filteredGrupos = useMemo(() => {
    return gruposAcesso.filter(g => g.tipo_colaborador === form.tipo || g.tipo_colaborador === "ambos");
  }, [gruposAcesso, form.tipo]);

  useEffect(() => {
    const currentGroup = gruposAcesso.find(g => g.id === form.grupo_acesso_id);
    if (currentGroup && currentGroup.tipo_colaborador !== form.tipo && currentGroup.tipo_colaborador !== "ambos") {
      setForm(f => ({ ...f, grupo_acesso_id: "" }));
    }
  }, [form.tipo, form.grupo_acesso_id, gruposAcesso]);

  
  const canSubmit = form.nome.trim() && form.email.trim() && form.tipo && form.cargo && form.grupo_acesso_id;

  const fetchConvites = async () => {
    const { data, error } = await supabase
      .from("convites_cadastro")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setConvites((data || []) as unknown as Convite[]);
    setLoading(false);
  };

  useEffect(() => { fetchConvites(); }, []);

  // ─── Create handler ────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!canSubmit) { toast.error("Preencha todos os campos obrigatórios"); return; }
    setSaving(true);
    try {
      const insertData: any = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        tipo: form.tipo,
        cargo: form.cargo || null,
        departamento: form.departamento || null,
        criado_por: user?.id || null,
        grupo_acesso_id: form.grupo_acesso_id || null,
        lider_direto_id: form.lider_direto_id && form.lider_direto_id !== "none" ? form.lider_direto_id : null,
        data_inicio_prevista: form.data_inicio_prevista ? format(form.data_inicio_prevista, "yyyy-MM-dd") : null,
        prazo_dias: 9999,
        observacoes_colaborador: form.observacoes_colaborador.trim() || null,
        expira_em: '2099-12-31T23:59:59.000Z',
      };

      if (canSeeSensitive && form.salario_previsto) {
        insertData.salario_previsto = parseFloat(form.salario_previsto);
      }

      const { data, error } = await supabase
        .from("convites_cadastro")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      if (form.lider_direto_id && form.lider_direto_id !== "none") {
        const lider = lideres.find(l => l.profile_id === form.lider_direto_id);
        if (lider) {
          const dataInicioText = form.data_inicio_prevista
            ? format(form.data_inicio_prevista, "dd/MM/yyyy")
            : "data a definir";
          
          await supabase.from("notificacoes_rh").insert({
            tipo: "novo_colaborador_time",
            titulo: "Novo colaborador chegando para o seu time",
            mensagem: `Um novo colaborador está chegando para o seu time: ${form.nome.trim()}, previsto para ${dataInicioText}`,
            link: "/convites-cadastro",
            user_id: lider.user_id,
          });
        }
      }

      // Se veio do recrutamento, atualizar candidato e registrar histórico
      const prefill = (location.state as any)?.prefill;
      if (prefill?.origem === "recrutamento" && prefill.candidato_id) {
        await supabase
          .from("candidatos")
          .update({ status: "contratado" } as any)
          .eq("id", prefill.candidato_id);

        await supabase.from("candidato_historico").insert({
          candidato_id: prefill.candidato_id,
          status_anterior: "oferta",
          status_novo: "contratado",
          responsavel_id: user?.id || null,
        } as any);

        // Incrementar vagas_preenchidas
        if (prefill.vaga_id) {
          const { data: vagaData } = await supabase
            .from("vagas")
            .select("vagas_preenchidas")
            .eq("id", prefill.vaga_id)
            .single();

          await supabase
            .from("vagas")
            .update({ vagas_preenchidas: ((vagaData as any)?.vagas_preenchidas ?? 0) + 1 } as any)
            .eq("id", prefill.vaga_id);
        }
      }

      // Enviar e-mail automaticamente quando vem do recrutamento
      if (prefill?.origem === "recrutamento" && data) {
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "convite-cadastro",
              recipientEmail: data.email,
              idempotencyKey: `convite-${data.id}-${Date.now()}`,
              templateData: {
                nome: data.nome,
                tipo: data.tipo,
                cargo: data.cargo || undefined,
                departamento: data.departamento || undefined,
                link: getLink(data.token),
              },
            },
          });
          await supabase.from("convites_cadastro").update({ status: "email_enviado" }).eq("id", data.id);
          toast.success(`Convite criado e e-mail enviado para ${data.email}!`);
        } catch (emailErr: any) {
          toast.warning("Convite criado mas e-mail não enviado: " + (emailErr.message || "erro desconhecido"));
        }
      } else {
        toast.success("Convite criado com sucesso!");
      }
      setFormOpen(false);
      setForm(initialForm);
      setLiderSearch("");
      fetchConvites();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("convites_cadastro").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else { toast.success("Convite excluído"); fetchConvites(); }
    setDeleteTarget(null);
  };

  const getLink = (token: string) => publicUrl(`/cadastro/${token}`);
  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getLink(token));
    toast.success("Link copiado!");
  };

  const sendEmail = async (convite: Convite) => {
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "convite-cadastro",
          recipientEmail: convite.email,
          idempotencyKey: `convite-${convite.id}-${Date.now()}`,
          templateData: {
            nome: convite.nome,
            tipo: convite.tipo,
            cargo: convite.cargo || undefined,
            departamento: convite.departamento || undefined,
            link: getLink(convite.token),
          },
        },
      });
      if (error) throw error;

      await supabase.from("convites_cadastro").update({ status: "email_enviado" }).eq("id", convite.id);
      setConvites(prev => prev.map(c => c.id === convite.id ? { ...c, status: "email_enviado" } : c));
      toast.success(`E-mail enviado para ${convite.email}!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar e-mail");
    }
  };

  // ─── Review actions ────────────────────────────────────────────────
  const handleStartReview = async (convite: Convite) => {
    setActionLoading(true);
    try {
      await supabase.from("convites_cadastro").update({ status: "em_revisao" }).eq("id", convite.id);
      setConvites(prev => prev.map(c => c.id === convite.id ? { ...c, status: "em_revisao" } : c));
      setReviewTarget({ ...convite, status: "em_revisao" });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setActionLoading(false); }
  };

  const handleApprove = async (convite: Convite) => {
    setActionLoading(true);
    try {
      await supabase.from("convites_cadastro").update({ status: "aprovado" }).eq("id", convite.id);
      setConvites(prev => prev.map(c => c.id === convite.id ? { ...c, status: "aprovado" } : c));
      setReviewTarget(null);
      toast.success(`Convite de ${convite.nome} aprovado! Prossiga com o cadastro.`);
      // Navigate to detail page for export
      navigate(`/convites-cadastro/${convite.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally { setActionLoading(false); }
  };

  const handleReturn = async () => {
    if (!reviewTarget) return;
    if (!returnComment.trim()) { toast.error("Escreva um comentário para o colaborador"); return; }
    setActionLoading(true);
    try {
      const currentData = reviewTarget.dados_preenchidos || {};
      const updatedData = {
        ...currentData,
        _comentario_rh: returnComment.trim(),
        _devolvido_em: new Date().toISOString(),
      };
      await supabase.from("convites_cadastro").update({
        status: "devolvido",
        dados_preenchidos: updatedData,
      }).eq("id", reviewTarget.id);
      setConvites(prev => prev.map(c => c.id === reviewTarget.id ? { ...c, status: "devolvido", dados_preenchidos: updatedData } : c));

      // Enviar e-mail ao colaborador informando a devolução
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "cadastro-devolvido",
            recipientEmail: reviewTarget.email,
            idempotencyKey: `cadastro-devolvido-${reviewTarget.id}-${Date.now()}`,
            templateData: {
              nome: reviewTarget.nome,
              comentario: returnComment.trim(),
              link: getLink(reviewTarget.token),
            },
          },
        });
      } catch (emailErr: any) {
        console.error("Erro ao enviar e-mail de devolução:", emailErr);
      }

      setReviewTarget(null);
      setReturnDialogOpen(false);
      setReturnComment("");
      toast.success("Convite devolvido ao colaborador com comentário.");
    } catch (err: any) {
      toast.error(err.message);
    } finally { setActionLoading(false); }
  };

  // ─── Computed data ─────────────────────────────────────────────────
  // Map líderes and grupos for display
  const liderMap = useMemo(() => new Map(lideres.map(l => [l.profile_id, l.nome])), [lideres]);
  const grupoMap = useMemo(() => new Map(gruposAcesso.map(g => [g.id, g.nome])), [gruposAcesso]);

  // Apply gestor_direto filter
  const visibleConvites = useMemo(() => {
    if (isGestorDireto && currentProfileId) {
      return convites.filter(c => c.lider_direto_id === currentProfileId);
    }
    return convites;
  }, [convites, isGestorDireto, currentProfileId]);

  // Add display status to each convite
  const convitesWithStatus = useMemo(() => 
    visibleConvites.map(c => ({ ...c, displayStatus: getDisplayStatus(c) })),
    [visibleConvites]
  );

  // Funnel counts
  const funnelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FUNNEL_PHASES.forEach(p => { counts[p.key] = 0; });
    convitesWithStatus.forEach(c => {
      if (counts[c.displayStatus] !== undefined) counts[c.displayStatus]++;
    });
    return counts;
  }, [convitesWithStatus]);

  const atrasadosCount = useMemo(() => {
    const now = new Date();
    return convitesWithStatus.filter(c => {
      if (c.displayStatus !== "email_enviado") return false;
      const daysSince = Math.floor((now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 3;
    }).length;
  }, [convitesWithStatus]);


  // Filtered list
  const filtered = useMemo(() => {
    let result = convitesWithStatus.filter(c => {
      const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
      const matchFunnel = !funnelFilter || c.displayStatus === funnelFilter;
      return matchSearch && matchFunnel;
    });
    if (filtroAtrasados) {
      const now = new Date();
      result = result.filter(c => {
        const daysSince = Math.floor((now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince >= 3;
      });
    }
    return result;
  }, [convitesWithStatus, search, funnelFilter, filtroAtrasados]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Convites de Pré-Cadastro</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isGestorDireto ? "Convites do seu time" : "Gestão do funil de pré-cadastro de colaboradores"}
          </p>
        </div>
        {!isGestorDireto && (
          <Button className="gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Novo Convite
          </Button>
        )}
      </div>

      {/* Funnel flow */}
      <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
        {FUNNEL_PHASES.map((phase, index) => (
          <div key={phase.key} className="flex items-stretch flex-1 min-w-0">
            <div
              className={`flex-1 cursor-pointer transition-all rounded-lg border-2 px-3 py-3 min-w-[120px] ${
                funnelFilter === phase.key ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"
              }`}
              style={{
                backgroundColor: funnelFilter === phase.key ? phase.bg : "#FFFFFF",
                borderColor: funnelFilter === phase.key ? phase.color : "#E5E7EB",
              }}
              onClick={() => {
                if (funnelFilter === phase.key) {
                  setFunnelFilter(null);
                  setFiltroAtrasados(false);
                } else {
                  setFunnelFilter(phase.key);
                  if (phase.key !== "email_enviado") setFiltroAtrasados(false);
                }
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium truncate" style={{ color: phase.color }}>
                  {phase.emoji} {phase.label}
                </p>
                {funnelFilter === phase.key && <X className="h-3 w-3 flex-shrink-0" style={{ color: phase.color }} />}
              </div>
              <p className="text-xl font-bold" style={{ color: phase.color }}>
                {funnelCounts[phase.key] || 0}
              </p>
              {phase.key === "email_enviado" && atrasadosCount > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 cursor-pointer hover:bg-yellow-200"
                    onClick={(e) => { e.stopPropagation(); setFiltroAtrasados(!filtroAtrasados); setFunnelFilter("email_enviado"); }}>
                    ⏰ {atrasadosCount}
                  </span>
                </div>
              )}
            </div>
            {index < FUNNEL_PHASES.length - 1 && (
              <div className="flex items-center px-1 flex-shrink-0">
                <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
                  <path d="M2 2L12 12L2 22" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchConvites()} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden lg:table-cell">Cargo</TableHead>
                    <TableHead className="hidden lg:table-cell">Depto</TableHead>
                    {!isGestorDireto && <TableHead className="hidden xl:table-cell">Líder</TableHead>}
                    {!isGestorDireto && <TableHead className="hidden xl:table-cell">Grupo</TableHead>}
                    
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Início</TableHead>
                    <TableHead className="hidden md:table-cell">Tempo</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-10 text-muted-foreground">
                        {funnelFilter ? "Nenhum convite nesta fase" : "Nenhum convite encontrado"}
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((c) => {
                    const rowClass = getRowClass(c.displayStatus);
                    const statusCfg = STATUS_CONFIG[c.displayStatus] || STATUS_CONFIG.pendente;
                    const daysSince = differenceInDays(new Date(), new Date(c.created_at));
                    const timeAgo = formatDistanceToNow(new Date(c.created_at), { locale: ptBR, addSuffix: true });

                    return (
                      <TableRow key={c.id} className={cn("cursor-pointer hover:bg-muted/50", rowClass)} onClick={() => navigate(`/convites-cadastro/${c.id}`)}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell className="text-sm hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span>{c.email}</span>
                            {c.displayStatus === "email_enviado" && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="inline-flex items-center justify-center rounded p-0.5 transition-colors hover:bg-muted"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const newValue = !c.lembretes_ativos;
                                        // Optimistic update
                                        setConvites(prev => prev.map(cv => cv.id === c.id ? { ...cv, lembretes_ativos: newValue } : cv));
                                        const { error } = await supabase.from("convites_cadastro").update({
                                          lembretes_ativos: newValue,
                                          lembretes_suspenso_por: newValue ? null : user?.id ?? null,
                                          lembretes_suspenso_em: newValue ? null : new Date().toISOString(),
                                        } as any).eq("id", c.id);
                                        if (error) {
                                          // Rollback
                                          setConvites(prev => prev.map(cv => cv.id === c.id ? { ...cv, lembretes_ativos: !newValue } : cv));
                                          toast.error("Erro ao atualizar lembretes");
                                        } else {
                                          toast.success(newValue ? "Lembretes reativados" : "Lembretes suspensos");
                                        }
                                      }}
                                    >
                                      {c.lembretes_ativos !== false ? (
                                        <Mail className="h-3.5 w-3.5 text-blue-500" />
                                      ) : (
                                        <MailX className="h-3.5 w-3.5 text-red-500" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>{c.lembretes_ativos !== false ? "Lembretes ativos" : "Lembretes suspensos"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{c.tipo.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">{c.cargo || "—"}</TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">{c.departamento || "—"}</TableCell>
                        {!isGestorDireto && <TableCell className="text-sm hidden xl:table-cell">{c.lider_direto_id ? (liderMap.get(c.lider_direto_id) || "—") : "—"}</TableCell>}
                        {!isGestorDireto && <TableCell className="text-sm hidden xl:table-cell">{c.grupo_acesso_id ? (grupoMap.get(c.grupo_acesso_id) || "—") : "—"}</TableCell>}
                        <TableCell>
                          <Badge variant="outline" className={statusCfg.badge}>
                            {statusCfg.label}
                          </Badge>
                          {c.displayStatus === "email_enviado" && daysSince >= 3 && (
                            <p className="text-[10px] mt-0.5 font-medium" style={{ color: daysSince >= 14 ? "#DC2626" : "#D97706" }}>
                              {daysSince >= 14 ? "3 lembretes enviados" : daysSince >= 7 ? "2 lembretes enviados" : "1 lembrete enviado"} · {daysSince} dias
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm hidden md:table-cell">
                          {c.data_inicio_prevista ? format(parseISO(c.data_inicio_prevista), "dd/MM/yy") : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                          {timeAgo}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Contextual actions by status */}
                              {(c.displayStatus === "email_enviado" || c.displayStatus === "atrasado" || c.displayStatus === "pendente") && (
                                <>
                                  <DropdownMenuItem onClick={() => sendEmail(c)} className="gap-2"><Mail className="h-4 w-4" /> Reenviar Convite</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => copyLink(c.token)} className="gap-2"><Copy className="h-4 w-4" /> Ver Link</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setDeleteTarget(c)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Cancelar</DropdownMenuItem>
                                </>
                              )}
                              {c.displayStatus === "preenchido" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStartReview(c)} className="gap-2"><FileSearch className="h-4 w-4" /> Revisar Ficha</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleApprove(c)} className="gap-2"><CheckCircle2 className="h-4 w-4" /> Aprovar Diretamente</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setReviewTarget(c); setReturnDialogOpen(true); }} className="gap-2"><Undo2 className="h-4 w-4" /> Devolver com Comentário</DropdownMenuItem>
                                </>
                              )}
                              {c.displayStatus === "em_revisao" && (
                                <>
                                  <DropdownMenuItem onClick={() => setReviewTarget(c)} className="gap-2"><Eye className="h-4 w-4" /> Ver Ficha</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleApprove(c)} className="gap-2"><CheckCircle2 className="h-4 w-4" /> Aprovar</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setReviewTarget(c); setReturnDialogOpen(true); }} className="gap-2"><Undo2 className="h-4 w-4" /> Devolver com Comentário</DropdownMenuItem>
                                </>
                              )}
                              {c.displayStatus === "devolvido" && (
                                <>
                                  <DropdownMenuItem onClick={() => setReviewTarget(c)} className="gap-2"><Eye className="h-4 w-4" /> Ver Comentário</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => sendEmail(c)} className="gap-2"><Mail className="h-4 w-4" /> Reenviar</DropdownMenuItem>
                                </>
                              )}
                              {c.displayStatus === "aprovado" && (
                                <>
                                  <DropdownMenuItem onClick={() => navigate(`/convites-cadastro/${c.id}`)} className="gap-2"><UserPlus className="h-4 w-4" /> Criar Colaborador</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setReviewTarget(c); setReturnDialogOpen(true); }} className="gap-2"><Undo2 className="h-4 w-4" /> Devolver com Comentário</DropdownMenuItem>
                                </>
                              )}
                              {c.displayStatus === "cadastrado" && (
                                <DropdownMenuItem onClick={() => navigate(`/convites-cadastro/${c.id}`)} className="gap-2"><Eye className="h-4 w-4" /> Ver Detalhes</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Review Drawer ──────────────────────────────────────────── */}
      <Sheet open={!!reviewTarget && !returnDialogOpen} onOpenChange={(o) => { if (!o) setReviewTarget(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {reviewTarget && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  Revisão: {reviewTarget.nome}
                  <Badge variant="outline" className={STATUS_CONFIG[reviewTarget.status]?.badge || ""}>
                    {STATUS_CONFIG[reviewTarget.status]?.label || reviewTarget.status}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* RH Data Card */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-primary">Dados definidos pelo RH</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-xs text-muted-foreground">Tipo</span><p className="font-medium">{reviewTarget.tipo.toUpperCase()}</p></div>
                      {reviewTarget.cargo && <div><span className="text-xs text-muted-foreground">Cargo</span><p className="font-medium">{reviewTarget.cargo}</p></div>}
                      {reviewTarget.departamento && <div><span className="text-xs text-muted-foreground">Departamento</span><p className="font-medium">{reviewTarget.departamento}</p></div>}
                      {canSeeSalary(isCargoClevel(reviewTarget.cargo)) && reviewTarget.salario_previsto && (
                        <div><span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Salário</span><p className="font-medium">R$ {Number(reviewTarget.salario_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
                      )}
                      {reviewTarget.data_inicio_prevista && (
                        <div><span className="text-xs text-muted-foreground">Início Previsto</span><p className="font-medium">{format(parseISO(reviewTarget.data_inicio_prevista), "dd/MM/yyyy")}</p></div>
                      )}
                      {reviewTarget.lider_direto_id && (
                        <div><span className="text-xs text-muted-foreground">Líder Direto</span><p className="font-medium">{liderMap.get(reviewTarget.lider_direto_id) || "—"}</p></div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Returned comment if devolvido */}
                {reviewTarget.dados_preenchidos?._comentario_rh && (
                  <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-1">Comentário do RH (devolução)</h4>
                      <p className="text-sm">{reviewTarget.dados_preenchidos._comentario_rh}</p>
                      {reviewTarget.dados_preenchidos._devolvido_em && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Devolvido em {format(parseISO(reviewTarget.dados_preenchidos._devolvido_em), "dd/MM/yyyy HH:mm")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Employee Data */}
                {reviewTarget.dados_preenchidos && Object.keys(reviewTarget.dados_preenchidos).length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase">Dados preenchidos pelo colaborador</h4>
                    {Object.entries(reviewTarget.dados_preenchidos as Record<string, any>).map(([key, value]) => {
                      if (key.startsWith("_") || key === "documentos_upload" || key === "lgpd_aceito" || key === "lgpd_aceito_em" || key === "lgpd_versao") return null;
                      if (key === "dependentes" && Array.isArray(value)) {
                        return (
                          <div key={key}>
                            <p className="text-sm font-semibold mb-2">Dependentes ({value.length})</p>
                            {value.map((dep: any, i: number) => (
                              <Card key={i} className="mb-2"><CardContent className="p-3">
                                <div className="grid grid-cols-2 gap-1 text-sm">
                                  {Object.entries(dep).map(([dk, dv]) => (
                                    <div key={dk}><span className="text-xs text-muted-foreground">{dk.replace(/_/g, " ")}</span><p>{String(dv || "—")}</p></div>
                                  ))}
                                </div>
                              </CardContent></Card>
                            ))}
                          </div>
                        );
                      }
                      if (value === null || value === undefined || value === "") return null;
                      return (
                        <div key={key} className="flex justify-between text-sm border-b pb-1">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="font-medium text-right max-w-[60%] break-words">{String(value)}</span>
                        </div>
                      );
                    })}

                    {/* Uploaded docs */}
                    {reviewTarget.dados_preenchidos.documentos_upload && Array.isArray(reviewTarget.dados_preenchidos.documentos_upload) && (
                      <div>
                        <p className="text-sm font-semibold mb-2">Documentos Anexados</p>
                        {reviewTarget.dados_preenchidos.documentos_upload.map((doc: any) => (
                          <div key={doc.key} className="flex items-center justify-between p-2 rounded border mb-1">
                            <span className="text-sm">{doc.name || doc.key}</span>
                            <Button variant="outline" size="sm" asChild><a href={doc.url} target="_blank" rel="noopener noreferrer" className="gap-1"><ExternalLink className="h-3 w-3" /> Ver</a></Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* LGPD info */}
                    {reviewTarget.dados_preenchidos.lgpd_aceito && (
                      <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Termo LGPD aceito em {reviewTarget.dados_preenchidos.lgpd_aceito_em ? format(parseISO(reviewTarget.dados_preenchidos.lgpd_aceito_em), "dd/MM/yyyy HH:mm") : "—"}
                        {reviewTarget.dados_preenchidos.lgpd_versao && ` (v${reviewTarget.dados_preenchidos.lgpd_versao})`}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-6 text-center">Nenhum dado preenchido pelo colaborador ainda.</p>
                )}
              </div>

              {/* Footer actions */}
              {(reviewTarget.status === "preenchido" || reviewTarget.status === "em_revisao") && !isGestorDireto && (
                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => { setReturnDialogOpen(true); }}>
                    <Undo2 className="h-4 w-4" /> Devolver para Correção
                  </Button>
                  <Button className="flex-1 gap-2" onClick={() => handleApprove(reviewTarget)} disabled={actionLoading}>
                    {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="h-4 w-4" /> Aprovar Cadastro
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Return Comment Dialog ──────────────────────────────────── */}
      <Dialog open={returnDialogOpen} onOpenChange={(o) => { if (!o) { setReturnDialogOpen(false); setReturnComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver para Correção</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Escreva o motivo da devolução. O colaborador verá esse comentário ao reabrir a ficha.</p>
            <Textarea
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
              placeholder="Ex: Documento do RG está ilegível, favor reenviar..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnDialogOpen(false); setReturnComment(""); }}>Cancelar</Button>
            <Button onClick={handleReturn} disabled={actionLoading || !returnComment.trim()} className="gap-2">
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── New Invite Dialog ──────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setForm(initialForm); setLiderSearch(""); } setFormOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Novo Convite de Pré-Cadastro</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
            <div className="space-y-6 py-4">
              {/* Section 1: Dados Básicos */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados Básicos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" /></div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" /></div>
                </div>
                <div>
                  <Label>Tipo de Contratação *</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="clt">CLT</SelectItem><SelectItem value="pj">PJ</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              {/* Section 2: Dados da Vaga */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados da Vaga</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Cargo *</Label>
                    {cargos && cargos.length > 0 ? (
                      <Select value={form.cargo} onValueChange={(v) => setForm({ ...form, cargo: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                        <SelectContent>{cargos.map((c) => <SelectItem key={c.valor} value={c.valor}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Cargo previsto" />
                    )}
                  </div>
                  <div>
                    <Label>Departamento</Label>
                    {departamentos && departamentos.length > 0 ? (
                      <Select value={form.departamento} onValueChange={(v) => setForm({ ...form, departamento: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{departamentos.map((d) => <SelectItem key={d.valor} value={d.valor}>{d.label}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} placeholder="Departamento" />
                    )}
                  </div>
                </div>
                <div>
                  <Label>Líder Direto</Label>
                  <Select value={form.lider_direto_id} onValueChange={(v) => setForm({ ...form, lider_direto_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sem líder direto por enquanto" /></SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <Input placeholder="Buscar..." value={liderSearch} onChange={(e) => setLiderSearch(e.target.value)} className="h-8" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} />
                      </div>
                      <SelectItem value="none">Sem líder direto</SelectItem>
                      {filteredLideres.map((l) => <SelectItem key={l.profile_id} value={l.profile_id}>{l.nome} — {l.cargo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grupo de Acesso *</Label>
                  <Select value={form.grupo_acesso_id} onValueChange={(v) => setForm({ ...form, grupo_acesso_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                    <SelectContent>{filteredGrupos.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Define o role automático ao ativar</p>
                </div>
              </div>

              {/* Section 3: Dados Sensíveis */}
              {(() => {
                const selectedCargoCLevel = isCargoClevel(form.cargo);
                const showSalaryField = selectedCargoCLevel ? isSuperAdmin : canSeeSensitive;
                return (
                  <>
                    {selectedCargoCLevel && !isSuperAdmin && form.cargo && (
                      <p className="text-xs text-muted-foreground italic">
                        Este é um cargo C-Level. O salário será definido pelo Super Admin.
                      </p>
                    )}
                    {showSalaryField && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Dados Sensíveis</h3>
                        <div>
                          <Label className="flex items-center gap-2">
                            {form.tipo === "clt" ? "Salário Base (R$)" : "Valor Mensal (R$)"}
                            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><Lock className="h-3 w-3" /> Dado sensível</span>
                            {selectedCargoCLevel && (
                              <Badge className="text-[10px] bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700 ml-1">
                                C-Level 🔒
                              </Badge>
                            )}
                          </Label>
                          <Input type="number" step="0.01" min="0" value={form.salario_previsto} onChange={(e) => setForm({ ...form, salario_previsto: e.target.value })} placeholder="0,00" />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Section 4: Configurações */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Configurações do Convite</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Início Prevista</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.data_inicio_prevista && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.data_inicio_prevista ? format(form.data_inicio_prevista, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.data_inicio_prevista} onSelect={(d) => setForm({ ...form, data_inicio_prevista: d })} locale={ptBR} disabled={(date) => date < new Date()} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label>Observações para o colaborador</Label>
                  <Textarea value={form.observacoes_colaborador} onChange={(e) => setForm({ ...form, observacoes_colaborador: e.target.value })} placeholder="Instruções exibidas na ficha pública..." rows={3} />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 pb-6 pt-2 border-t">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !canSubmit}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Gerar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Convite</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o convite de <strong>{deleteTarget?.nome}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
