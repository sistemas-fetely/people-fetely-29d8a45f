// src/components/financeiro/AcoesContaMenu.tsx
import { useState } from "react";
import { MoreVertical, Check, X, FileUp, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContaPagar,
  TRANSICOES_PERMITIDAS,
  useAtualizarStatus,
  useExcluirConta,
} from "@/hooks/useContasPagar";
import { AnexarNFSheet } from "./AnexarNFSheet";

interface AcoesContaMenuProps {
  conta: ContaPagar;
  onEditar?: () => void;
}

export function AcoesContaMenu({ conta, onEditar }: AcoesContaMenuProps) {
  const atualizarStatus = useAtualizarStatus();
  const excluirConta = useExcluirConta();
  const [anexarSheetOpen, setAnexarSheetOpen] = useState(false);

  const transicoesPermitidas = TRANSICOES_PERMITIDAS[conta.status];

  const handleMudarStatus = async (novoStatus: string) => {
    atualizarStatus.mutate({
      contaId: conta.id,
      novoStatus: novoStatus as any,
    });
  };

  const handleExcluir = () => {
    if (confirm("Tem certeza que deseja excluir esta conta?")) {
      excluirConta.mutate(conta.id);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {/* Editar */}
          {onEditar && (
            <>
              <DropdownMenuItem onClick={onEditar}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Transições de status - Fase 1: até aprovado */}
          {conta.status === "rascunho" && transicoesPermitidas.includes("pendente") && (
            <DropdownMenuItem onClick={() => handleMudarStatus("pendente")}>
              <Check className="h-4 w-4 mr-2" />
              Validar (→ Pendente)
            </DropdownMenuItem>
          )}

          {conta.status === "pendente" && transicoesPermitidas.includes("aprovado") && (
            <DropdownMenuItem onClick={() => handleMudarStatus("aprovado")}>
              <Check className="h-4 w-4 mr-2" />
              Aprovar (→ Aprovado)
            </DropdownMenuItem>
          )}

          {/* Voltar status */}
          {conta.status === "pendente" && transicoesPermitidas.includes("rascunho") && (
            <DropdownMenuItem onClick={() => handleMudarStatus("rascunho")}>
              <X className="h-4 w-4 mr-2" />
              Voltar para Rascunho
            </DropdownMenuItem>
          )}

          {conta.status === "aprovado" && transicoesPermitidas.includes("pendente") && (
            <DropdownMenuItem onClick={() => handleMudarStatus("pendente")}>
              <X className="h-4 w-4 mr-2" />
              Voltar para Pendente
            </DropdownMenuItem>
          )}

          {/* Anexar NF */}
          {!conta.nf_path && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAnexarSheetOpen(true)}>
                <FileUp className="h-4 w-4 mr-2" />
                Anexar NF/Recibo
              </DropdownMenuItem>
            </>
          )}

          {/* Cancelar */}
          {conta.status !== "cancelado" && transicoesPermitidas.includes("cancelado") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleMudarStatus("cancelado")}
                className="text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar Conta
              </DropdownMenuItem>
            </>
          )}

          {/* Excluir */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExcluir} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sheet de anexar NF */}
      <AnexarNFSheet
        conta={conta}
        open={anexarSheetOpen}
        onOpenChange={setAnexarSheetOpen}
      />
    </>
  );
}
