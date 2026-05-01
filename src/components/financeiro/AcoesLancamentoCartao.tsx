import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Link2, Loader2, CheckCircle2, XCircle, RotateCcw, Layers, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format-currency";
import { VincularLancamentoModal } from "./VincularLancamentoModal";
import { AgruparLancamentosModal } from "./AgruparLancamentosModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  data_compra: string;
  status: string;
  conta_pagar_id?: string | null;
  fatura_id?: string | null;
}

interface Props {
  lancamento: Lancamento;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  conciliado: { label: "Vinculada", cls: "bg-emerald-50 text-emerald-700 border-emerald-300", icon: Link2 },
  virou_despesa: { label: "Virou despesa", cls: "bg-blue-50 text-blue-700 border-blue-300", icon: CheckCircle2 },
  ignorado: { label: "Ignorada", cls: "bg-zinc-50 text-zinc-700 border-zinc-300", icon: XCircle },
};

export function AcoesLancamentoCartao({ lancamento }: Props) {
  const [salvando, setSalvando] = useState(false);
  const [vincularOpen, setVincularOpen] = useState(false);
  const [criarOpen, setCriarOpen] = useState(false);
  const [agruparOpen, setAgruparOpen] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [gerarTodas, setGerarTodas] = useState(false);
  const qc = useQueryClient();

  // Se lançamento já tem ação tomada (conciliado, virou_despesa, ignorado),
  // mostra status + botão "Reativar"
  const finalizado = lancamento.status !== "pendente";

  async function handleCriarDespesa() {
    setSalvando(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: resultado, error } = await (supabase as any).rpc(
        "criar_despesa_de_lancamento",
        {
          p_lancamento_id: lancamento.id,
          p_total_parcelas: parcelas,
          p_gerar_todas: parcelas > 1 ? gerarTodas : false,
        }
      );
      if (error) throw error;
      if (!resultado?.ok) {
        toast.error(resultado?.erro || "Erro ao criar despesa");
        return;
      }
      const qtd = resultado.qtd_contas_criadas || 1;
      const msg = qtd > 1
        ? `${qtd} parcelas criadas: ${resultado.descricao} — ${formatBRL(resultado.valor)} cada`
        : `Despesa aprovada criada: ${resultado.descricao} — ${formatBRL(resultado.valor)}`;
      toast.success(msg, { duration: 5000 });
      setCriarOpen(false);
      qc.invalidateQueries({ queryKey: ["fatura-lancamentos"] });
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
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
      toast.success("Lançamento voltou pra pendente");
      qc.invalidateQueries({ queryKey: ["fatura-lancamentos"] });
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setSalvando(false);
    }
  }

  async function handleIgnorar() {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("fatura_cartao_lancamentos")
        .update({
          status: "ignorado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lancamento.id);
      if (error) throw error;
      toast.success("Lançamento ignorado");
      qc.invalidateQueries({ queryKey: ["fatura-lancamentos"] });
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setSalvando(false);
    }
  }

  // Estado FINALIZADO: mostra status + reativar
  if (finalizado) {
    const cfg = STATUS_CONFIG[lancamento.status];
    if (!cfg) return null;
    const IconCmp = cfg.icon;
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={`text-[10px] py-0 px-1.5 h-5 gap-1 ${cfg.cls}`}>
          <IconCmp className="h-2.5 w-2.5" />
          {cfg.label}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={handleReativar}
          disabled={salvando}
          title="Voltar pra pendente"
        >
          {salvando ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RotateCcw className="h-2.5 w-2.5" />}
        </Button>
      </div>
    );
  }

  // Estado PENDENTE: 2 botões diretos
  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px] gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
          onClick={() => setVincularOpen(true)}
          disabled={salvando}
        >
          <Link2 className="h-2.5 w-2.5" />
          Vincular
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px] gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
          onClick={() => {
            setParcelas(1);
            setGerarTodas(false);
            setCriarOpen(true);
          }}
          disabled={salvando}
        >
          {salvando ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
          Criar Conta
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={() => setAgruparOpen(true)}
          disabled={salvando}
          title="Agrupar com outro lançamento (estorno/complemento)"
        >
          <Layers className="h-2.5 w-2.5" />
          Agrupar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px] gap-1 border-zinc-300 text-zinc-600 hover:bg-zinc-50"
          onClick={handleIgnorar}
          disabled={salvando}
          title="Ocultar este lançamento"
        >
          {salvando ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <EyeOff className="h-2.5 w-2.5" />}
          Ignorar
        </Button>
      </div>

      <VincularLancamentoModal
        open={vincularOpen}
        onOpenChange={setVincularOpen}
        lancamento={lancamento}
      />

      <AgruparLancamentosModal
        open={agruparOpen}
        onOpenChange={setAgruparOpen}
        lancamentoPrincipal={lancamento}
      />

      <Dialog open={criarOpen} onOpenChange={setCriarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar conta a pagar</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-sm font-medium">{lancamento.descricao}</div>
              <div className="text-lg font-bold text-foreground">{formatBRL(lancamento.valor)}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parcelas-input">Parcelas</Label>
              <Input
                id="parcelas-input"
                type="number"
                min={1}
                max={48}
                value={parcelas}
                onChange={(e) => setParcelas(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <p className="text-xs text-muted-foreground">
                Forma de pagamento: Cartão de Crédito (preenchido automaticamente)
              </p>
            </div>

            {parcelas > 1 && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
                <div className="text-sm font-medium text-blue-900">
                  Compra parcelada em {parcelas}x — gerar todas as parcelas agora?
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={gerarTodas ? "default" : "outline"}
                    onClick={() => setGerarTodas(true)}
                    className="flex-1"
                  >
                    Sim, gerar {parcelas} parcelas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!gerarTodas ? "default" : "outline"}
                    onClick={() => setGerarTodas(false)}
                    className="flex-1"
                  >
                    Não, só essa
                  </Button>
                </div>
                <p className="text-xs text-blue-800">
                  {gerarTodas
                    ? `${parcelas} contas serão criadas com vencimento mensal`
                    : "Só esta parcela será criada agora — as próximas você cria conforme aparecerem nas próximas faturas"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCriarOpen(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={handleCriarDespesa} disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
