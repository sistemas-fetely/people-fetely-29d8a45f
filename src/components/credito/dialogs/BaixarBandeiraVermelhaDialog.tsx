import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { useBaixarBandeiraVermelha } from "@/hooks/credito/useBandeiraVermelha";

interface Props {
  parceiro_id: string;
}

export function BaixarBandeiraVermelhaDialog({ parceiro_id }: Props) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const baixar = useBaixarBandeiraVermelha();

  const motivoValido = motivo.trim().length >= 10;

  const handleConfirm = async () => {
    if (!motivoValido) return;
    await baixar.mutateAsync({ parceiro_id, motivo: motivo.trim() });
    setOpen(false);
    setMotivo("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ShieldCheck className="h-4 w-4" />
          Baixar bandeira vermelha
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Baixar bandeira vermelha</DialogTitle>
          <DialogDescription>
            Remove o sinal de risco. IA volta a ponderar normalmente (sem alerta forte).
            Cliente fica liberado pra fluxo padrão.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Motivo (mínimo 10 caracteres)</Label>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            placeholder="Ex: Cliente quitou dívida pendente em out/2025. Comprou à vista nos últimos 6 meses sem atraso. Sócios mudaram, gestão nova."
          />
          <p className="text-xs text-muted-foreground">
            {motivo.trim().length}/10 caracteres
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Voltar</Button>
          <Button onClick={handleConfirm} disabled={!motivoValido || baixar.isPending}>
            {baixar.isPending ? "Baixando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
