import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Plus, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR as formatDataBR } from "@/lib/format-currency";

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  data_compra: string;
  status: string;
  conta_pagar_id?: string | null;
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
  lancamento: Lancamento;
  onSucesso?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-50 text-amber-700 border-amber-300" },
  conciliado: { label: "Vinculada", cls: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  virou_despesa: { label: "Virou despesa", cls: "bg-blue-50 text-blue-700 border-blue-300" },
  ignorado: { label: "Ignorado", cls: "bg-zinc-50 text-zinc-700 border-zinc-300" },
};

export function ConciliarLancamentoPopover({ lancamento, onSucesso }: Props) {
  const [open, setOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const qc = useQueryClient();

  // Busca matches sugeridos quando popover abre (só pra status pendente)
  const { data: matches, isLoading: carregandoMatches } = useQuery({
    queryKey: ["matches-lancamento", lancamento.id],
    enabled: open && lancamento.status === "pendente",
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("sugerir_matches_lancamento", {
        p_lancamento_id: lancamento.id,
      });
      if (error) throw error;
      return (data || []) as MatchSugerido[];
    },
    staleTime: 30_000,
  });

  async function handleConciliar() {
    if (!selecionado) {
      toast.error("Selecione uma conta a pagar pra conciliar");
      return;
    }
    setSalvando(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: resultado, error } = await (supabase as any).rpc(
        "conciliar_lancamento",
        {
          p_lancamento_id: lancamento.id,
          p_conta_pagar_id: selecionado,
        }
      );
      if (error) throw error;
      if (!resultado?.ok) {
        toast.error(resultado?.erro || "Erro ao conciliar");
        return;
      }
      toast.success(
        `Conciliado com: ${resultado.conta_descricao}`,
        { duration: 4000 }
      );
      setOpen(false);
      setSelecionado(null);
      qc.invalidateQueries({ queryKey: ["fatura-lancamentos"] });
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
      onSucesso?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setSalvando(false);
    }
  }

  async function handleIgnorar() {
    if (!confirm(`Ignorar o lançamento "${lancamento.descricao}"? Pode reativar depois se mudar de ideia.`)) {
      return;
    }
    setSalvando(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: resultado, error } = await (supabase as any).rpc(
        "ignorar_lancamento",
        { p_lancamento_id: lancamento.id }
      );
      if (error) throw error;
      if (!resultado?.ok) {
        toast.error(resultado?.erro || "Não foi possível ignorar");
        return;
      }
      toast.success("Lançamento ignorado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["fatura-lancamentos"] });
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
      onSucesso?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setSalvando(false);
    }
  }

  async function handleReativar() {
    setSalvando(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: resultado, error } = await (supabase as any).rpc(
        "reativar_lancamento",
        { p_lancamento_id: lancamento.id }
      );
      if (error) throw error;
      if (!resultado?.ok) {
        toast.error(resultado?.erro || "Não foi possível reativar");
        return;
      }
      toast.success("Lançamento reativado pra pendente");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["fatura-lancamentos"] });
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
      onSucesso?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setSalvando(false);
    }
  }

  const statusCfg = STATUS_CONFIG[lancamento.status] || STATUS_CONFIG.pendente;
  const ehFinalizado = lancamento.status !== "pendente";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={`text-[9px] py-0 px-1.5 h-5 cursor-pointer hover:opacity-80 transition-opacity ${statusCfg.cls}`}
        >
          {statusCfg.label}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3" align="end">
        <div className="space-y-3">
          {/* Header do lançamento */}
          <div className="border-b pb-2">
            <div className="text-xs font-semibold">{lancamento.descricao}</div>
            <div className="text-xs text-muted-foreground">
              {formatBRL(lancamento.valor)} · {formatDataBR(lancamento.data_compra)}
            </div>
          </div>

          {/* Status FINALIZADO: oferece reativar */}
          {ehFinalizado ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Status atual:</span>
                <Badge variant="outline" className={statusCfg.cls}>
                  {statusCfg.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Quer voltar pra "pendente" e decidir de novo?
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2"
                onClick={handleReativar}
                disabled={salvando}
              >
                {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                Reativar como pendente
              </Button>
            </div>
          ) : (
            <>
              {/* Status PENDENTE: lista matches + ações */}
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Possíveis matches em Contas a Pagar
                </div>
                {carregandoMatches ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Buscando matches...
                  </div>
                ) : !matches || matches.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    Nenhum match encontrado em Contas a Pagar.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {matches.map((m) => (
                      <button
                        key={m.conta_pagar_id}
                        onClick={() => setSelecionado(m.conta_pagar_id)}
                        className={`w-full text-left p-2 border rounded text-xs transition-colors ${
                          selecionado === m.conta_pagar_id
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{m.descricao}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {formatBRL(m.valor)} · venc {formatDataBR(m.data_vencimento)}
                            </div>
                          </div>
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
                            {m.score}%
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="space-y-1.5 pt-1 border-t">
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleConciliar}
                  disabled={!selecionado || salvando}
                >
                  {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Conciliar selecionada
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    setOpen(false);
                    onCriarDespesa?.(lancamento.id);
                  }}
                  disabled={salvando}
                >
                  <Plus className="h-3 w-3" />
                  Criar despesa daqui
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full gap-2 text-zinc-600"
                  onClick={handleIgnorar}
                  disabled={salvando}
                >
                  <X className="h-3 w-3" />
                  Ignorar
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
