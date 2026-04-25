import * as React from "react";
import { SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterSelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectTrigger> {
  /** Quando true, aplica o destaque de filtro ativo. */
  active?: boolean;
}

/**
 * SelectTrigger com destaque visual quando o filtro está ativo.
 * O componente Select continua sendo controlado normalmente — quem decide se
 * está ativo é quem usa (geralmente comparando contra o valor "todos").
 *
 *   <Select value={status} onValueChange={setStatus}>
 *     <FilterSelectTrigger active={status !== "todos"}>...
 */
export const FilterSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  FilterSelectTriggerProps
>(({ active, className, children, ...props }, ref) => (
  <SelectTrigger
    ref={ref}
    className={cn(
      active && "border-admin bg-admin/5 ring-1 ring-admin/30",
      className
    )}
    {...props}
  >
    {children}
  </SelectTrigger>
));
FilterSelectTrigger.displayName = "FilterSelectTrigger";
