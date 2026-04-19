import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Loader2, FileText, Info, Plus, Pencil, Power, Trash2, Lock, MoreHorizontal } from "lucide-react";
import { useTemplates, useToggleTemplateAtivo, useDeleteTemplate } from "@/hooks/useTemplates";
import { NIVEL_LABELS_V2 } from "@/types/permissoes-v2";
import { TemplateFormDialog } from "./TemplateFormDialog";

export function TemplatesTab() {
  const { data: templates, isLoading } = useTemplates(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

  const toggleAtivo = useToggleTemplateAtivo();
  const deleteMut = useDeleteTemplate();

  const { data: itensPorTemplate } = useQuery({
    queryKey: ["template-itens-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cargo_template_perfis")
        .select("template_id, perfil_id, perfis!perfil_id (nome, tipo)");
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const perfisDoTemplate = (templateId: string): { nome: string; tipo: string }[] =>
    (itensPorTemplate || [])
      .filter((i: any) => i.template_id === templateId)
      .map((i: any) => ({ nome: i.perfis?.nome || "?", tipo: i.perfis?.tipo || "" }));

  const abrirNovo = () => { setEditingId(null); setFormOpen(true); };
  const abrirEditar = (id: string) => { setEditingId(id); setFormOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 flex-1">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Templates aplicam um conjunto padrão de perfis ao cadastrar nova pessoa.
            Templates marcados como <Badge variant="outline" className="gap-1 text-[10px] mx-1 inline-flex"><Lock className="h-2.5 w-2.5" /> Sistema</Badge>
            têm nome/código fixos — você pode editar apenas descrição e perfis.
          </p>
        </div>
        <Button onClick={abrirNovo} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(templates || []).map((t) => {
          const perfis = perfisDoTemplate(t.id);
          const nivelLabel = t.nivel_sugerido
            ? (NIVEL_LABELS_V2 as Record<string, string>)[t.nivel_sugerido] || t.nivel_sugerido
            : null;
          return (
            <Card key={t.id} className={!t.ativo ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold leading-tight">{t.nome}</p>
                        {t.is_sistema && (
                          <Badge variant="outline" className="gap-1 text-[9px]">
                            <Lock className="h-2.5 w-2.5" /> Sistema
                          </Badge>
                        )}
                        {!t.ativo && (
                          <Badge variant="secondary" className="text-[9px]">Inativo</Badge>
                        )}
                      </div>
                      {t.descricao && (
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t.descricao}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {nivelLabel && (
                      <Badge variant="outline" className="text-[10px]">{nivelLabel}</Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEditar(t.id)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleAtivo.mutate({ id: t.id, ativo: !t.ativo })}
                        >
                          <Power className="h-4 w-4 mr-2" />
                          {t.ativo ? "Inativar" : "Ativar"}
                        </DropdownMenuItem>
                        {!t.is_sistema && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget({ id: t.id, nome: t.nome })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Inclui os perfis:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {perfis.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Sem perfis amarrados</span>
                  ) : (
                    perfis.map((p, i) => (
                      <Badge key={i} variant="secondary" className="text-[11px] font-normal">
                        {p.nome}
                      </Badge>
                    ))
                  )}
                  <Badge variant="outline" className="text-[11px] font-normal border-dashed">
                    + área escolhida no cadastro
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TemplateFormDialog open={formOpen} onOpenChange={setFormOpen} templateId={editingId} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template <strong>{deleteTarget?.nome}</strong> será removido permanentemente.
              Esta ação é bloqueada pelo banco se houver usuários ou cargos que dependem dele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMut.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
