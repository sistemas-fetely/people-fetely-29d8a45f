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
import { ThumbsUp, Check, ChevronDown, X, Loader2, Zap, CreditCard } from "lucide-react";
import { useContaWorkflow, type ContaStatus } from "@/hooks/useContaWorkflow";
import { usePermissions } from "@/hooks/usePermissions";
import { AcaoMassaSuperAdminDialog } from "./AcaoMassaSuperAdminDialog";
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
  const [superAcaoOpen, setSuperAcaoOpen] = useState(false);
  const [superAcaoModo, setSuperAcaoModo] = useState<"finalizar_legado" | "definir_meio">(
    "finalizar_legado",
  );
  const workflow = useContaWorkflow();
  const { isSuperAdmin } = usePermissions();

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
    let erros = 0;

    for (const conta of contas) {
      if (!filtroStatuses.includes(conta.status)) continue;

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
    if (erros > 0) msg += ` (${erros} erro${erros > 1 ? "s" : ""})`;

    if (sucesso > 0) toast.success(msg);
    else toast.error(msg);

    setExecutando(false);
    onDone();
  }

  const nAberto = countStatus("aberto", "atrasado");
  const nAprovado = countStatus("aprovado");
  const nDocPendente = countStatus("doc_pendente");

  return (
    <>
      {executando && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

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

      {nDocPendente > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={executando}
          onClick={() => executarLote("finalizado", ["doc_pendente"], "Finalizado manualmente em massa")}
        >
          <Check className="h-3.5 w-3.5" /> Finalizar {nDocPendente}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1" disabled={executando}>
            <ChevronDown className="h-3.5 w-3.5" /> Mais
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs">Ações em massa</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* AÇÕES SUPER ADMIN - Migração de legado */}
          {isSuperAdmin && (
            <>
              <DropdownMenuLabel className="text-[10px] text-amber-700 uppercase tracking-wide pt-2">
                Super admin
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="text-amber-700 focus:text-amber-700 focus:bg-amber-50"
                onSelect={(e) => {
                  e.preventDefault();
                  setSuperAcaoModo("finalizar_legado");
                  setSuperAcaoOpen(true);
                }}
              >
                <Zap className="h-3.5 w-3.5 mr-1" /> Finalizar em massa (pular fluxo)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setSuperAcaoModo("definir_meio");
                  setSuperAcaoOpen(true);
                }}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" /> Definir meio de pagamento em massa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

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
                  As contas selecionadas serão marcadas como canceladas. Você poderá reabrir depois
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
                      ["aberto", "atrasado", "aprovado", "doc_pendente"],
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

      <AcaoMassaSuperAdminDialog
        open={superAcaoOpen}
        onOpenChange={setSuperAcaoOpen}
        contas={contas}
        modo={superAcaoModo}
        onDone={onDone}
      />
    </>
  );
}
