import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string;
  nome?: string;
  /** "button" = standalone outline button; "inline" = compact item to nest in a DropdownMenuItem */
  variant?: "button" | "inline";
  onSuccess?: () => void;
}

/**
 * Botão de RH para reenviar link de acesso (primeiro acesso ou reset de senha).
 * O endpoint detecta automaticamente se o colaborador já ativou ou não o acesso.
 */
export function ReenviarLinkAcessoButton({ userId, nome, variant = "button", onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleConfirmar() {
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "reenviar_link_acesso",
          user_id: userId,
          motivo: motivo.trim() || null,
        },
      });
      if (error || (data as any)?.error) {
        throw new Error(error?.message || (data as any)?.error);
      }
      const tipo = (data as any)?.tipo;
      const emailEnviado = (data as any)?.email;
      toast.success(
        tipo === "primeiro_acesso"
          ? `Link de primeiro acesso reenviado para ${emailEnviado}.`
          : `Link de redefinição de senha reenviado para ${emailEnviado}.`,
      );
      setOpen(false);
      setMotivo("");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao reenviar link");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {variant === "button" ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
          <Send className="h-4 w-4" /> Reenviar link de acesso
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm flex items-center gap-2"
        >
          <Send className="h-3.5 w-3.5" /> Reenviar link de acesso
        </button>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar link de acesso</AlertDialogTitle>
            <AlertDialogDescription>
              {nome ? (
                <>
                  Será enviado novo link para <strong>{nome}</strong>.{" "}
                </>
              ) : null}
              O sistema identifica automaticamente se é primeiro acesso ou redefinição de senha e
              dispara o email adequado. Link anterior (se houver) deixa de ser válido.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="motivo-reenvio" className="text-xs">
              Motivo (opcional — fica no log de auditoria)
            </Label>
            <Textarea
              id="motivo-reenvio"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className="text-sm"
              placeholder="Ex: link expirou, colaborador presencial pediu reenvio…"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmar();
              }}
              disabled={enviando}
            >
              {enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reenviar link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
