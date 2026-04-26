// src/components/financeiro/AcoesContaMenu.tsx
import { useState } from "react";
import { MoreVertical, X, FileUp, Trash2, Pencil } from "lucide-react";
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

/**
 * Menu de ações secundárias.
 * As ações principais (Validar/Aprovar) ficam INLINE na tabela
 * via os botões da página ContasPagar; aqui só ficam ações secundárias:
 * Editar, Anexar NF, Cancelar e Excluir.
 */
export function AcoesContaMenu({ conta, onEditar }: AcoesContaMenuProps) {
  const atualizarStatus = useAtualizarStatus();
  const excluirConta = useExcluirConta();
  const [anexarSheetOpen, setAnexarSheetOpen] = useState(false);

  const transicoesPermitidas = TRANSICOES_PERMITIDAS[conta.status];

  const handleCancelar = () => {
    if (confirm("Tem certeza que deseja cancelar esta conta?")) {
      atualizarStatus.mutate({ contaId: conta.id, novoStatus: "cancelado" });
    }
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
            <DropdownMenuItem onClick={onEditar}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
          )}

          {/* Anexar NF */}
          {!conta.nf_path && (
            <DropdownMenuItem onClick={() => setAnexarSheetOpen(true)}>
              <FileUp className="h-4 w-4 mr-2" />
              Anexar NF/Recibo
            </DropdownMenuItem>
          )}

          {/* Cancelar */}
          {conta.status !== "cancelado" && transicoesPermitidas.includes("cancelado") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCancelar}
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
