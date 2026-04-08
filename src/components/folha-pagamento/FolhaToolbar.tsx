import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Calculator, Lock, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type Competencia = Tables<"folha_competencias">;

interface Props {
  competencias: Competencia[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCriar: (competencia: string) => void;
  onCalcular: () => void;
  onFechar: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  isCalculating: boolean;
  canManage: boolean;
  hasHolerites: boolean;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  aberta: { label: "Aberta", variant: "outline" },
  calculada: { label: "Calculada", variant: "secondary" },
  fechada: { label: "Fechada", variant: "default" },
};

export function FolhaToolbar({
  competencias, selectedId, onSelect, onCriar, onCalcular, onFechar, onExportExcel, onExportPDF, isCalculating, canManage, hasHolerites,
}: Props) {
  const [showNew, setShowNew] = useState(false);
  const [novaComp, setNovaComp] = useState("");

  const selected = competencias.find((c) => c.id === selectedId);
  const statusInfo = STATUS_BADGE[selected?.status ?? ""] || STATUS_BADGE.aberta;

  // Gerar sugestões de meses (próximos 3 + atuais)
  const now = new Date();
  const sugestoes = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 2 - i);
    return format(d, "yyyy-MM");
  });
  const existentes = new Set(competencias.map((c) => c.competencia));

  const handleCriar = () => {
    if (novaComp) {
      onCriar(novaComp);
      setShowNew(false);
      setNovaComp("");
    }
  };

  const formatLabel = (comp: string) => {
    const [y, m] = comp.split("-");
    const d = new Date(Number(y), Number(m) - 1);
    return format(d, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedId ?? ""} onValueChange={onSelect}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Selecione a competência" />
        </SelectTrigger>
        <SelectContent>
          {competencias.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {formatLabel(c.competencia)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}

      <div className="flex-1" />

      {canManage && (
        <>
          <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Competência
          </Button>

          {selected?.status === "aberta" && (
            <Button size="sm" onClick={onCalcular} disabled={isCalculating}>
              <Calculator className="h-4 w-4 mr-1" />
              {isCalculating ? "Calculando..." : "Calcular Folha"}
            </Button>
          )}

          {selected?.status === "calculada" && (
            <>
              <Button size="sm" variant="outline" onClick={onCalcular} disabled={isCalculating}>
                <Calculator className="h-4 w-4 mr-1" /> Recalcular
              </Button>
              <Button size="sm" onClick={onFechar}>
                <Lock className="h-4 w-4 mr-1" /> Fechar Folha
              </Button>
            </>
          )}
        </>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Competência</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <Select value={novaComp} onValueChange={setNovaComp}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {sugestoes.filter((s) => !existentes.has(s)).map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCriar} disabled={!novaComp}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
