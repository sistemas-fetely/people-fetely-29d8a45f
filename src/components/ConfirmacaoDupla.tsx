import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descricao: React.ReactNode;
  textoConfirmacao: string;
  placeholder?: string;
  onConfirmar: () => Promise<void> | void;
  acaoLabel?: string;
  variant?: "destructive" | "default";
}

export function ConfirmacaoDupla({
  open,
  onOpenChange,
  titulo,
  descricao,
  textoConfirmacao,
  placeholder = "Digite aqui",
  onConfirmar,
  acaoLabel = "Confirmar",
  variant = "destructive",
}: Props) {
  const [texto, setTexto] = useState("");
  const [processando, setProcessando] = useState(false);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setTexto("");
      setProcessando(false);
    }
  }, [open]);

  const podeConfirmar = texto.trim().toUpperCase() === textoConfirmacao.toUpperCase();

  async function handleConfirmar() {
    if (!podeConfirmar || processando) return;
    setProcessando(true);
    try {
      await onConfirmar();
      setTexto("");
      onOpenChange(false);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !processando && onOpenChange(v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground space-y-2">{descricao}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label>
            Digite{" "}
            <code className="bg-muted px-2 py-0.5 rounded font-mono text-sm">{textoConfirmacao}</code>{" "}
            para confirmar:
          </Label>
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={placeholder}
            autoFocus
            disabled={processando}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={processando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!podeConfirmar || processando}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirmar();
            }}
            className={cn(
              variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {processando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {acaoLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
