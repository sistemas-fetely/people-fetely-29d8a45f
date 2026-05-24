import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function formatMoedaBR(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseMoedaBR(raw: string): number {
  const clean = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return parseFloat(clean) || 0;
}

export function InputMoedaBR({
  value,
  onChange,
  disabled,
  invalid,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => (value > 0 ? formatMoedaBR(value) : ""));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) setDisplay(value > 0 ? formatMoedaBR(value) : "");
  }, [value, isFocused]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          setDisplay(e.target.value);
          onChange(parseMoedaBR(e.target.value));
        }}
        onFocus={() => {
          setIsFocused(true);
          if (value > 0) setDisplay(value.toFixed(2).replace(".", ","));
        }}
        onBlur={() => {
          setIsFocused(false);
          setDisplay(value > 0 ? formatMoedaBR(value) : "");
        }}
        disabled={disabled}
        placeholder="0,00"
        className={cn("pl-10 h-8", invalid && "border-destructive", className)}
      />
    </div>
  );
}
