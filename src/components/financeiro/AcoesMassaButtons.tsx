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
import { ThumbsUp, Check, ChevronDown, X, Loader2, Zap, CreditCard, Mail, Trash2 } from "lucide-react";
import { useContaWorkflow, type ContaStatus } from "@/hooks/useContaWorkflow";
import { usePermissions } from "@/hooks/usePermissions";
import { AcaoMassaSuperAdminDialog } from "./AcaoMassaSuperAdminDialog";
import { PularEmailMassaDialog } from "./PularEmailMassaDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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
  const [pularEmailOpen, setPularEmailOpen] = useState(false);
  const [superAcaoModo, setSuperAcaoModo] = useState<"finalizar_legado" | "definir_meio">(
    "finalizar_legado",
  );
  const workflow = useContaWorkflow();
  const { isSuperAdmin } = usePermissions();
  const qc = useQueryClient();

  async function excluirSelecionadas() {
    setExecutando(true);
    try {
      const ids = contas.map((c) => c.id);
      const { error } = await supabase
        .from("contas_pagar_receber")
        .delete()
        .in("id", ids);
      if (error) throw error;
      toast.success(
        `${ids.length} conta${ids.length > 1 ? "s excluídas" : " excluída"} definitivamente`,
      );
      await qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      onDone();
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null
            ? ((e as { message?: string }).message
                ?? (e as { details?: string }).details
                ?? (e as { hint?: string }).hint
                ?? JSON.stringify(e))
            : String(e);
      toast.error("Erro ao excluir: " + msg);
    } finally {
      setExecutando(false);
    }
  }

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
  const nDocPendente = 0;

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

      {nAprovado > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
          disabled={executando}
          onClick={() => setPularEmailOpen(true)}
        >
          <Mail className="h-3.5 w-3.5" /> Pular email ({nAprovado})
        </Button>
      )}

      {/* Botão "Finalizar" obsoleto após nova doutrina (status finalizado removido) */}

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

      <PularEmailMassaDialog
        open={pularEmailOpen}
        onOpenChange={setPularEmailOpen}
        contas={contas}
        onDone={onDone}
      />
    </>
  );
}
