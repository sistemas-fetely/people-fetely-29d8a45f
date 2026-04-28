import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR as formatDataBR } from "@/lib/format-currency";

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  data_compra: string;
}

interface MatchSugerido {
  conta_pagar_id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  fornecedor_cliente: string | null;
  status: string;
  score: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamento: Lancamento;
}

export function VincularLancamentoModal({ open, onOpenChange, lancamento }: Props) {
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const qc = useQueryClient();

  // Busca matches sugeridos
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches-lancamento", lancamento.id, open],
    enabled: open,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("sugerir_matches_lancamento", {
        p_lancamento_id: lancamento.id,
      });
      if (error) throw error;
      return (data || []) as MatchSugerido[];
    },
  });

  // Filtra por busca livre se digitou algo
  const matchesFiltrados = (matches || []).filter((m) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      m.descricao.toLowerCase().includes(termo) ||
      (m.fornecedor_cliente || "").toLowerCase().includes(termo)
    );
  });

  async function handleVincular(contaPagarId: string, descricao: string) {
    setSalvando(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: resultado, error } = await (supabase as any).rpc(
        "conciliar_lancamento",
        {
          p_lancamento_id: lancamento.id,
          p_conta_pagar_id: contaPagarId,
        }
      );
      if (error) throw error;
      if (!resultado?.ok) {
        toast.error(resultado?.erro || "Erro ao vincular");
        return;
      }
      toast.success(`Vinculado a: ${descricao}`, { duration: 4000 });
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["fatura-lancamentos"] });
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular lançamento a conta a pagar</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Header do lançamento */}
          <div className="p-2 bg-zinc-50 border rounded text-xs">
            <div className="font-semibold">{lancamento.descricao}</div>
            <div className="text-muted-foreground">
              {formatBRL(lancamento.valor)} · {formatDataBR(lancamento.data_compra)}
            </div>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Filtrar por descrição ou fornecedor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Header da lista */}
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            Despesas sugeridas em Contas a Pagar
          </div>

          {/* Lista */}
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando despesas compatíveis...
              </div>
            ) : matchesFiltrados.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {busca ? "Nenhuma despesa encontrada com esse filtro." : "Nenhuma despesa compatível em Contas a Pagar."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use "Criar Conta" pra criar uma despesa nova a partir deste lançamento.
                </p>
              </div>
            ) : (
              matchesFiltrados.map((m) => (
                <div
                  key={m.conta_pagar_id}
                  className="p-3 border rounded hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{m.descricao}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] shrink-0 ${
                            m.score >= 80
                              ? "border-emerald-400 text-emerald-700 bg-emerald-50"
                              : m.score >= 50
                                ? "border-amber-400 text-amber-700 bg-amber-50"
                                : "border-zinc-300 text-zinc-700"
                          }`}
                        >
                          {m.score}% match
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatBRL(m.valor)} · venc {formatDataBR(m.data_vencimento)}
                        {m.fornecedor_cliente && ` · ${m.fornecedor_cliente}`}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleVincular(m.conta_pagar_id, m.descricao)}
                      disabled={salvando}
                      className="gap-1 shrink-0"
                    >
                      {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                      Vincular
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
