import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useEstruturaOrganizacional, type Departamento } from "@/hooks/useEstruturaOrganizacional";

interface Props {
  /** ID do departamento (FK) — preferencial */
  valueId?: string | null;
  /** Label do departamento (legado — usado se valueId não bate) */
  valueTexto?: string | null;
  /** Chamado quando usuário escolhe. Entrega o objeto completo para preencher FK + TEXT. */
  onChange: (dep: Departamento | null) => void;
  /** Desabilita o select */
  disabled?: boolean;
  placeholder?: string;
}

export function SelectDepartamentoHierarquico({
  valueId,
  valueTexto,
  onChange,
  disabled,
  placeholder = "Selecione o departamento",
}: Props) {
  const { data: estrutura, isLoading } = useEstruturaOrganizacional();

  const mapPorId = useMemo(() => {
    const m = new Map<string, Departamento>();
    (estrutura || []).forEach((a) =>
      a.departamentos.forEach((d) => m.set(d.id, d))
    );
    return m;
  }, [estrutura]);

  const displayLabel = useMemo(() => {
    if (valueId && mapPorId.has(valueId)) {
      return mapPorId.get(valueId)!.label;
    }
    return valueTexto || "";
  }, [valueId, valueTexto, mapPorId]);

  const handleChange = (novoId: string) => {
    const dep = mapPorId.get(novoId) || null;
    onChange(dep);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm h-10 px-3 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando departamentos...
      </div>
    );
  }

  return (
    <Select value={valueId || ""} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {displayLabel || placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {(estrutura || []).map((area) => (
          <SelectGroup key={area.id}>
            <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              {area.label}
            </SelectLabel>
            {area.departamentos.length === 0 ? (
              <div className="px-2 py-1 text-xs text-muted-foreground italic">
                Sem departamentos
              </div>
            ) : (
              area.departamentos.map((d) => (
                <SelectItem key={d.id} value={d.id} className="pl-6">
                  {d.label}
                </SelectItem>
              ))
            )}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
