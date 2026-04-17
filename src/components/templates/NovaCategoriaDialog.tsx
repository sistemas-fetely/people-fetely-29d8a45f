import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MODULOS_ORIGEM,
  NATUREZAS,
  ICONES_DISPONIVEIS,
  CORES_PALETA,
  slugify,
  type ProcessoCategoria,
} from "@/hooks/useProcessosCategorias";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  categoria?: ProcessoCategoria | null;
}

export function NovaCategoriaDialog({ open, onOpenChange, onSaved, categoria }: Props) {
  const isEdit = !!categoria?.id;
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [moduloOrigem, setModuloOrigem] = useState("people");
  const [natureza, setNatureza] = useState("lista_tarefas");
  const [icone, setIcone] = useState("workflow");
  const [cor, setCor] = useState("#1A4A3A");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(categoria?.nome ?? "");
      setSlug(categoria?.slug ?? "");
      setSlugTouched(!!categoria?.slug);
      setDescricao(categoria?.descricao ?? "");
      setModuloOrigem(categoria?.modulo_origem ?? "people");
      setNatureza(categoria?.natureza ?? "lista_tarefas");
      setIcone(categoria?.icone ?? "workflow");
      setCor(categoria?.cor ?? "#1A4A3A");
    }
  }, [open, categoria]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(nome));
  }, [nome, slugTouched]);

  const salvar = async () => {
    if (!nome.trim() || !slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      nome: nome.trim(),
      slug: slug.trim(),
      descricao: descricao.trim() || null,
      modulo_origem: moduloOrigem,
      natureza,
      icone,
      cor,
    };
    const { error } = isEdit
      ? await (supabase as any)
          .from("sncf_processos_categorias")
          .update(payload)
          .eq("id", categoria!.id)
      : await (supabase as any).from("sncf_processos_categorias").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success(isEdit ? "Categoria atualizada" : "Categoria criada");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar" : "Nova"} categoria de processo</DialogTitle>
          <DialogDescription>
            Categorias agrupam tipos de processo (ex.: Onboarding, Aprovação de Compra).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label>Nome *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Aprovação de Compra"
            />
          </div>

          <div>
            <Label>Slug *</Label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="aprovacao_de_compra"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Identificador interno, sem espaços ou acentos.
            </p>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Módulo de origem</Label>
              <Select value={moduloOrigem} onValueChange={setModuloOrigem}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULOS_ORIGEM.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ícone</Label>
              <Select value={icone} onValueChange={setIcone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICONES_DISPONIVEIS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Natureza</Label>
            <div className="grid gap-2 mt-1.5">
              {NATUREZAS.map((n) => {
                const selected = natureza === n.value;
                return (
                  <button
                    key={n.value}
                    type="button"
                    disabled={!n.enabled}
                    onClick={() => n.enabled && setNatureza(n.value)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    } ${!n.enabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className="text-xl">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{n.label}</span>
                        {!n.enabled && (
                          <Badge variant="outline" className="text-[10px]">
                            em breve
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {n.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap mt-1.5">
              {CORES_PALETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    cor === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <Input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="h-8 w-12 p-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
