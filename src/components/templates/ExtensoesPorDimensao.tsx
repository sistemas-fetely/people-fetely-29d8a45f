import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, ChevronRight, ArrowLeft, Save, Loader2, Briefcase, Building2, Monitor,
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
import { useProcessosCategorias } from "@/hooks/useProcessosCategorias";

type Dimensao = "cargo" | "departamento" | "sistema";

interface Extensao {
  id: string;
  categoria_id: string;
  dimensao: Dimensao;
  referencia_id: string | null;
  referencia_label: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface ExtensaoTarefa {
  id: string;
  extensao_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  area_destino: string | null;
  sistema_origem: string | null;
  responsavel_role: string | null;
  accountable_role: string | null;
  prazo_dias: number;
  prioridade: string | null;
  bloqueante: boolean | null;
  motivo_bloqueio: string | null;
  link_acao: string | null;
}

interface ReferenciaItem {
  id: string;
  label: string;
}

const AREAS = ["RH", "TI", "Financeiro", "Gestão", "Geral", "Comercial", "Operacional"];
const ROLES = ["super_admin", "admin_rh", "gestor_rh", "admin_ti", "financeiro", "gestor_direto", "colaborador"];
const PRIORIDADES = ["urgente", "alta", "normal", "baixa"];

const DIMENSAO_CONFIG: Record<Dimensao, { titulo: string; ajuda: string; icon: any }> = {
  cargo: {
    titulo: "Extensões por Cargo",
    ajuda: "Adicione tarefas específicas que devem ser executadas para colaboradores de determinado cargo. Essas tarefas se SOMAM ao template base do processo.",
    icon: Briefcase,
  },
  departamento: {
    titulo: "Extensões por Departamento",
    ajuda: "Adicione tarefas específicas para colaboradores de um departamento. Essas tarefas se SOMAM ao template base do processo.",
    icon: Building2,
  },
  sistema: {
    titulo: "Extensões por Sistema",
    ajuda: "Adicione tarefas relacionadas ao acesso/uso de um sistema corporativo. Essas tarefas são adicionadas quando o colaborador tem acesso ao sistema.",
    icon: Monitor,
  },
};

interface Props {
  dimensao: Dimensao;
}

export function ExtensoesPorDimensao({ dimensao }: Props) {
  const config = DIMENSAO_CONFIG[dimensao];
  const Icon = config.icon;

  const { categorias } = useProcessosCategorias();
  const categoriasLista = useMemo(
    () => categorias.filter((c) => c.ativo && c.natureza === "lista_tarefas"),
    [categorias],
  );

  const [categoriaId, setCategoriaId] = useState<string>("");
  const [extensoes, setExtensoes] = useState<Extensao[]>([]);
  const [tarefasCount, setTarefasCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const [referencias, setReferencias] = useState<ReferenciaItem[]>([]);

  const [selectedExtId, setSelectedExtId] = useState<string | null>(null);
  const [tarefas, setTarefas] = useState<ExtensaoTarefa[]>([]);
  const [loadingTarefas, setLoadingTarefas] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingExt, setEditingExt] = useState<Partial<Extensao> | null>(null);

  const [openTarefaDialog, setOpenTarefaDialog] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Partial<ExtensaoTarefa> | null>(null);

  const [deletingExt, setDeletingExt] = useState<Extensao | null>(null);
  const [deletingTarefa, setDeletingTarefa] = useState<ExtensaoTarefa | null>(null);

  // Set default categoria
  useEffect(() => {
    if (!categoriaId && categoriasLista.length > 0) {
      setCategoriaId(categoriasLista[0].id);
    }
  }, [categoriasLista, categoriaId]);

  // Fetch references for the dimension
  useEffect(() => {
    let cancelled = false;
    async function fetchRefs() {
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
    }
    void fetchRefs();
    return () => { cancelled = true; };
  }, [dimensao]);

  const carregarExtensoes = useCallback(async () => {
    if (!categoriaId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("sncf_template_extensoes")
      .select("*")
      .eq("categoria_id", categoriaId)
      .eq("dimensao", dimensao)
      .order("referencia_label");
    if (error) {
      toast.error("Erro: " + error.message);
      setLoading(false);
      return;
    }
    const exts = (data ?? []) as Extensao[];
    setExtensoes(exts);

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
    setLoading(false);
  }, [categoriaId, dimensao]);

  useEffect(() => { void carregarExtensoes(); }, [carregarExtensoes]);

  const carregarTarefas = useCallback(async (extId: string) => {
    setLoadingTarefas(true);
    const { data, error } = await (supabase as any)
      .from("sncf_template_extensoes_tarefas")
      .select("*")
      .eq("extensao_id", extId)
      .order("ordem");
    if (error) toast.error("Erro: " + error.message);
    else setTarefas((data ?? []) as ExtensaoTarefa[]);
    setLoadingTarefas(false);
  }, []);

  useEffect(() => {
    if (selectedExtId) void carregarTarefas(selectedExtId);
    else setTarefas([]);
  }, [selectedExtId, carregarTarefas]);

  const selectedExt = useMemo(
    () => extensoes.find((e) => e.id === selectedExtId),
    [extensoes, selectedExtId],
  );

  const handleAbrirNovaExtensao = () => {
    setEditingExt({
      categoria_id: categoriaId,
      dimensao,
      ativo: true,
    });
    setOpenDialog(true);
  };

  const salvarExtensao = async () => {
    if (!editingExt?.referencia_id || !editingExt?.categoria_id) {
      toast.error("Selecione categoria e referência");
      return;
    }
    const ref = referencias.find((r) => r.id === editingExt.referencia_id);
    if (!ref) {
      toast.error("Referência inválida");
      return;
    }
    const nome = editingExt.nome || `Tarefas de ${dimensao} ${ref.label}`;

    const payload: any = {
      categoria_id: editingExt.categoria_id,
      dimensao,
      referencia_id: editingExt.referencia_id,
      referencia_label: ref.label,
      nome,
      descricao: editingExt.descricao ?? null,
      ativo: editingExt.ativo ?? true,
    };

    let novoId: string | null = null;
    if (editingExt.id) {
      const { error } = await (supabase as any)
        .from("sncf_template_extensoes")
        .update(payload)
        .eq("id", editingExt.id);
      if (error) {
        toast.error("Erro: " + error.message);
        return;
      }
      novoId = editingExt.id;
    } else {
      const { data: u } = await supabase.auth.getUser();
      payload.criado_por = u?.user?.id ?? null;
      const { data, error } = await (supabase as any)
        .from("sncf_template_extensoes")
        .insert(payload)
        .select("id")
        .single();
      if (error) {
        toast.error("Erro: " + error.message);
        return;
      }
      novoId = data.id;
    }

    toast.success("Extensão salva");
    setOpenDialog(false);
    setEditingExt(null);
    await carregarExtensoes();
    if (novoId && !editingExt.id) {
      // navega para edição da nova extensão
      setSelectedExtId(novoId);
    }
  };

  const excluirExtensao = async () => {
    if (!deletingExt) return;
    const { error } = await (supabase as any)
      .from("sncf_template_extensoes")
      .delete()
      .eq("id", deletingExt.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Extensão removida");
      setDeletingExt(null);
      void carregarExtensoes();
    }
  };

  const salvarTarefa = async () => {
    if (!selectedExtId || !editingTarefa?.titulo) {
      toast.error("Preencha o título");
      return;
    }
    const payload: any = {
      extensao_id: selectedExtId,
      ordem: editingTarefa.ordem ?? tarefas.length + 1,
      titulo: editingTarefa.titulo,
      descricao: editingTarefa.descricao ?? null,
      area_destino: editingTarefa.area_destino ?? null,
      sistema_origem: editingTarefa.sistema_origem ?? "people",
      responsavel_role: editingTarefa.responsavel_role ?? null,
      accountable_role: editingTarefa.accountable_role ?? null,
      prazo_dias: editingTarefa.prazo_dias ?? 0,
      prioridade: editingTarefa.prioridade ?? "normal",
      bloqueante: editingTarefa.bloqueante ?? false,
      motivo_bloqueio: editingTarefa.motivo_bloqueio ?? null,
      link_acao: editingTarefa.link_acao ?? null,
    };
    const { error } = editingTarefa.id
      ? await (supabase as any).from("sncf_template_extensoes_tarefas").update(payload).eq("id", editingTarefa.id)
      : await (supabase as any).from("sncf_template_extensoes_tarefas").insert(payload);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa salva");
      setOpenTarefaDialog(false);
      setEditingTarefa(null);
      void carregarTarefas(selectedExtId);
    }
  };

  const excluirTarefa = async () => {
    if (!deletingTarefa) return;
    const { error } = await (supabase as any)
      .from("sncf_template_extensoes_tarefas")
      .delete()
      .eq("id", deletingTarefa.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Tarefa removida");
      if (selectedExtId) void carregarTarefas(selectedExtId);
    }
    setDeletingTarefa(null);
  };

  // Editor de tarefas de uma extensão selecionada
  if (selectedExt) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedExtId(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" /> {selectedExt.nome}
                </CardTitle>
                {selectedExt.descricao && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedExt.descricao}</p>
                )}
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline">{selectedExt.dimensao}</Badge>
                  <Badge variant="outline">{selectedExt.referencia_label}</Badge>
                  {!selectedExt.ativo && <Badge variant="destructive">Inativa</Badge>}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingExt(selectedExt);
                  setOpenDialog(true);
                }}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" /> Editar extensão
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tarefas adicionais</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setEditingTarefa({ prazo_dias: 0, prioridade: "normal" });
                setOpenTarefaDialog(true);
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
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
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
                          setOpenTarefaDialog(true);
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

        <TarefaDialog
          open={openTarefaDialog}
          onOpenChange={(o) => { setOpenTarefaDialog(o); if (!o) setEditingTarefa(null); }}
          tarefa={editingTarefa}
          setTarefa={setEditingTarefa}
          ordemPadrao={tarefas.length + 1}
          onSave={salvarTarefa}
        />

        <ExtensaoDialog
          open={openDialog}
          onOpenChange={(o) => { setOpenDialog(o); if (!o) setEditingExt(null); }}
          dimensao={dimensao}
          extensao={editingExt}
          setExtensao={setEditingExt}
          categorias={categoriasLista}
          referencias={referencias}
          onSave={salvarExtensao}
        />

        <AlertDialog open={!!deletingTarefa} onOpenChange={(o) => !o && setDeletingTarefa(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover tarefa?</AlertDialogTitle>
              <AlertDialogDescription>"{deletingTarefa?.titulo}" será removida.</AlertDialogDescription>
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

  // Lista de extensões
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-start gap-3 bg-muted/30">
          <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">{config.ajuda}</p>
        </CardContent>
      </Card>

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <Label>Mostrar extensões para a categoria:</Label>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {categoriasLista.map((c) => (
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
        <Button
          onClick={handleAbrirNovaExtensao}
          disabled={!categoriaId}
          className="gap-2"
          style={{ backgroundColor: "#1A4A3A" }}
        >
          <Plus className="h-4 w-4" /> Nova Extensão
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : extensoes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Icon className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Nenhuma extensão por {dimensao} cadastrada para essa categoria.
            </p>
            <p className="text-xs mt-1">
              Crie uma extensão para adicionar tarefas específicas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {extensoes.map((ext) => (
            <Card
              key={ext.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedExtId(ext.id)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold truncate">{ext.referencia_label}</h3>
                    <Badge variant="outline">{tarefasCount[ext.id] || 0} tarefa{(tarefasCount[ext.id] || 0) === 1 ? "" : "s"}</Badge>
                    {!ext.ativo && <Badge variant="destructive">Inativa</Badge>}
                  </div>
                  {ext.descricao && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">{ext.descricao}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingExt(ext);
                      setOpenDialog(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingExt(ext);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExtensaoDialog
        open={openDialog}
        onOpenChange={(o) => { setOpenDialog(o); if (!o) setEditingExt(null); }}
        dimensao={dimensao}
        extensao={editingExt}
        setExtensao={setEditingExt}
        categorias={categoriasLista}
        referencias={referencias}
        onSave={salvarExtensao}
      />

      <AlertDialog open={!!deletingExt} onOpenChange={(o) => !o && setDeletingExt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover extensão?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingExt?.nome}" e todas as suas tarefas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirExtensao} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ExtensaoDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dimensao: Dimensao;
  extensao: Partial<Extensao> | null;
  setExtensao: (e: Partial<Extensao> | null) => void;
  categorias: { id: string; nome: string; cor: string | null }[];
  referencias: ReferenciaItem[];
  onSave: () => void;
}

function ExtensaoDialog({
  open, onOpenChange, dimensao, extensao, setExtensao, categorias, referencias, onSave,
}: ExtensaoDialogProps) {
  const isEdit = !!extensao?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar" : "Nova"} extensão por {dimensao}</DialogTitle>
          <DialogDescription>
            Tarefas dessa extensão serão somadas ao template base do processo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Categoria de processo *</Label>
            <Select
              value={extensao?.categoria_id ?? ""}
              onValueChange={(v) => setExtensao({ ...extensao, categoria_id: v })}
              disabled={isEdit}
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
            <Label>
              {dimensao === "cargo" ? "Cargo" : dimensao === "departamento" ? "Departamento" : "Sistema"} *
            </Label>
            <Select
              value={extensao?.referencia_id ?? ""}
              onValueChange={(v) => {
                const ref = referencias.find((r) => r.id === v);
                setExtensao({
                  ...extensao,
                  referencia_id: v,
                  referencia_label: ref?.label ?? "",
                  nome: extensao?.nome || `Tarefas de ${dimensao} ${ref?.label ?? ""}`,
                });
              }}
              disabled={isEdit}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {referencias.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nome da extensão</Label>
            <Input
              value={extensao?.nome ?? ""}
              onChange={(e) => setExtensao({ ...extensao, nome: e.target.value })}
              placeholder="Auto-gerado se em branco"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={extensao?.descricao ?? ""}
              onChange={(e) => setExtensao({ ...extensao, descricao: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={extensao?.ativo ?? true}
              onCheckedChange={(v) => setExtensao({ ...extensao, ativo: v })}
            />
            <Label className="cursor-pointer">Ativa</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} className="gap-2" style={{ backgroundColor: "#1A4A3A" }}>
            <Save className="h-4 w-4" /> {isEdit ? "Salvar" : "Criar e adicionar tarefas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TarefaDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tarefa: Partial<ExtensaoTarefa> | null;
  setTarefa: (t: Partial<ExtensaoTarefa> | null) => void;
  ordemPadrao: number;
  onSave: () => void;
}

function TarefaDialog({ open, onOpenChange, tarefa, setTarefa, ordemPadrao, onSave }: TarefaDialogProps) {
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
              onCheckedChange={(v) => setTarefa({ ...tarefa, bloqueante: v })}
            />
            <Label className="cursor-pointer">Tarefa bloqueante / legal</Label>
          </div>
          {tarefa?.bloqueante && (
            <div>
              <Label>Motivo do bloqueio</Label>
              <Input
                value={tarefa?.motivo_bloqueio ?? ""}
                onChange={(e) => setTarefa({ ...tarefa, motivo_bloqueio: e.target.value })}
                placeholder="Ex: Prazo legal, exigência fiscal..."
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} className="gap-2"><Save className="h-4 w-4" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
