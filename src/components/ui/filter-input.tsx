import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FilterInputProps
  extends React.ComponentPropsWithoutRef<typeof Input> {
  /** Quando truthy, aplica o destaque visual de filtro ativo. */
  active?: boolean;
}

/**
 * Input que ganha destaque visual (borda + halo bordô) quando há valor.
 * Use em filtros: o destaque deixa claro que a listagem está restrita.
 */
export const FilterInput = React.forwardRef<HTMLInputElement, FilterInputProps>(
  ({ value, active, className, ...props }, ref) => {
    const isActive =
      active ?? (value !== undefined && value !== null && String(value).length > 0);
    return (
      <Input
        ref={ref}
        value={value}
        className={cn(
          isActive && "border-admin bg-admin/5 ring-1 ring-admin/30",
          className
        )}
        {...props}
      />
    );
  }
);
FilterInput.displayName = "FilterInput";
