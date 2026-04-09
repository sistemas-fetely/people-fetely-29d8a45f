import { useState } from "react";
import { useAllParametros } from "@/hooks/useParametros";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Monitor, Package, Settings2, FileText } from "lucide-react";
import type { Parametro } from "@/hooks/useParametros";

interface CategoriaConfig {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const CATEGORIAS_GERAL: CategoriaConfig[] = [
  { value: "departamento", label: "Departamentos", icon: Monitor, description: "Departamentos da empresa para rateio de custos" },
  { value: "local_trabalho", label: "Locais de Trabalho", icon: Monitor, description: "Locais de trabalho disponíveis para colaboradores" },
  { value: "sistema", label: "Sistemas", icon: Monitor, description: "Sistemas de acesso para colaboradores" },
];

const CATEGORIAS_CLT: CategoriaConfig[] = [
  { value: "cargo", label: "Cargos", icon: Package, description: "Cargos disponíveis para colaboradores" },
  { value: "tipo_contrato", label: "Tipos de Contrato", icon: Settings2, description: "Modalidades de contrato CLT conforme legislação" },
  { value: "jornada", label: "Jornadas", icon: Settings2, description: "Jornadas de trabalho e escalas" },
  { value: "tipo_equipamento", label: "Tipos de Equipamento", icon: Package, description: "Tipos de equipamentos disponíveis" },
  { value: "estado_equipamento", label: "Estados de Equipamento", icon: Settings2, description: "Condições dos equipamentos" },
  { value: "encargo_folha", label: "Encargos Folha", icon: FileText, description: "Alíquotas de FGTS, INSS Patronal, VT e dedução IRRF" },
  { value: "inss_faixa", label: "Faixas INSS", icon: FileText, description: "Faixas progressivas de contribuição INSS do empregado" },
  { value: "irrf_faixa", label: "Faixas IRRF", icon: FileText, description: "Faixas progressivas do Imposto de Renda Retido na Fonte" },
];

const CATEGORIAS_PJ: CategoriaConfig[] = [
  { value: "tipo_servico", label: "Tipos de Serviço PJ", icon: Package, description: "Tipos de serviço para contratos PJ" },
  { value: "forma_pagamento", label: "Formas de Pagamento", icon: Settings2, description: "Formas de pagamento para prestadores PJ" },
];

const MODULO_MAP: Record<string, { title: string; categorias: CategoriaConfig[] }> = {
  geral: { title: "Parâmetros Gerais", categorias: CATEGORIAS_GERAL },
  clt: { title: "Parâmetros CLT", categorias: CATEGORIAS_CLT },
  pj: { title: "Parâmetros PJ", categorias: CATEGORIAS_PJ },
};

function ParametroForm({
  open, onClose, parametro, categoria,
}: {
  open: boolean;
  onClose: () => void;
  parametro: Parametro | null;
  categoria: string;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [valor, setValor] = useState(parametro?.valor || "");
  const [label, setLabel] = useState(parametro?.label || "");
  const [descricao, setDescricao] = useState(parametro?.descricao || "");
  const [ordem, setOrdem] = useState(parametro?.ordem ?? 0);

  const handleSave = async () => {
    if (!label.trim()) { toast.error("O nome é obrigatório"); return; }
    const valorFinal = valor.trim() || label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    setSaving(true);
    try {
      if (parametro) {
        const { error } = await supabase
          .from("parametros")
          .update({ valor: valorFinal, label: label.trim(), descricao: descricao.trim() || null, ordem } as any)
          .eq("id", parametro.id);
        if (error) throw error;
        toast.success("Parâmetro atualizado!");
      } else {
        const { error } = await supabase
          .from("parametros")
          .insert({ categoria, valor: valorFinal, label: label.trim(), descricao: descricao.trim() || null, ordem } as any);
        if (error) throw error;
        toast.success("Parâmetro adicionado!");
      }
      queryClient.invalidateQueries({ queryKey: ["parametros"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parametro ? "Editar Parâmetro" : "Novo Parâmetro"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Google Workspace" />
          </div>
          <div className="space-y-2">
            <Label>Código (valor)</Label>
            <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Auto-gerado se vazio" />
            <p className="text-xs text-muted-foreground">Identificador interno. Se vazio, será gerado a partir do nome.</p>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição opcional" />
          </div>
          <div className="space-y-2">
            <Label>Ordem de exibição</Label>
            <Input type="number" value={ordem} onChange={(e) => setOrdem(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Parametros() {
  const [searchParams] = useSearchParams();
  const modulo = searchParams.get("modulo") || "geral";
  const config = MODULO_MAP[modulo] || MODULO_MAP.geral;
  const CATEGORIAS = config.categorias;

  const { data: allParams, isLoading } = useAllParametros();
  const queryClient = useQueryClient();
  const [editParam, setEditParam] = useState<Parametro | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formCategoria, setFormCategoria] = useState(CATEGORIAS[0]?.value || "");
  const [deleteTarget, setDeleteTarget] = useState<Parametro | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleToggleAtivo = async (param: Parametro) => {
    const { error } = await supabase
      .from("parametros")
      .update({ ativo: !param.ativo } as any)
      .eq("id", param.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    queryClient.invalidateQueries({ queryKey: ["parametros"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("parametros").delete().eq("id", deleteTarget.id);
    if (error) { toast.error(error.message); }
    else { toast.success("Parâmetro removido"); }
    queryClient.invalidateQueries({ queryKey: ["parametros"] });
    setDeleteTarget(null);
    setDeleting(false);
  };

  const openNew = (cat: string) => {
    setEditParam(null);
    setFormCategoria(cat);
    setFormOpen(true);
  };

  const openEdit = (param: Parametro) => {
    setEditParam(param);
    setFormCategoria(param.categoria);
    setFormOpen(true);
  };

  const grouped = CATEGORIAS.map((cat) => ({
    ...cat,
    items: (allParams || []).filter((p) => p.categoria === cat.value),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie as opções disponíveis nas listas de cadastro
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue={CATEGORIAS[0]?.value}>
          <TabsList className="flex-wrap h-auto">
            {CATEGORIAS.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="gap-2">
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {grouped.map((cat) => (
            <TabsContent key={cat.value} value={cat.value}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">{cat.label}</CardTitle>
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                  </div>
                  <Button onClick={() => openNew(cat.value)} className="gap-2" size="sm">
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </CardHeader>
                <CardContent>
                  {cat.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum parâmetro cadastrado nesta categoria.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cat.items.map((param) => (
                        <div
                          key={param.id}
                          className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Switch
                              checked={param.ativo}
                              onCheckedChange={() => handleToggleAtivo(param)}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{param.label}</span>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {param.valor}
                                </Badge>
                                {!param.ativo && (
                                  <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                                )}
                              </div>
                              {param.descricao && (
                                <p className="text-xs text-muted-foreground truncate">{param.descricao}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(param)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(param)}
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
            </TabsContent>
          ))}
        </Tabs>
      )}

      {formOpen && (
        <ParametroForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          parametro={editParam}
          categoria={formCategoria}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir parâmetro?</AlertDialogTitle>
            <AlertDialogDescription>
              O parâmetro "{deleteTarget?.label}" será removido permanentemente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
