import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CreditCard } from "lucide-react";
import { useRegistrarOperacaoPedido } from "@/hooks/pedidos/useRegistrarOperacaoPedido";

interface Props {
  pedido_id: string;
  contato_email?: string | null;
  contato_telefone?: string | null;
}

const METODOS = ["Email", "WhatsApp", "SMS", "Outro"] as const;
type Metodo = typeof METODOS[number];

export function OperacaoCartaoDialog({ pedido_id, contato_email, contato_telefone }: Props) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [metodo, setMetodo] = useState<Metodo>("WhatsApp");
  const [contato, setContato] = useState("");
  const [observacao, setObservacao] = useState("");

  const registrar = useRegistrarOperacaoPedido();

  const handleMetodoChange = (m: Metodo) => {
    setMetodo(m);
    if (m === "Email" && contato_email) setContato(contato_email);
    else if (["WhatsApp", "SMS"].includes(m) && contato_telefone) setContato(contato_telefone);
    else if (!contato_email && !contato_telefone) setContato("");
  };

  const handleConfirm = async () => {
    if (!link.trim() || !contato.trim()) return;

    await registrar.mutateAsync({
      pedido_id,
      tipo_evento: "link_cartao_enviado",
      descricao: `Link enviado por ${metodo} para ${contato}`,
      metadata: {
        link: link.trim(),
        metodo,
        contato: contato.trim(),
        observacao: observacao.trim() || undefined,
      },
      proxima_acao: "Aguardar confirmação do pagamento",
    });

    setOpen(false);
    setLink("");
    setContato("");
    setObservacao("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <CreditCard className="h-4 w-4" />
          Enviar link de pagamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar link de pagamento por cartão</DialogTitle>
          <DialogDescription>
            Cole o link gerado no gateway externo. O sistema registra o envio na timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Link do pagamento *</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://gateway.com/pagamento/abc123"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Método de envio *</Label>
              <Select value={metodo} onValueChange={(v) => handleMetodoChange(v as Metodo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contato *</Label>
              <Input
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                placeholder={metodo === "Email" ? "cliente@email.com" : "(11) 99999-9999"}
              />
            </div>
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
            disabled={!link.trim() || !contato.trim() || registrar.isPending}
          >
            {registrar.isPending ? "Registrando..." : "Registrar envio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
