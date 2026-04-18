import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ConhecimentoSugerido = {
  titulo: string;
  categoria: string;
  conteudo: string;
  tags?: string[];
  pagina_origem?: number;
  publico_alvo_sugerido?: string;
  incluir?: boolean;
};

const CATEGORIAS = [
  { value: "politica", label: "Política", color: "#92400E", bg: "#FEF3C7" },
  { value: "regra", label: "Regra", color: "#991B1B", bg: "#FEE2E2" },
  { value: "diretriz", label: "Diretriz", color: "#1E40AF", bg: "#DBEAFE" },
  { value: "faq", label: "FAQ", color: "#374151", bg: "#E5E7EB" },
  { value: "conceito", label: "Conceito", color: "#5B21B6", bg: "#EDE9FE" },
  { value: "manifesto", label: "Manifesto", color: "#FFFFFF", bg: "#1A4A3A" },
  { value: "mercado", label: "Mercado", color: "#FFFFFF", bg: "#E8833A" },
];

const PUBLICOS = [
  { value: "todos", label: "Todos" },
  { value: "admin_rh", label: "Admin RH" },
  { value: "gestores", label: "Gestores" },
  { value: "colaboradores", label: "Colaboradores" },
  { value: "financeiro", label: "Financeiro" },
  { value: "ti", label: "TI" },
];

interface Props {
  conhecimento: ConhecimentoSugerido;
  index: number;
  onChange: (novo: ConhecimentoSugerido) => void;
  onRemover: () => void;
}

export function ConhecimentoSugeridoCard({ conhecimento, index, onChange, onRemover }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const incluir = conhecimento.incluir !== false;
  const cat = CATEGORIAS.find((c) => c.value === conhecimento.categoria) ?? CATEGORIAS[3];

  function adicionarTag() {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    const tags = conhecimento.tags || [];
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    onChange({ ...conhecimento, tags: [...tags, t] });
    setTagInput("");
  }

  function removerTag(t: string) {
    onChange({
      ...conhecimento,
      tags: (conhecimento.tags || []).filter((x) => x !== t),
    });
  }

  return (
    <Card className={`p-3 transition-opacity ${incluir ? "" : "opacity-50"}`}>
      <div className="flex items-start gap-2">
        <Checkbox
          checked={incluir}
          onCheckedChange={(v) => onChange({ ...conhecimento, incluir: !!v })}
          className="mt-1"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start gap-2 flex-wrap">
            <Input
              value={conhecimento.titulo}
              onChange={(e) => onChange({ ...conhecimento, titulo: e.target.value })}
              className="flex-1 min-w-[200px] h-8 text-sm font-medium"
              disabled={!incluir}
              placeholder="Título do conhecimento"
            />
            <Badge
              style={{ backgroundColor: cat.bg, color: cat.color, border: 0 }}
              className="text-[10px] uppercase tracking-wide shrink-0"
            >
              {cat.label}
            </Badge>
            {conhecimento.pagina_origem && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                pág. {conhecimento.pagina_origem}
              </Badge>
            )}
          </div>

          {!expandido && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {conhecimento.conteudo}
            </p>
          )}

          {expandido && (
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Conteúdo</Label>
                <Textarea
                  value={conhecimento.conteudo}
                  onChange={(e) => onChange({ ...conhecimento, conteudo: e.target.value })}
                  rows={6}
                  className="text-sm"
                  disabled={!incluir}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select
                    value={conhecimento.categoria}
                    onValueChange={(v) => onChange({ ...conhecimento, categoria: v })}
                    disabled={!incluir}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Público alvo</Label>
                  <Select
                    value={conhecimento.publico_alvo_sugerido || "todos"}
                    onValueChange={(v) => onChange({ ...conhecimento, publico_alvo_sugerido: v })}
                    disabled={!incluir}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLICOS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        adicionarTag();
                      }
                    }}
                    placeholder="Pressione Enter para adicionar"
                    className="h-8 text-sm flex-1"
                    disabled={!incluir}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={adicionarTag}
                    disabled={!incluir}
                  >
                    +
                  </Button>
                </div>
                {(conhecimento.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(conhecimento.tags || []).map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-muted px-2 py-0.5 rounded-full flex items-center gap-1"
                      >
                        #{t}
                        <button
                          onClick={() => removerTag(t)}
                          className="hover:text-destructive"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandido(!expandido)}
            className="h-7 w-7 p-0"
            type="button"
          >
            {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemover}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
