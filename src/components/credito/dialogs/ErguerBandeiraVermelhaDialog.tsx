import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { useErguerBandeiraVermelha } from "@/hooks/credito/useBandeiraVermelha";

interface Props {
  parceiro_id: string;
}

export function ErguerBandeiraVermelhaDialog({ parceiro_id }: Props) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const erguer = useErguerBandeiraVermelha();

  const motivoValido = motivo.trim().length >= 10;

  const handleConfirm = async () => {
    if (!motivoValido) return;
    await erguer.mutateAsync({ parceiro_id, motivo: motivo.trim() });
    setOpen(false);
    setMotivo("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Shield className="h-4 w-4" />
          Erguer bandeira vermelha
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Erguer bandeira vermelha</DialogTitle>
          <DialogDescription>
            Sinaliza o cliente como risco elevado. IA passa a recomendar à vista
            ou reprovação por padrão. Não bloqueia operação — só alerta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Motivo (mínimo 10 caracteres)</Label>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            placeholder="Ex: Cliente deu calote em jul/2025 (R$ 12k). Negociou parcelamento mas não cumpriu. Sócio aparece em outras 3 empresas com pendências."
          />
          <p className="text-xs text-muted-foreground">
            {motivo.trim().length}/10 caracteres
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Voltar</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!motivoValido || erguer.isPending}
          >
            {erguer.isPending ? "Erguendo..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
