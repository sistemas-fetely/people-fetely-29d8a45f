import { AlertCircle } from "lucide-react";
import { useContasAlertas } from "@/hooks/useContasAlertas";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function AlertasBadge() {
  const { data: alertas = [] } = useContasAlertas();

  if (alertas.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {alertas.length} pendência{alertas.length > 1 ? "s" : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <p className="text-sm font-semibold">Pendências ativas</p>
          <p className="text-xs text-muted-foreground">
            {alertas.length} alerta{alertas.length > 1 ? "s" : ""} aguardando ação
          </p>
        </div>
        <div className="max-h-80 overflow-auto">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className="p-3 border-b last:border-0 hover:bg-muted/40"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{alerta.mensagem}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Desde {new Date(alerta.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
