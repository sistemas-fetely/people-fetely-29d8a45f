/**
 * Cards KPI compartilhados entre as abas (extraídos de CaixaBanco.tsx).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface CardKPIDuploProps {
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  cor: "fetely" | "blue" | "green" | "amber" | "red" | "purple";
  total: number;
  qtdTem: number;
  qtdFalta: number;
  ativoTem: boolean;
  ativoFalta: boolean;
  onClickTem: () => void;
  onClickFalta: () => void;
}

export function CardKPIDuplo({
  titulo,
  icone: Icone,
  total,
  qtdTem,
  qtdFalta,
  ativoTem,
  ativoFalta,
  onClickTem,
  onClickFalta,
}: CardKPIDuploProps) {
  const pctTem = total > 0 ? Math.round((qtdTem / total) * 100) : 0;
  const pctFalta = total > 0 ? Math.round((qtdFalta / total) * 100) : 0;
  return (
    <div className="border border-emerald-300 bg-emerald-50/30 rounded-lg overflow-hidden">
      <div className="px-3 pt-1.5 pb-0.5 flex items-center gap-1.5">
        <Icone className="h-3.5 w-3.5 text-emerald-700" />
        <span className="text-[11px] font-medium text-emerald-900">{titulo}</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-emerald-200">
        <button
          type="button"
          onClick={onClickTem}
          className={`px-3 py-1.5 text-left transition-colors ${
            ativoTem
              ? "bg-emerald-100 ring-2 ring-inset ring-emerald-500"
              : "hover:bg-emerald-50"
          }`}
        >
          <div className="text-[10px] text-emerald-700 font-medium">Tem</div>
          <div className="text-lg font-bold text-emerald-900 leading-tight">{pctTem}%</div>
          <div className="text-[10px] text-emerald-700">{qtdTem}/{total}</div>
        </button>
        <button
          type="button"
          onClick={onClickFalta}
          className={`px-3 py-1.5 text-left transition-colors ${
            ativoFalta
              ? "bg-rose-100 ring-2 ring-inset ring-rose-500"
              : "hover:bg-rose-50/60"
          }`}
        >
          <div className="text-[10px] text-rose-700 font-medium">Falta</div>
          <div className="text-lg font-bold text-rose-900 leading-tight">{pctFalta}%</div>
          <div className="text-[10px] text-rose-700">{qtdFalta}/{total}</div>
        </button>
      </div>
    </div>
  );
}

export function CardKPI({
  titulo,
  valor,
  sublinha,
  cor,
  ativo,
  onClick,
  icone: Icon,
}: {
  titulo: string;
  valor: string;
  sublinha: string;
  cor: "red" | "amber" | "blue" | "purple" | "teal" | "fetely";
  ativo: boolean;
  onClick: () => void;
  icone?: LucideIcon;
}) {
  const corBase: Record<string, string> = {
    red: "bg-red-50/70 border-red-200",
    amber: "bg-amber-50/70 border-amber-200",
    blue: "bg-blue-50/70 border-blue-200",
    purple: "bg-purple-50/70 border-purple-200",
    teal: "bg-teal-50/70 border-teal-200",
    fetely: "bg-emerald-50/70 border-emerald-200",
  };
  const corAtivo: Record<string, string> = {
    red: "bg-red-100 border-red-400 ring-2 ring-red-200",
    amber: "bg-amber-100 border-amber-400 ring-2 ring-amber-200",
    blue: "bg-blue-100 border-blue-400 ring-2 ring-blue-200",
    purple: "bg-purple-100 border-purple-400 ring-2 ring-purple-200",
    teal: "bg-teal-100 border-teal-400 ring-2 ring-teal-200",
    fetely: "bg-emerald-100 border-emerald-400 ring-2 ring-emerald-200",
  };
  const textMap: Record<string, string> = {
    red: "text-red-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    purple: "text-purple-700",
    teal: "text-teal-700",
    fetely: "text-emerald-700",
  };
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        ativo ? corAtivo[cor] : corBase[cor],
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-0.5 pt-2 px-3">
        <CardTitle
          className={cn(
            "text-[11px] font-normal flex items-center gap-1",
            ativo ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {Icon && <Icon className="h-3 w-3" />}
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2 px-3">
        <div className={cn("text-lg font-bold", textMap[cor])}>{valor}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{sublinha}</div>
      </CardContent>
    </Card>
  );
}
