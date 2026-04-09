import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight } from "lucide-react";
import { useMovePosicao } from "@/hooks/useOrgMutations";
import type { PosicaoNode } from "@/types/organograma";

interface Props {
  open: boolean;
  onClose: () => void;
  movedNode: PosicaoNode | null;
  newParent: PosicaoNode | null;
  allNodes: PosicaoNode[];
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function NodePreview({ node }: { node: PosicaoNode }) {
  const avatarUrl = node.foto_url || null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-accent/30">
      <Avatar className="h-8 w-8">
        {avatarUrl && <AvatarImage src={avatarUrl} />}
        <AvatarFallback className="text-[10px]">{node.nome_display ? getInitials(node.nome_display) : "?"}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium">{node.nome_display || node.titulo_cargo}</p>
        <p className="text-xs text-muted-foreground">{node.titulo_cargo} · {node.departamento}</p>
      </div>
    </div>
  );
}

export function OrgMoveConfirmDialog({ open, onClose, movedNode, newParent, allNodes }: Props) {
  const moveMutation = useMovePosicao();

  if (!movedNode || !newParent) return null;

  const oldParent = movedNode.id_pai ? allNodes.find(n => n.id === movedNode.id_pai) : null;

  const handleConfirm = () => {
    moveMutation.mutate(
      { id: movedNode.id, newParentId: newParent.id, node: movedNode, parentNode: newParent },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Movimentação</DialogTitle>
          <DialogDescription>
            Deseja mover esta posição para um novo gestor?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Posição sendo movida</p>
            <NodePreview node={movedNode} />
          </div>

          <div className="flex items-center gap-3 justify-center text-muted-foreground">
            {oldParent && (
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-1">De</p>
                <p className="text-xs font-medium">{oldParent.nome_display || oldParent.titulo_cargo}</p>
              </div>
            )}
            <ArrowRight className="h-4 w-4 shrink-0" />
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Para</p>
              <p className="text-xs font-medium">{newParent.nome_display || newParent.titulo_cargo}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Novo gestor direto</p>
            <NodePreview node={newParent} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={moveMutation.isPending}>
            {moveMutation.isPending ? "Movendo..." : "Confirmar Movimentação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
