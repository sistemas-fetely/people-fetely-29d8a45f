import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, ShieldAlert, Save, ChevronRight,
  Briefcase, Building2, Monitor,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProcessosCategorias, type ProcessoCategoria } from "@/hooks/useProcessosCategorias";
import { NovaCategoriaDialog } from "@/components/templates/NovaCategoriaDialog";
import { getProcessoIcon, naturezaLabel } from "@/lib/processo-icones";

type Dimensao = "cargo" | "departamento" | "sistema";

interface TarefaBase {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  area_destino: string | null;
  responsavel_role: string | null;
  accountable_role: string | null;
  prazo_dias: number;
  prioridade: string | null;
  bloqueante: boolean | null;
  motivo_bloqueio?: string | null;
  somente_clt?: boolean | null;
}

interface Personalizacao {
  id: string;
  categoria_id: string;
  dimensao: Dimensao;
  referencia_id: string | null;
  referencia_label: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface ReferenciaItem { id: string; label: string }

const AREAS = ["RH", "TI", "Financeiro", "Gestão", "Geral", "Comercial", "Operacional"];
const ROLES = ["super_admin", "admin_rh", "gestor_rh", "admin_ti", "financeiro", "gestor_direto", "colaborador"];
const PRIORIDADES = ["urgente", "alta", "normal", "baixa"];

const DIMENSAO_META: Record<Dimensao, { label: string; emoji: string; icon: any }> = {
  cargo: { label: "Cargo", emoji: "👔", icon: Briefcase },
  departamento: { label: "Depto", emoji: "🏢", icon: Building2 },
  sistema: { label: "Sistema", emoji: "💻", icon: Monitor },
};

export default function ProcessoEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const podeEditar = roles?.some((r) => ["super_admin", "admin_rh"].includes(r));

  const { categorias, loading: loadingCats, recarregar: recarregarCats } = useProcessosCategorias();
  const processo = useMemo(() => categorias.find((c) => c.slug === slug), [categorias, slug]);

  const [editandoProcesso, setEditandoProcesso] = useState<ProcessoCategoria | null>(null);
  const [openEditarProcesso, setOpenEditarProcesso] = useState(false);

  // Tarefas padrão (template base)
  const [templateBaseId, setTemplateBaseId] = useState<string | null>(null);
  const [tarefasPadrao, setTarefasPadrao] = useState<TarefaBase[]>([]);
  const [loadingTarefas, setLoadingTarefas] = useState(false);

  const [openTarefa, setOpenTarefa] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Partial<TarefaBase> | null>(null);
  const [deletingTarefa, setDeletingTarefa] = useState<TarefaBase | null>(null);

  // Personalizacoes
  const [personalizacoes, setPersonalizacoes] = useState<Personalizacao[]>([]);
  const [tarefasCount, setTarefasCount] = useState<Record<string, number>>({});
  const [loadingPers, setLoadingPers] = useState(false);

  const [openNovaPers, setOpenNovaPers] = useState(false);
  const [editingPers, setEditingPers] = useState<Partial<Personalizacao> | null>(null);
  const [deletingPers, setDeletingPers] = useState<Personalizacao | null>(null);

  // Sub-edição (drawer-like) de uma personalização
  const [persEditandoId, setPersEditandoId] = useState<string | null>(null);
  const persEditando = useMemo(
    () => personalizacoes.find((p) => p.id === persEditandoId),
    [personalizacoes, persEditandoId],
  );
  const [tarefasPers, setTarefasPers] = useState<TarefaBase[]>([]);
  const [loadingTarefasPers, setLoadingTarefasPers] = useState(false);

  const [openTarefaPers, setOpenTarefaPers] = useState(false);
  const [editingTarefaPers, setEditingTarefaPers] = useState<Partial<TarefaBase> | null>(null);
  const [deletingTarefaPers, setDeletingTarefaPers] = useState<TarefaBase | null>(null);

  // Garantir template base existe / criar se necessário
  const ensureTemplateBase = useCallback(async (): Promise<string | null> => {
    if (!processo) return null;
    // tenta achar
    const { data: existing } = await supabase
      .from("sncf_templates_processos")
      .select("id")
      .eq("categoria_id", processo.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      setTemplateBaseId(existing.id);
      return existing.id;
    }
    // criar silencioso
    const payload: any = {
      nome: processo.nome,
      descricao: processo.descricao,
      tipo_processo: processo.slug,
      categoria_id: processo.id,
      tipo_colaborador: "ambos",
      ativo: true,
    };
    const { data: created, error } = await supabase
      .from("sncf_templates_processos")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      toast.error("Erro ao criar template base: " + error.message);
      return null;
    }
    setTemplateBaseId(created.id);
    return created.id;
  }, [processo]);

  const carregarTarefasPadrao = useCallback(async (tplId: string) => {
    setLoadingTarefas(true);
    const { data, error } = await supabase
      .from("sncf_templates_tarefas")
      .select("*")
      .eq("template_id", tplId)
      .order("ordem");
    if (error) toast.error("Erro: " + error.message);
    else setTarefasPadrao((data ?? []) as TarefaBase[]);
    setLoadingTarefas(false);
  }, []);

  const carregarPersonalizacoes = useCallback(async () => {
    if (!processo) return;
    setLoadingPers(true);
    const { data, error } = await (supabase as any)
      .from("sncf_template_extensoes")
      .select("*")
      .eq("categoria_id", processo.id)
      .order("dimensao")
      .order("referencia_label");
    if (error) {
      toast.error("Erro: " + error.message);
      setLoadingPers(false);
      return;
    }
    const exts = (data ?? []) as Personalizacao[];
    setPersonalizacoes(exts);
    if (exts.length > 0) {
      const ids = exts.map((e) => e.id);
      const { data: t } = await (supabase as any)
        .from("sncf_template_extensoes_tarefas")
        .select("extensao_id")
        .in("extensao_id", ids);
      const counts: Record<string, number> = {};
      (t ?? []).forEach((row: any) => {
        counts[row.extensao_id] = (counts[row.extensao_id] || 0) + 1;
      });
      setTarefasCount(counts);
    } else {
      setTarefasCount({});
    }
    setLoadingPers(false);
  }, [processo]);

  // Carregar template base e personalizações
  useEffect(() => {
    if (!processo) return;
    (async () => {
      const tplId = await ensureTemplateBase();
      if (tplId) await carregarTarefasPadrao(tplId);
    })();
    void carregarPersonalizacoes();
  }, [processo, ensureTemplateBase, carregarTarefasPadrao, carregarPersonalizacoes]);

  const carregarTarefasPers = useCallback(async (extId: string) => {
    setLoadingTarefasPers(true);
    const { data, error } = await (supabase as any)
      .from("sncf_template_extensoes_tarefas")
      .select("*")
      .eq("extensao_id", extId)
      .order("ordem");
    if (error) toast.error("Erro: " + error.message);
    else setTarefasPers((data ?? []) as TarefaBase[]);
    setLoadingTarefasPers(false);
  }, []);

  useEffect(() => {
    if (persEditandoId) void carregarTarefasPers(persEditandoId);
    else setTarefasPers([]);
  }, [persEditandoId, carregarTarefasPers]);

  const salvarTarefaPadrao = async () => {
    if (!templateBaseId || !editingTarefa?.titulo) {
      toast.error("Preencha o título");
      return;
    }
    const payload: any = {
      template_id: templateBaseId,
      ordem: editingTarefa.ordem ?? tarefasPadrao.length + 1,
      titulo: editingTarefa.titulo,
      descricao: editingTarefa.descricao ?? null,
      area_destino: editingTarefa.area_destino ?? null,
      responsavel_role: editingTarefa.responsavel_role ?? null,
      accountable_role: editingTarefa.accountable_role ?? null,
      prazo_dias: editingTarefa.prazo_dias ?? 0,
      prioridade: editingTarefa.prioridade ?? "normal",
      bloqueante: editingTarefa.bloqueante ?? false,
      motivo_bloqueio: editingTarefa.motivo_bloqueio ?? null,
      somente_clt: editingTarefa.somente_clt ?? false,
    };
    const { error } = editingTarefa.id
      ? await supabase.from("sncf_templates_tarefas").update(payload).eq("id", editingTarefa.id)
      : await supabase.from("sncf_templates_tarefas").insert(payload);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa salva");
      setOpenTarefa(false);
      setEditingTarefa(null);
      await carregarTarefasPadrao(templateBaseId);
    }
  };

  const excluirTarefaPadrao = async () => {
    if (!deletingTarefa) return;
    const { error } = await supabase.from("sncf_templates_tarefas").delete().eq("id", deletingTarefa.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa removida");
      if (templateBaseId) await carregarTarefasPadrao(templateBaseId);
    }
    setDeletingTarefa(null);
  };

  const salvarTarefaPers = async () => {
    if (!persEditandoId || !editingTarefaPers?.titulo) {
      toast.error("Preencha o título");
      return;
    }
    const payload: any = {
      extensao_id: persEditandoId,
      ordem: editingTarefaPers.ordem ?? tarefasPers.length + 1,
      titulo: editingTarefaPers.titulo,
      descricao: editingTarefaPers.descricao ?? null,
      area_destino: editingTarefaPers.area_destino ?? null,
      sistema_origem: "people",
      responsavel_role: editingTarefaPers.responsavel_role ?? null,
      accountable_role: editingTarefaPers.accountable_role ?? null,
      prazo_dias: editingTarefaPers.prazo_dias ?? 0,
      prioridade: editingTarefaPers.prioridade ?? "normal",
      bloqueante: editingTarefaPers.bloqueante ?? false,
      motivo_bloqueio: editingTarefaPers.motivo_bloqueio ?? null,
    };
    const { error } = editingTarefaPers.id
      ? await (supabase as any).from("sncf_template_extensoes_tarefas").update(payload).eq("id", editingTarefaPers.id)
      : await (supabase as any).from("sncf_template_extensoes_tarefas").insert(payload);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa salva");
      setOpenTarefaPers(false);
      setEditingTarefaPers(null);
      await carregarTarefasPers(persEditandoId);
      await carregarPersonalizacoes();
    }
  };

  const excluirTarefaPers = async () => {
    if (!deletingTarefaPers) return;
    const { error } = await (supabase as any)
      .from("sncf_template_extensoes_tarefas")
      .delete()
      .eq("id", deletingTarefaPers.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa removida");
      if (persEditandoId) await carregarTarefasPers(persEditandoId);
      await carregarPersonalizacoes();
    }
    setDeletingTarefaPers(null);
  };

  const excluirPers = async () => {
    if (!deletingPers) return;
    const { error } = await (supabase as any)
      .from("sncf_template_extensoes")
      .delete()
      .eq("id", deletingPers.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Personalização removida");
      setDeletingPers(null);
      await carregarPersonalizacoes();
    }
  };

  if (!podeEditar) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold">Acesso restrito</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingCats) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!processo) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Processo não encontrado.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/processos")}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = getProcessoIcon(processo.icone);

  // Sub-tela: edição de uma personalização
  if (persEditando) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setPersEditandoId(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para {processo.nome}
        </Button>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="gap-1">
                {DIMENSAO_META[persEditando.dimensao].emoji} {DIMENSAO_META[persEditando.dimensao].label}
              </Badge>
              <h1 className="text-xl font-bold">{persEditando.referencia_label}</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Personalização do processo <strong>{processo.nome}</strong>
            </p>
            {persEditando.descricao && (
              <p className="text-sm text-muted-foreground mt-1">{persEditando.descricao}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Tarefas extras</CardTitle>
              <CardDescription>
                Geradas em adição às tarefas padrão quando esta personalização se aplica.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingTarefaPers({ prazo_dias: 0, prioridade: "normal" });
                setOpenTarefaPers(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
          </CardHeader>
          <CardContent>
            {loadingTarefasPers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tarefasPers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma tarefa cadastrada. Clique em "Nova tarefa".
              </p>
            ) : (
              <ListaTarefas
                tarefas={tarefasPers}
                onEditar={(t) => { setEditingTarefaPers(t); setOpenTarefaPers(true); }}
                onExcluir={(t) => setDeletingTarefaPers(t)}
              />
            )}
          </CardContent>
        </Card>

        <TarefaDialog
          open={openTarefaPers}
          onOpenChange={(o) => { setOpenTarefaPers(o); if (!o) setEditingTarefaPers(null); }}
          tarefa={editingTarefaPers}
          setTarefa={setEditingTarefaPers}
          ordemPadrao={tarefasPers.length + 1}
          onSave={salvarTarefaPers}
          incluirMotivoBloqueio
        />

        <AlertDialog open={!!deletingTarefaPers} onOpenChange={(o) => !o && setDeletingTarefaPers(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover tarefa?</AlertDialogTitle>
              <AlertDialogDescription>"{deletingTarefaPers?.titulo}" será removida.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={excluirTarefaPers} className="bg-destructive text-destructive-foreground">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Tela principal do processo
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/processos")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: processo.cor ?? "#1A4A3A" }}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">{processo.nome}</h1>
              {processo.descricao && (
                <p className="text-sm text-muted-foreground">{processo.descricao}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{processo.modulo_origem}</Badge>
                <Badge variant="outline">{naturezaLabel(processo.natureza)}</Badge>
                {!processo.ativo && <Badge variant="destructive">Inativo</Badge>}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => { setEditandoProcesso(processo); setOpenEditarProcesso(true); }}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" /> Editar dados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tarefas Padrão */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">📋 Tarefas Padrão</CardTitle>
              <CardDescription>
                Tarefas que sempre são geradas quando esse processo é iniciado
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                if (!templateBaseId) await ensureTemplateBase();
                setEditingTarefa({ prazo_dias: 0, prioridade: "normal" });
                setOpenTarefa(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTarefas ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tarefasPadrao.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma tarefa padrão cadastrada. Clique em "Nova tarefa".
            </p>
          ) : (
            <ListaTarefas
              tarefas={tarefasPadrao}
              onEditar={(t) => { setEditingTarefa(t); setOpenTarefa(true); }}
              onExcluir={(t) => setDeletingTarefa(t)}
            />
          )}
        </CardContent>
      </Card>

      {/* Personalizações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">🎯 Personalizações</CardTitle>
              <CardDescription>
                Adicione tarefas extras quando o colaborador tiver um cargo, departamento ou sistema específico
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => { setEditingPers({ ativo: true }); setOpenNovaPers(true); }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Nova personalização
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : personalizacoes.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma personalização cadastrada.<br />
              Crie uma para adicionar tarefas específicas conforme o perfil do colaborador.
            </div>
          ) : (
            <div className="space-y-2">
              {personalizacoes.map((p) => {
                const meta = DIMENSAO_META[p.dimensao];
                const count = tarefasCount[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer gap-3"
                    onClick={() => setPersEditandoId(p.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {meta.emoji} {meta.label}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.referencia_label}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} tarefa{count === 1 ? "" : "s"} extra{count === 1 ? "" : "s"}
                          {!p.ativo && " · inativa"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeletingPers(p); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1">
                        Editar <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TarefaDialog
        open={openTarefa}
        onOpenChange={(o) => { setOpenTarefa(o); if (!o) setEditingTarefa(null); }}
        tarefa={editingTarefa}
        setTarefa={setEditingTarefa}
        ordemPadrao={tarefasPadrao.length + 1}
        onSave={salvarTarefaPadrao}
      />

      <NovaPersonalizacaoDialog
        open={openNovaPers}
        onOpenChange={(o) => { setOpenNovaPers(o); if (!o) setEditingPers(null); }}
        processoNome={processo.nome}
        categoriaId={processo.id}
        onCreated={async (newId) => {
          await carregarPersonalizacoes();
          setPersEditandoId(newId);
        }}
      />

      <NovaCategoriaDialog
        open={openEditarProcesso}
        onOpenChange={(o) => { setOpenEditarProcesso(o); if (!o) setEditandoProcesso(null); }}
        categoria={editandoProcesso}
        onSaved={async () => { await recarregarCats(); }}
      />

      <AlertDialog open={!!deletingTarefa} onOpenChange={(o) => !o && setDeletingTarefa(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tarefa?</AlertDialogTitle>
            <AlertDialogDescription>"{deletingTarefa?.titulo}" será removida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirTarefaPadrao} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingPers} onOpenChange={(o) => !o && setDeletingPers(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover personalização?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingPers?.referencia_label}" e todas as suas tarefas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirPers} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============= Sub-componentes =============

function ListaTarefas({
  tarefas, onEditar, onExcluir,
}: {
  tarefas: TarefaBase[];
  onEditar: (t: TarefaBase) => void;
  onExcluir: (t: TarefaBase) => void;
}) {
  return (
    <div className="space-y-2">
      {tarefas.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
        >
          <span className="text-xs font-mono text-muted-foreground mt-1">#{t.ordem}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{t.titulo}</span>
              {t.bloqueante && <Badge variant="destructive" className="text-[10px]">⚠ Legal</Badge>}
              {t.prioridade === "urgente" && <Badge variant="destructive" className="text-[10px]">Urgente</Badge>}
              {t.area_destino && <Badge variant="outline" className="text-[10px]">{t.area_destino}</Badge>}
              {t.somente_clt && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-primary/10 text-primary border-primary/30"
                  title="Esta tarefa é gerada apenas para colaboradores CLT"
                >
                  CLT
                </Badge>
              )}
            </div>
            {t.descricao && <p className="text-xs text-muted-foreground mt-1">{t.descricao}</p>}
            <div className="flex gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
              <span>Prazo: D{t.prazo_dias >= 0 ? "+" : ""}{t.prazo_dias}</span>
              {t.responsavel_role && <span>Resp: {t.responsavel_role}</span>}
              {t.accountable_role && <span>Acc: {t.accountable_role}</span>}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditar(t)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onExcluir(t)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TarefaDialog({
  open, onOpenChange, tarefa, setTarefa, ordemPadrao, onSave, incluirMotivoBloqueio = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tarefa: Partial<TarefaBase> | null;
  setTarefa: (t: Partial<TarefaBase> | null) => void;
  ordemPadrao: number;
  onSave: () => void;
  incluirMotivoBloqueio?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tarefa?.id ? "Editar" : "Nova"} tarefa</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Título *</Label>
            <Input
              value={tarefa?.titulo ?? ""}
              onChange={(e) => setTarefa({ ...tarefa, titulo: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={tarefa?.descricao ?? ""}
              onChange={(e) => setTarefa({ ...tarefa, descricao: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Área</Label>
              <Select
                value={tarefa?.area_destino ?? ""}
                onValueChange={(v) => setTarefa({ ...tarefa, area_destino: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select
                value={tarefa?.prioridade ?? "normal"}
                onValueChange={(v) => setTarefa({ ...tarefa, prioridade: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Responsável (executa)</Label>
              <Select
                value={tarefa?.responsavel_role ?? ""}
                onValueChange={(v) => setTarefa({ ...tarefa, responsavel_role: v })}
              >
                <SelectTrigger><SelectValue placeholder="Role..." /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Acompanhamento (cobra)</Label>
              <Select
                value={tarefa?.accountable_role ?? ""}
                onValueChange={(v) => setTarefa({ ...tarefa, accountable_role: v })}
              >
                <SelectTrigger><SelectValue placeholder="Role..." /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prazo (dias após início)</Label>
              <Input
                type="number"
                value={tarefa?.prazo_dias ?? 0}
                onChange={(e) => setTarefa({ ...tarefa, prazo_dias: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={tarefa?.ordem ?? ordemPadrao}
                onChange={(e) => setTarefa({ ...tarefa, ordem: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={tarefa?.bloqueante ?? false}
              onCheckedChange={(v) => setTarea({ ...tarefa, bloqueante: v })}
            />
            <Label className="cursor-pointer">Tarefa bloqueante / legal</Label>
          </div>
          {incluirMotivoBloqueio && tarefa?.bloqueante && (
            <div>
              <Label>Motivo do bloqueio</Label>
              <Input
                value={tarefa?.motivo_bloqueio ?? ""}
                onChange={(e) => setTarefa({ ...tarefa, motivo_bloqueio: e.target.value })}
                placeholder="Ex: Prazo legal, exigência fiscal..."
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch
              checked={tarefa?.somente_clt ?? false}
              onCheckedChange={(v) => setTarefa({ ...tarefa, somente_clt: v })}
            />
            <Label className="cursor-pointer" title="Quando ativada, esta tarefa será gerada apenas para colaboradores CLT (não para PJ)">
              Apenas para colaboradores CLT
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} className="gap-2"><Save className="h-4 w-4" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovaPersonalizacaoDialog({
  open, onOpenChange, processoNome, categoriaId, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  processoNome: string;
  categoriaId: string;
  onCreated: (newId: string) => void;
}) {
  const [dimensao, setDimensao] = useState<Dimensao>("cargo");
  const [referenciaId, setReferenciaId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [referencias, setReferencias] = useState<ReferenciaItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDimensao("cargo");
      setReferenciaId("");
      setNome("");
    }
  }, [open]);

  // carregar referencias quando dimensao muda
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (dimensao === "cargo") {
        const { data } = await supabase
          .from("cargos")
          .select("id, nome, nivel")
          .eq("ativo", true)
          .order("nome");
        if (!cancelled) {
          setReferencias((data ?? []).map((c: any) => ({ id: c.id, label: `${c.nome} (${c.nivel})` })));
        }
      } else {
        const cat = dimensao === "departamento" ? "departamento" : "sistema";
        const { data } = await (supabase as any)
          .from("parametros")
          .select("id, label")
          .eq("categoria", cat)
          .eq("ativo", true)
          .order("ordem")
          .order("label");
        if (!cancelled) {
          setReferencias((data ?? []).map((p: any) => ({ id: p.id, label: p.label })));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [dimensao]);

  // auto-gerar nome
  useEffect(() => {
    const ref = referencias.find((r) => r.id === referenciaId);
    if (ref) setNome(`Tarefas de ${DIMENSAO_META[dimensao].label.toLowerCase()} ${ref.label}`);
  }, [referenciaId, dimensao, referencias]);

  const salvar = async () => {
    if (!referenciaId) {
      toast.error("Selecione qual " + DIMENSAO_META[dimensao].label.toLowerCase());
      return;
    }
    const ref = referencias.find((r) => r.id === referenciaId);
    if (!ref) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      categoria_id: categoriaId,
      dimensao,
      referencia_id: referenciaId,
      referencia_label: ref.label,
      nome: nome.trim() || `Tarefas de ${dimensao} ${ref.label}`,
      ativo: true,
      criado_por: u?.user?.id ?? null,
    };
    const { data, error } = await (supabase as any)
      .from("sncf_template_extensoes")
      .insert(payload)
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success("Personalização criada");
    onOpenChange(false);
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova personalização do processo {processoNome}</DialogTitle>
          <DialogDescription>
            Adicione tarefas extras que serão geradas apenas quando o colaborador tiver determinado cargo, departamento ou sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Aplicar quando o colaborador tiver:</Label>
            <Select value={dimensao} onValueChange={(v: Dimensao) => { setDimensao(v); setReferenciaId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cargo">👔 Cargo</SelectItem>
                <SelectItem value="departamento">🏢 Departamento</SelectItem>
                <SelectItem value="sistema">💻 Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Selecione qual:</Label>
            <Select value={referenciaId} onValueChange={setReferenciaId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {referencias.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nome da personalização:</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Auto-gerado" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="gap-2" style={{ backgroundColor: "#1A4A3A" }}>
            <Save className="h-4 w-4" /> Criar e adicionar tarefas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
