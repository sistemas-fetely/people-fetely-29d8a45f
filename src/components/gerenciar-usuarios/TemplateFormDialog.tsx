import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Lock, Loader2 } from "lucide-react";
import { usePerfisV2 } from "@/hooks/usePerfisV2";
import { useUnidades } from "@/hooks/useUnidades";
import {
  useTemplateCompleto, useCreateTemplate, useUpdateTemplate,
  type PerfilTemplate,
} from "@/hooks/useTemplates";
import { NIVEL_LABELS_V2 } from "@/types/permissoes-v2";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string | null;
}

const NIVEIS = ["estagio", "assistente", "analista", "coordenador", "gerente", "diretor"] as const;

export function TemplateFormDialog({ open, onOpenChange, templateId }: Props) {
  const isNovo = templateId === null;
  const { data: completo, isLoading } = useTemplateCompleto(templateId);
  const { data: perfisDisponiveis } = usePerfisV2();
  const { data: unidades } = useUnidades();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nivelSugerido, setNivelSugerido] = useState("");
  const [perfisSelecionados, setPerfisSelecionados] = useState<PerfilTemplate[]>([]);

  const isSistema = completo?.is_sistema ?? false;

  useEffect(() => {
    if (open) {
      if (completo) {
        setCodigo(completo.codigo);
        setNome(completo.nome);
        setDescricao(completo.descricao || "");
        setNivelSugerido(completo.nivel_sugerido || "");
        setPerfisSelecionados(completo.perfis || []);
      } else if (isNovo) {
        setCodigo("");
        setNome("");
        setDescricao("");
        setNivelSugerido("");
        setPerfisSelecionados([]);
      }
    }
  }, [open, completo, isNovo]);

  const togglePerfil = (perfilId: string) => {
    setPerfisSelecionados((prev) => {
      const idx = prev.findIndex((p) => p.perfil_id === perfilId);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { perfil_id: perfilId, escopo_unidade_id: null, nivel_override: null }];
    });
  };

  const setEscopoUnidade = (perfilId: string, unidadeId: string | null) => {
    setPerfisSelecionados((prev) =>
      prev.map((p) => (p.perfil_id === perfilId ? { ...p, escopo_unidade_id: unidadeId } : p))
    );
  };

  const setNivelOverride = (perfilId: string, nivel: string | null) => {
    setPerfisSelecionados((prev) =>
      prev.map((p) => (p.perfil_id === perfilId ? { ...p, nivel_override: nivel } : p))
    );
  };

  const handleSalvar = () => {
    if (!nome.trim()) return;

    if (isNovo) {
      const codigoAuto = codigo.trim() || nome.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      createMutation.mutate({
        codigo: codigoAuto,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        nivel_sugerido: nivelSugerido || null,
        perfis: perfisSelecionados,
      }, {
        onSuccess: () => onOpenChange(false),
      });
    } else if (templateId) {
      updateMutation.mutate({
        id: templateId,
        is_sistema: isSistema,
        codigo: codigo.trim(),
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        nivel_sugerido: nivelSugerido || null,
        perfis: perfisSelecionados,
      }, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const salvando = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isNovo ? "Novo Template" : `Editar: ${completo?.nome || "…"}`}
            {isSistema && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Lock className="h-3 w-3" /> Sistema
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isSistema
              ? "Templates de sistema só permitem editar descrição e perfis. Nome, código e nível são imutáveis."
              : "Defina o conjunto de perfis que este template vai aplicar ao criar um usuário."}
          </DialogDescription>
        </DialogHeader>

        {isLoading && !isNovo ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Código{isSistema ? "" : " *"}</Label>
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  disabled={isSistema}
                  placeholder="ex: designer_jr"
                />
                {!isSistema && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Se vazio, gerado a partir do nome.
                  </p>
                )}
              </div>
              <div>
                <Label>Nome{isSistema ? "" : " *"}</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={isSistema}
                  placeholder="ex: Designer Jr"
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Para que serve este template?"
                rows={2}
              />
            </div>

            <div>
              <Label>Nível sugerido{isSistema ? "" : " *"}</Label>
              <Select
                value={nivelSugerido || "__none__"}
                onValueChange={(v) => setNivelSugerido(v === "__none__" ? "" : v)}
                disabled={isSistema}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(nenhum)</SelectItem>
                  {NIVEIS.map((n) => (
                    <SelectItem key={n} value={n}>{NIVEL_LABELS_V2[n] || n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Perfis incluídos no template</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Marque os perfis que serão aplicados. Perfis de área usam a unidade do cadastro
                a menos que você fixe uma unidade específica.
              </p>
              <div className="space-y-2">
                {(perfisDisponiveis || []).map((p) => {
                  const selecionado = perfisSelecionados.find((x) => x.perfil_id === p.id);
                  const ehSelecionado = !!selecionado;
                  const isArea = p.tipo === "area";
                  return (
                    <Card key={p.id} className={ehSelecionado ? "border-primary bg-primary/5" : ""}>
                      <div className="p-3 flex items-start gap-3">
                        <Checkbox
                          checked={ehSelecionado}
                          onCheckedChange={() => togglePerfil(p.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{p.nome}</span>
                            <Badge variant="outline" className="text-[9px]">
                              {p.tipo === "transversal" ? "transversal" : "área"}
                            </Badge>
                          </div>
                          {p.descricao && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{p.descricao}</p>
                          )}
                          {ehSelecionado && isArea && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px]">Unidade fixa (opcional)</Label>
                                <Select
                                  value={selecionado.escopo_unidade_id || "__cadastro__"}
                                  onValueChange={(v) => setEscopoUnidade(p.id, v === "__cadastro__" ? null : v)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Da unidade do cadastro" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__cadastro__">Da unidade do cadastro</SelectItem>
                                    {(unidades || []).map((u) => (
                                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[10px]">Nível override (opcional)</Label>
                                <Select
                                  value={selecionado.nivel_override || "__template__"}
                                  onValueChange={(v) => setNivelOverride(p.id, v === "__template__" ? null : v)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Do nível do template" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__template__">Do nível do template</SelectItem>
                                    {NIVEIS.map((n) => (
                                      <SelectItem key={n} value={n}>{NIVEL_LABELS_V2[n] || n}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {perfisSelecionados.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-xs">
                <AlertCircle className="h-3 w-3" />
                Template sem perfis vai só registrar origem, sem aplicar nada.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando || !nome.trim()}>
            {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isNovo ? "Criar template" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
