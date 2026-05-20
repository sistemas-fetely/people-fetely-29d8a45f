import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export type CartaoCredito = {
  id: string;
  nome: string;
  bandeira: string | null;
  ultimos_digitos: string | null;
  limite: number;
  conta_bancaria_id: string | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  ativo: boolean;
};

const BANDEIRAS = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outro"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: CartaoCredito | null;
}

export function NovoCartaoSheet({ open, onOpenChange, editing }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editing;

  const [nome, setNome] = useState("");
  const [bandeira, setBandeira] = useState("");
  const [ultimosDigitos, setUltimosDigitos] = useState("");
  const [limite, setLimite] = useState("");
  const [diaFechamento, setDiaFechamento] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [ativo, setAtivo] = useState(true);

  const { data: contasReais } = useQuery({
    queryKey: ["contas-bancarias-reais"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contas_bancarias")
        .select("id, nome_exibicao, banco")
        .in("tipo", ["corrente", "poupanca"])
        .eq("ativo", true)
        .order("nome_exibicao");
      return (data || []) as { id: string; nome_exibicao: string; banco: string }[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setNome(editing.nome || "");
      setBandeira(editing.bandeira || "");
      setUltimosDigitos(editing.ultimos_digitos || "");
      setLimite(editing.limite != null ? String(editing.limite) : "");
      setDiaFechamento(editing.dia_fechamento != null ? String(editing.dia_fechamento) : "");
      setDiaVencimento(editing.dia_vencimento != null ? String(editing.dia_vencimento) : "");
      setContaBancariaId(editing.conta_bancaria_id || "");
      setAtivo(editing.ativo !== false);
    } else {
      setNome("");
      setBandeira("");
      setUltimosDigitos("");
      setLimite("");
      setDiaFechamento("");
      setDiaVencimento("");
      setContaBancariaId("");
      setAtivo(true);
    }
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Nome do cartão é obrigatório");
      if (!diaFechamento || !diaVencimento) {
        throw new Error("Dia de fechamento e vencimento são obrigatórios");
      }

      const payload = {
        nome: nome.trim(),
        bandeira: bandeira || null,
        ultimos_digitos: ultimosDigitos.trim() || null,
        limite: limite ? Number(limite) : 0,
        dia_fechamento: Number(diaFechamento),
        dia_vencimento: Number(diaVencimento),
        conta_bancaria_id: contaBancariaId || null,
        ativo,
      };

      if (isEdit && editing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("cartoes_credito")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("cartoes_credito")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Cartão atualizado" : "Cartão cadastrado");
      qc.invalidateQueries({ queryKey: ["cartoes-credito"] });
      qc.invalidateQueries({ queryKey: ["cartoes-credito-listagem-v2"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar cartão" : "Novo cartão de crédito"}</SheetTitle>
          <SheetDescription>
            Cadastro de cartão de crédito para importação de faturas.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Nome do cartão *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Itaú Platinum, Safra Visa"
            />
            <p className="text-xs text-muted-foreground">
              Apelido para identificar o cartão nas listas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bandeira</Label>
              <Select value={bandeira} onValueChange={setBandeira}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {BANDEIRAS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Últimos 4 dígitos</Label>
              <Input
                value={ultimosDigitos}
                onChange={(e) => setUltimosDigitos(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Ex: 1234"
                maxLength={4}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Limite de crédito (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dia de fechamento *</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={diaFechamento}
                onChange={(e) => setDiaFechamento(e.target.value)}
                placeholder="Ex: 25"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dia de vencimento *</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
                placeholder="Ex: 5"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Conta de pagamento</Label>
            <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {(contasReais || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_exibicao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Conta corrente/poupança onde a fatura é paga.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Cartão ativo</Label>
              <p className="text-xs text-muted-foreground">
                Inativos ficam ocultos mas mantêm histórico.
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : isEdit ? "Salvar" : "Cadastrar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
