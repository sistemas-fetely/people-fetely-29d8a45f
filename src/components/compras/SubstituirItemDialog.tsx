import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { InputMoedaBR } from "./InputMoedaBR";
import type { PedidoCompraItemRow } from "@/lib/compras/types";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemOriginal: PedidoCompraItemRow | null;
  onConfirm: (sub: {
    descricao_livre: string;
    quantidade_real: number;
    valor_unitario_real: number;
  }) => void;
  onCancel?: () => void;
}

export function SubstituirItemDialog({
  open,
  onOpenChange,
  itemOriginal,
  onConfirm,
  onCancel,
}: Props) {
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [valor, setValor] = useState<number>(0);

  useEffect(() => {
    if (open) {
      setDescricao("");
      setQuantidade(1);
      setValor(0);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!descricao.trim()) return toast.error("Descrição é obrigatória");
    if (!(quantidade > 0)) return toast.error("Quantidade deve ser > 0");
    if (!(valor > 0)) return toast.error("Valor unitário deve ser > 0");
    onConfirm({
      descricao_livre: descricao.trim(),
      quantidade_real: quantidade,
      valor_unitario_real: valor,
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel?.();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Substituir item</DialogTitle>
        </DialogHeader>
        {itemOriginal && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <div className="text-xs text-muted-foreground">Item original</div>
            <Badge variant="secondary" className="text-sm">
              {itemOriginal.descricao}
            </Badge>
            <div className="text-xs text-muted-foreground">
              Qtd: {Number(itemOriginal.quantidade)} · Valor estimado:{" "}
              {fmtBRL(Number(itemOriginal.valor_estimado_unitario))}
            </div>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label>Descrição do substituto *</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              placeholder="Ex: Papel Premium 180g"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div>
              <Label>Valor unitário *</Label>
              <InputMoedaBR value={valor} onChange={setValor} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Confirmar substituição</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
