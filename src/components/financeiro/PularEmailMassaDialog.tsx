import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail } from "lucide-react";
import { usePularEmailMassa } from "@/hooks/usePularEmailMassa";
import type { ContaSelecionada } from "./AcoesMassaButtons";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contas: ContaSelecionada[];
  onDone: () => void;
}

type FormaPgto = { id: string; nome: string; codigo: string | null };

export function PularEmailMassaDialog({ open, onOpenChange, contas, onDone }: Props) {
  const [formaPagamentoId, setFormaPagamentoId] = useState("");
  const [observacaoExtra, setObservacaoExtra] = useState("");
  const pular = usePularEmailMassa();

  const aprovadas = contas.filter((c) => c.status === "aprovado");
  const n = aprovadas.length;

  const { data: formas = [], isLoading } = useQuery({
    queryKey: ["formas-pagamento-ativas"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .select("id,nome,codigo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as FormaPgto[];
    },
  });

  async function handleSubmit() {
    if (!formaPagamentoId || n === 0) return;
    try {
      await pular.mutateAsync({
        contaIds: aprovadas.map((c) => c.id),
        formaPagamentoId,
        observacaoExtra: observacaoExtra.trim() || undefined,
      });
      onOpenChange(false);
      setFormaPagamentoId("");
      setObservacaoExtra("");
      onDone();
    } catch {
      // toast vem do hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-700" />
            Pular email — {n} {n === 1 ? "conta" : "contas"}
          </DialogTitle>
          <DialogDescription>
            As {n} {n === 1 ? "conta selecionada vai" : "contas selecionadas vão"} direto pra{" "}
            <strong>Aguardando pagamento</strong> sem disparar email pro fornecedor. Defina a forma
            de pagamento que será aplicada a {n === 1 ? "ela" : "todas"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="forma-pagto">
              Forma de pagamento <span className="text-destructive">*</span>
            </Label>
            <Select value={formaPagamentoId} onValueChange={setFormaPagamentoId}>
              <SelectTrigger id="forma-pagto">
                <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione uma forma"} />
              </SelectTrigger>
              <SelectContent>
                {formas.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                    {f.codigo ? ` (${f.codigo})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observação (opcional)</Label>
            <Textarea
              id="obs"
              placeholder="Ex: pagamento agrupado em transferência única"
              value={observacaoExtra}
              onChange={(e) => setObservacaoExtra(e.target.value)}
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground">
              Será incluída no histórico de cada conta.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pular.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formaPagamentoId || n === 0 || pular.isPending}
            className="gap-2"
          >
            {pular.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Avançar {n} {n === 1 ? "conta" : "contas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
