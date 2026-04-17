import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, ChevronRight, ArrowLeft, Save, Loader2, ShieldAlert,
  FolderPlus, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProcessosCategorias, type ProcessoCategoria } from "@/hooks/useProcessosCategorias";
import { NovaCategoriaDialog } from "@/components/templates/NovaCategoriaDialog";

interface Template {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_processo: string;
  categoria_id: string | null;
  tipo_colaborador: string | null;
  ativo: boolean;
}

interface TemplateTarefa {
  id: string;
  template_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  area_destino: string | null;
  responsavel_role: string | null;
  accountable_role: string | null;
  prazo_dias: number;
  prioridade: string;
  bloqueante: boolean | null;
}

const TIPOS_COLABORADOR = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "ambos", label: "Ambos" },
];

const AREAS = ["RH", "TI", "Financeiro", "Gestão", "Geral"];
const ROLES = ["super_admin", "admin_rh", "gestor_rh", "admin_ti", "financeiro", "gestor_direto", "colaborador"];
const PRIORIDADES = ["urgente", "alta", "normal", "baixa"];

export default function TemplatesProcessos() {
  const { roles } = useAuth();
  const podeEditar = roles?.some((r) => ["super_admin", "admin_rh"].includes(r));

  const { categorias, recarregar: recarregarCategorias } = useProcessosCategorias();
  const categoriasAtivas = useMemo(() => categorias.filter((c) => c.ativo), [categorias]);
  const categoriasMap = useMemo(() => {
    const m = new Map<string, ProcessoCategoria>();
    categorias.forEach((c) => {
      m.set(c.id, c);
      m.set(c.slug, c);
    });
    return m;
  }, [categorias]);

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tarefas, setTarefas] = useState<TemplateTarefa[]>([]);
  const [loadingTarefas, setLoadingTarefas] = useState(false);

  // Dialog template
  const [openTemplate, setOpenTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);

  // Dialog tarefa
  const [openTarefa, setOpenTarefa] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Partial<TemplateTarefa> | null>(null);

  // Confirm delete
  const [deletingTarefa, setDeletingTarefa] = useState<TemplateTarefa | null>(null);

  // Categorias
  const [openCategoria, setOpenCategoria] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<ProcessoCategoria | null>(null);
  const [categoriasOpen, setCategoriasOpen] = useState(false);

  const carregarTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sncf_templates_processos")
      .select("*")
      .order("tipo_processo")
      .order("nome");
    if (error) toast.error("Erro: " + error.message);
    else setTemplates((data ?? []) as Template[]);
    setLoading(false);
  }, []);

  const carregarTarefas = useCallback(async (templateId: string) => {
    setLoadingTarefas(true);
    const { data, error } = await supabase
      .from("sncf_templates_tarefas")
      .select("*")
      .eq("template_id", templateId)
      .order("ordem");
    if (error) toast.error("Erro: " + error.message);
    else setTarefas((data ?? []) as TemplateTarefa[]);
    setLoadingTarefas(false);
  }, []);

  useEffect(() => { void carregarTemplates(); }, [carregarTemplates]);
  useEffect(() => {
    if (selectedId) void carregarTarefas(selectedId);
    else setTarefas([]);
  }, [selectedId, carregarTarefas]);

  const selected = useMemo(() => templates.find((t) => t.id === selectedId), [templates, selectedId]);
  const selectedCategoria = selected
    ? categoriasMap.get(selected.categoria_id ?? "") ?? categoriasMap.get(selected.tipo_processo) ?? null
    : null;

  const salvarTemplate = async () => {
    if (!editingTemplate?.nome || !editingTemplate?.categoria_id) {
      toast.error("Preencha nome e categoria");
      return;
    }
    const cat = categoriasMap.get(editingTemplate.categoria_id);
    if (!cat) {
      toast.error("Categoria inválida");
      return;
    }
    const payload: any = {
      nome: editingTemplate.nome,
      descricao: editingTemplate.descricao ?? null,
      tipo_processo: cat.slug,
      categoria_id: cat.id,
      tipo_colaborador: editingTemplate.tipo_colaborador ?? "ambos",
      ativo: editingTemplate.ativo ?? true,
    };
    const { error } = editingTemplate.id
      ? await supabase.from("sncf_templates_processos").update(payload).eq("id", editingTemplate.id)
      : await supabase.from("sncf_templates_processos").insert(payload);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Template salvo");
      setOpenTemplate(false);
      setEditingTemplate(null);
      void carregarTemplates();
    }
  };

  const salvarTarefa = async () => {
    if (!selectedId || !editingTarefa?.titulo) {
      toast.error("Preencha o título");
      return;
    }
    const payload = {
      template_id: selectedId,
      ordem: editingTarefa.ordem ?? tarefas.length + 1,
      titulo: editingTarefa.titulo,
      descricao: editingTarefa.descricao ?? null,
      area_destino: editingTarefa.area_destino ?? null,
      responsavel_role: editingTarefa.responsavel_role ?? null,
      accountable_role: editingTarefa.accountable_role ?? null,
      prazo_dias: editingTarefa.prazo_dias ?? 0,
      prioridade: editingTarefa.prioridade ?? "normal",
      bloqueante: editingTarefa.bloqueante ?? false,
    };
    const { error } = editingTarefa.id
      ? await supabase.from("sncf_templates_tarefas").update(payload).eq("id", editingTarefa.id)
      : await supabase.from("sncf_templates_tarefas").insert(payload);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa salva");
      setOpenTarefa(false);
      setEditingTarefa(null);
      void carregarTarefas(selectedId);
    }
  };

  const excluirTarefa = async () => {
    if (!deletingTarefa) return;
    const { error } = await supabase.from("sncf_templates_tarefas").delete().eq("id", deletingTarefa.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa removida");
      if (selectedId) void carregarTarefas(selectedId);
    }
    setDeletingTarefa(null);
  };

  const renderCategoriaBadge = (slugOrId: string | null | undefined) => {
    if (!slugOrId) return <Badge variant="outline">sem categoria</Badge>;
    const cat = categoriasMap.get(slugOrId);
    if (!cat) return <Badge variant="outline">{slugOrId}</Badge>;
    return (
      <Badge
        style={{ backgroundColor: cat.cor ?? undefined, color: "white", borderColor: "transparent" }}
      >
        {cat.nome}
      </Badge>
    );
  };

  if (!podeEditar) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground mt-1">Apenas Admin RH e Super Admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Editor de template selecionado
  if (selected) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>{selected.nome}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{selected.descricao}</p>
                <div className="flex gap-2 mt-2">
                  {renderCategoriaBadge(selected.categoria_id ?? selected.tipo_processo)}
                  <Badge variant="outline">{selected.tipo_colaborador}</Badge>
                  {!selected.ativo && <Badge variant="destructive">Inativo</Badge>}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTemplate({
                    ...selected,
                    categoria_id:
                      selected.categoria_id ??
                      categoriasMap.get(selected.tipo_processo)?.id ??
                      null,
                  });
                  setOpenTemplate(true);
                }}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" /> Editar template
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tarefas do processo</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setEditingTarefa({ prazo_dias: 0, prioridade: "normal" });
                setOpenTarefa(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Adicionar tarefa
            </Button>
          </CardHeader>
          <CardContent>
            {loadingTarefas ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tarefas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma tarefa cadastrada. Clique em "Adicionar tarefa".
              </p>
            ) : (
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
                      </div>
                      {t.descricao && <p className="text-xs text-muted-foreground mt-1">{t.descricao}</p>}
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1.5">
                        <span>Prazo: D{t.prazo_dias >= 0 ? "+" : ""}{t.prazo_dias}</span>
                        {t.responsavel_role && <span>Resp: {t.responsavel_role}</span>}
                        {t.accountable_role && <span>Acc: {t.accountable_role}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingTarefa(t);
                          setOpenTarefa(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeletingTarefa(t)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog tarefa */}
        <Dialog open={openTarefa} onOpenChange={(o) => { setOpenTarefa(o); if (!o) setEditingTarefa(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTarefa?.id ? "Editar" : "Nova"} tarefa</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Título *</Label>
                <Input
                  value={editingTarefa?.titulo ?? ""}
                  onChange={(e) => setEditingTarefa({ ...editingTarefa, titulo: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editingTarefa?.descricao ?? ""}
                  onChange={(e) => setEditingTarefa({ ...editingTarefa, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Área</Label>
                  <Select
                    value={editingTarefa?.area_destino ?? ""}
                    onValueChange={(v) => setEditingTarefa({ ...editingTarefa, area_destino: v })}
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
                    value={editingTarefa?.prioridade ?? "normal"}
                    onValueChange={(v) => setEditingTarefa({ ...editingTarefa, prioridade: v })}
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
                    value={editingTarefa?.responsavel_role ?? ""}
                    onValueChange={(v) => setEditingTarefa({ ...editingTarefa, responsavel_role: v })}
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
                    value={editingTarefa?.accountable_role ?? ""}
                    onValueChange={(v) => setEditingTarefa({ ...editingTarefa, accountable_role: v })}
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
                    value={editingTarefa?.prazo_dias ?? 0}
                    onChange={(e) => setEditingTarefa({ ...editingTarefa, prazo_dias: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={editingTarefa?.ordem ?? tarefas.length + 1}
                    onChange={(e) => setEditingTarefa({ ...editingTarefa, ordem: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingTarefa?.bloqueante ?? false}
                  onCheckedChange={(v) => setEditingTarefa({ ...editingTarefa, bloqueante: v })}
                />
                <Label className="cursor-pointer">Tarefa bloqueante / legal</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenTarefa(false)}>Cancelar</Button>
              <Button onClick={salvarTarefa} className="gap-2"><Save className="h-4 w-4" /> Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog template (edit) */}
        <TemplateDialog
          open={openTemplate}
          onOpenChange={setOpenTemplate}
          template={editingTemplate}
          setTemplate={setEditingTemplate}
          onSave={salvarTemplate}
          categorias={categoriasAtivas}
        />

        <AlertDialog open={!!deletingTarefa} onOpenChange={(o) => !o && setDeletingTarefa(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover tarefa?</AlertDialogTitle>
              <AlertDialogDescription>
                "{deletingTarefa?.titulo}" será removida do template.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={excluirTarefa} className="bg-destructive text-destructive-foreground">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Lista de templates
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1A4A3A" }}>
            Templates de Processos
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure os fluxos de processos da empresa por categoria
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingCategoria(null);
              setOpenCategoria(true);
            }}
            className="gap-2"
          >
            <FolderPlus className="h-4 w-4" /> Nova Categoria
          </Button>
          <Button
            onClick={() => {
              setEditingTemplate({
                ativo: true,
                tipo_colaborador: "ambos",
                categoria_id: categoriasAtivas[0]?.id ?? null,
              });
              setOpenTemplate(true);
            }}
            className="gap-2"
            style={{ backgroundColor: "#1A4A3A" }}
          >
            <Plus className="h-4 w-4" /> Novo template
          </Button>
        </div>
      </div>

      {/* Categorias colapsáveis */}
      <Card>
        <Collapsible open={categoriasOpen} onOpenChange={setCategoriasOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">Categorias disponíveis</span>
                <Badge variant="outline">{categorias.length}</Badge>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  categoriasOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categorias.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: c.cor ?? "#1A4A3A" }}
                      />
                      <span className="font-medium text-sm truncate">{c.nome}</span>
                      {!c.ativo && (
                        <Badge variant="outline" className="text-[10px]">
                          inativa
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {c.modulo_origem} · {c.natureza}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      setEditingCategoria(c);
                      setOpenCategoria(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedId(t.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{t.nome}</h3>
                    {renderCategoriaBadge(t.categoria_id ?? t.tipo_processo)}
                    <Badge variant="outline">{t.tipo_colaborador}</Badge>
                    {!t.ativo && <Badge variant="destructive">Inativo</Badge>}
                  </div>
                  {t.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{t.descricao}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog
        open={openTemplate}
        onOpenChange={setOpenTemplate}
        template={editingTemplate}
        setTemplate={setEditingTemplate}
        onSave={salvarTemplate}
        categorias={categoriasAtivas}
      />

      <NovaCategoriaDialog
        open={openCategoria}
        onOpenChange={(o) => {
          setOpenCategoria(o);
          if (!o) setEditingCategoria(null);
        }}
        categoria={editingCategoria}
        onSaved={() => {
          void recarregarCategorias();
        }}
      />
    </div>
  );
}

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  template: Partial<Template> | null;
  setTemplate: (t: Partial<Template> | null) => void;
  onSave: () => void;
  categorias: ProcessoCategoria[];
}

function TemplateDialog({ open, onOpenChange, template, setTemplate, onSave, categorias }: TemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTemplate(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template?.id ? "Editar" : "Novo"} template</DialogTitle>
          <DialogDescription>Defina o nome e a categoria do processo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Nome *</Label>
            <Input
              value={template?.nome ?? ""}
              onChange={(e) => setTemplate({ ...template, nome: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={template?.descricao ?? ""}
              onChange={(e) => setTemplate({ ...template, descricao: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria *</Label>
              <Select
                value={template?.categoria_id ?? ""}
                onValueChange={(v) => setTemplate({ ...template, categoria_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.cor ?? "#1A4A3A" }}
                        />
                        {c.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de colaborador</Label>
              <Select
                value={template?.tipo_colaborador ?? "ambos"}
                onValueChange={(v) => setTemplate({ ...template, tipo_colaborador: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_COLABORADOR.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={template?.ativo ?? true}
              onCheckedChange={(v) => setTemplate({ ...template, ativo: v })}
            />
            <Label className="cursor-pointer">Ativo</Label>
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
