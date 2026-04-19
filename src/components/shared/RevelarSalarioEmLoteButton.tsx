import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSalarioVisivel, type ContextoSalario } from "@/hooks/useSalarioVisivel";
import { toast } from "sonner";

interface Props {
  userIds: (string | null | undefined)[];
  contexto: ContextoSalario;
  /** Label do botão. Default: "Revelar todos" */
  label?: string;
  /** Quantidade mínima de alvos válidos para o botão aparecer. Default: 5 */
  minimo?: number;
}

/**
 * Botão de revelação em lote (Beatriz/UX + Dra. Renata/LGPD).
 * Aparece em listas grandes e exige justificativa antes de revelar — registra log em massa.
 */
export function RevelarSalarioEmLoteButton({
  userIds,
  contexto,
  label = "Revelar todos",
  minimo = 5,
}: Props) {
  const { revelarLote } = useSalarioVisivel(contexto);
  const [open, setOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [enviando, setEnviando] = useState(false);

  const idsValidos = userIds.filter((u): u is string => !!u);
  if (idsValidos.length < minimo) return null;

  async function handleConfirmar() {
    if (justificativa.trim().length < 5) {
      toast.error("Informe uma justificativa (mínimo 5 caracteres).");
      return;
    }
    setEnviando(true);
    try {
      const revelados = await revelarLote(idsValidos, justificativa);
      if (revelados === 0) {
        toast.warning(
          "Nenhum salário foi revelado. Você pode não ter permissão para os registros desta lista.",
        );
      } else {
        toast.success(`${revelados} salário(s) revelado(s) por 15 minutos.`);
      }
      setOpen(false);
      setJustificativa("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Eye className="h-4 w-4" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revelar salários em lote</DialogTitle>
            <DialogDescription>
              Você está prestes a revelar os salários de {idsValidos.length} pessoas. Um log de
              auditoria LGPD será registrado com a justificativa informada. A revelação dura 15
              minutos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="justificativa-lote">Finalidade do acesso *</Label>
            <Textarea
              id="justificativa-lote"
              placeholder="Ex.: Revisão salarial Q2, conferência de folha mensal, etc."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Esta justificativa ficará registrada no log de acesso (LGPD).
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={enviando || justificativa.trim().length < 5}
            >
              {enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revelar {idsValidos.length} salário(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
