import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, ThumbsUp, Send, Check, ChevronDown, X, Loader2 } from "lucide-react";
import { useContaWorkflow, type ContaStatus } from "@/hooks/useContaWorkflow";
import { toast } from "sonner";

export interface ContaSelecionada {
  id: string;
  status: string;
  conta_id: string | null;
}

interface Props {
  contas: ContaSelecionada[];
  onDone: () => void;
}

export default function AcoesMassaButtons({ contas, onDone }: Props) {
  const [executando, setExecutando] = useState(false);
  const workflow = useContaWorkflow();

  function countStatus(...statuses: string[]) {
    return contas.filter((c) => statuses.includes(c.status)).length;
  }

  async function executarLote(
    novoStatus: ContaStatus,
    filtroStatuses: string[],
    observacao: string,
  ) {
    setExecutando(true);
    let sucesso = 0;
    let pulados = 0;
    let erros = 0;

    for (const conta of contas) {
      if (!filtroStatuses.includes(conta.status)) continue;

      // Se é rascunho indo pra "aberto" sem categoria → pula (precisa categorizar antes)
      if (
        conta.status === "rascunho" &&
        novoStatus === "aberto" &&
        !conta.conta_id
      ) {
        pulados++;
        continue;
      }

      try {
        await workflow.mudarStatus.mutateAsync({
          contaId: conta.id,
          statusAnterior: conta.status,
          novoStatus,
          observacao,
        });
        sucesso++;
      } catch {
        erros++;
      }
    }

    let msg = `${sucesso} atualizada${sucesso !== 1 ? "s" : ""}`;
    if (pulados > 0) msg += ` (${pulados} sem categoria, mantidas como rascunho)`;
    if (erros > 0) msg += ` (${erros} erro${erros > 1 ? "s" : ""})`;

    if (sucesso > 0) toast.success(msg);
    else if (pulados > 0) toast.warning(msg);
    else toast.error(msg);

    setExecutando(false);
    onDone();
  }

  const nRascunho = countStatus("rascunho");
  const nAberto = countStatus("aberto", "atrasado");
  const nAprovado = countStatus("aprovado");
  const nAgendado = countStatus("agendado");

  return (
    <>
      {executando && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      {nRascunho > 0 && (
        <Button
          size="sm"
          className="bg-blue-700 hover:bg-blue-800 text-white gap-1"
          disabled={executando}
          onClick={() => executarLote("aberto", ["rascunho"], "Validado em massa")}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Validar {nRascunho}
        </Button>
      )}

      {nAberto > 0 && (
        <Button
          size="sm"
          className="bg-purple-700 hover:bg-purple-800 text-white gap-1"
          disabled={executando}
          onClick={() => executarLote("aprovado", ["aberto", "atrasado"], "Aprovado em massa")}
        >
          <ThumbsUp className="h-3.5 w-3.5" /> Aprovar {nAberto}
        </Button>
      )}

      {nAprovado > 0 && (
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
          disabled={executando}
          onClick={() => executarLote("agendado", ["aprovado"], "Enviado em massa")}
        >
          <Send className="h-3.5 w-3.5" /> Enviar {nAprovado}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1" disabled={executando}>
            <ChevronDown className="h-3.5 w-3.5" /> Mais
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs">Pular etapas</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() =>
              executarLote(
                "aprovado",
                ["rascunho", "aberto", "atrasado"],
                "Validado + aprovado em massa",
              )
            }
          >
            Validar + Aprovar direto
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              executarLote(
                "agendado",
                ["rascunho", "aberto", "atrasado", "aprovado"],
                "Enviado direto em massa",
              )
            }
          >
            Enviar direto (pular aprovação)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              executarLote(
                "pago",
                ["rascunho", "aberto", "atrasado", "aprovado", "agendado"],
                "Marcado como pago (retroativo, em massa)",
              )
            }
          >
            Marcar como pago (retroativo)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => e.preventDefault()}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Cancelar selecionadas
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Cancelar {contas.length} conta{contas.length > 1 ? "s" : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  As contas selecionadas serão marcadas como canceladas. Você poderá reverter depois
                  se necessário.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  onClick={() =>
                    executarLote(
                      "cancelado",
                      ["rascunho", "aberto", "atrasado", "aprovado", "agendado"],
                      "Cancelado em massa",
                    )
                  }
                >
                  Sim, cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
