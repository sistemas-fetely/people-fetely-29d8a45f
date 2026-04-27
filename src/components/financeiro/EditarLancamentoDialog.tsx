import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format-currency";

interface LancamentoEditavel {
  id: string;
  fornecedor_cliente: string | null;
  descricao: string;
  valor: number;
  pago_em_conta_id: string | null;
  forma_pagamento_id: string | null;
  data_pagamento: string | null;
  data_vencimento: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lancamento: LancamentoEditavel | null;
  onSuccess: () => void;
}

export function EditarLancamentoDialog({
  open,
  onOpenChange,
  lancamento,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [formaPgtoId, setFormaPgtoId] = useState("");
  const [dataPgto, setDataPgto] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: contasBancarias } = useQuery({
    queryKey: ["contas-bancarias-ativas"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("contas_bancarias")
        .select("id, nome_exibicao, tipo, banco")
        .eq("ativo", true)
        .order("nome_exibicao");
      return data || [];
    },
  });

  const { data: formasPagamento } = useQuery({
    queryKey: ["formas-pagamento-ativas"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("formas_pagamento")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });

  useEffect(() => {
    if (!open || !lancamento) return;
    setContaBancariaId(lancamento.pago_em_conta_id || "");
    setFormaPgtoId(lancamento.forma_pagamento_id || "");
    setDataPgto(lancamento.data_pagamento || "");
  }, [open, lancamento]);

  async function handleSalvar() {
    if (!lancamento) return;

    setSalvando(true);
    try {
      const updateData: Record<string, unknown> = {
        pago_em_conta_id: contaBancariaId || null,
        forma_pagamento_id: formaPgtoId || null,
        data_pagamento: dataPgto || null,
      };

      const { error } = await supabase
        .from("contas_pagar_receber")
        .update(updateData)
        .eq("id", lancamento.id);

      if (error) throw error;

      toast.success("Lançamento atualizado");
      qc.invalidateQueries({ queryKey: ["lancamentos-caixa-banco"] });
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setSalvando(false);
    }
  }

  if (!lancamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-admin" />
            Editar lançamento
          </DialogTitle>
          <DialogDescription>
            {lancamento.fornecedor_cliente || lancamento.descricao} —{" "}
            {formatBRL(lancamento.valor)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Conta bancária */}
          <div className="space-y-1">
            <Label>Conta bancária</Label>
            <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (vazio se ainda não pago)" />
              </SelectTrigger>
              <SelectContent>
                {(contasBancarias || []).map((cb) => (
                  <SelectItem key={cb.id} value={cb.id}>
                    {cb.nome_exibicao}{" "}
                    <span className="text-muted-foreground text-xs ml-1">
                      ({cb.tipo === "cartao_credito" ? "Cartão" : cb.banco})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-1">
            <Label>Forma de pagamento</Label>
            <Select value={formaPgtoId} onValueChange={setFormaPgtoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (PIX, Boleto, Transferência...)" />
              </SelectTrigger>
              <SelectContent>
                {(formasPagamento || []).map((fp) => (
                  <SelectItem key={fp.id} value={fp.id}>
                    {fp.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data pagamento */}
          <div className="space-y-1">
            <Label>Data do pagamento</Label>
            <Input
              type="date"
              value={dataPgto}
              onChange={(e) => setDataPgto(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Vazio = ainda não pago. Ao preencher, status muda pra "Pago".
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando} className="gap-2">
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
