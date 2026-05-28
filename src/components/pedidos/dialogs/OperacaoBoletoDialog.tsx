import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Receipt } from "lucide-react";
import { useRegistrarOperacaoPedido } from "@/hooks/pedidos/useRegistrarOperacaoPedido";

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  pedido_id: string;
  valor_padrao?: number;
}

export function OperacaoBoletoDialog({ pedido_id, valor_padrao }: Props) {
  const [open, setOpen] = useState(false);
  const [numeroBoleto, setNumeroBoleto] = useState("");

  const defaultVenc = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  const [vencimento, setVencimento] = useState(defaultVenc);
  const [valor, setValor] = useState(valor_padrao ? String(valor_padrao) : "");
  const [linkPdf, setLinkPdf] = useState("");
  const [observacao, setObservacao] = useState("");

  const registrar = useRegistrarOperacaoPedido();

  const handleConfirm = async () => {
    if (!numeroBoleto.trim() || !vencimento || !valor) return;

    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0) return;

    const vencFmt = new Date(vencimento + "T00:00:00").toLocaleDateString("pt-BR");

    await registrar.mutateAsync({
      pedido_id,
      tipo_evento: "boleto_emitido",
      descricao: `Boleto ${numeroBoleto} emitido — venc ${vencFmt} — ${fmtBRL.format(valorNum)}`,
      metadata: {
        numero_boleto: numeroBoleto.trim(),
        vencimento,
        valor: valorNum,
        link_pdf: linkPdf.trim() || undefined,
        observacao: observacao.trim() || undefined,
      },
      proxima_acao: `Aguardar pagamento do boleto (venc ${vencFmt})`,
    });

    setOpen(false);
    setNumeroBoleto("");
    setLinkPdf("");
    setObservacao("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
          <Receipt className="h-4 w-4" />
          Emitir boleto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar emissão de boleto</DialogTitle>
          <DialogDescription>
            Boleto gerado externamente (banco). Cole os dados pra registrar no audit + atualizar próxima ação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Número do boleto *</Label>
            <Input
              value={numeroBoleto}
              onChange={(e) => setNumeroBoleto(e.target.value)}
              placeholder="34191.79001 01043.510047 91020.150008 8 92020000010000"
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Link do PDF (opcional)</Label>
            <Input
              value={linkPdf}
              onChange={(e) => setLinkPdf(e.target.value)}
              placeholder="https://banco.com/boleto/abc.pdf"
            />
          </div>

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Algum contexto adicional pro audit trail."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!numeroBoleto.trim() || !vencimento || !valor || registrar.isPending}
          >
            {registrar.isPending ? "Registrando..." : "Registrar boleto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
