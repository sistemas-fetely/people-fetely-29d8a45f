import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type CategoriaOption = {
  id: string;
  codigo: string;
  nome: string;
  nivel: number;
  parent_id: string | null;
};

interface Props {
  options: CategoriaOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Se true, permite valor null (raiz). */
  allowNull?: boolean;
}

export function CategoriaCombobox({
  options,
  value,
  onChange,
  placeholder = "Selecione uma categoria",
  disabled,
  allowNull,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  // Sort by codigo to keep hierarchy order
  const sorted = [...options].sort((a, b) =>
    a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">
              <span className="font-mono text-xs text-muted-foreground mr-2">
                {selected.codigo}
              </span>
              {selected.nome}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command
          filter={(value, search) => {
            const opt = sorted.find((o) => o.id === value);
            if (!opt) return 0;
            const hay = (opt.codigo + " " + opt.nome).toLowerCase();
            return hay.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por código ou nome..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
            <CommandGroup>
              {allowNull && (
                <CommandItem
                  value=""
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === null ? "opacity-100" : "opacity-0")}
                  />
                  <span className="text-muted-foreground italic">Nenhum (raiz)</span>
                </CommandItem>
              )}
              {sorted.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.id}
                  onSelect={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div
                    className="flex-1 truncate"
                    style={{ paddingLeft: `${(opt.nivel - 1) * 12}px` }}
                  >
                    <span className="font-mono text-xs text-muted-foreground mr-2">
                      {opt.codigo}
                    </span>
                    {opt.nome}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
