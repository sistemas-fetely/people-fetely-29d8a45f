import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Link2, Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format-currency";
import { VincularLancamentoModal } from "./VincularLancamentoModal";

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  data_compra: string;
  status: string;
  conta_pagar_id?: string | null;
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
        { p_lancamento_id: lancamento.id }
      );
      if (error) throw error;
      if (!resultado?.ok) {
        toast.error(resultado?.erro || "Erro ao criar despesa");
        return;
      }
      toast.success(
        `Despesa aprovada criada: ${resultado.descricao} — ${formatBRL(resultado.valor)}`,
        { duration: 5000 }
      );
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
          className="h-6 px-2 text-[10px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
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
          onClick={handleCriarDespesa}
          disabled={salvando}
        >
          {salvando ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
          Criar Conta
        </Button>
      </div>

      <VincularLancamentoModal
        open={vincularOpen}
        onOpenChange={setVincularOpen}
        lancamento={lancamento}
      />
    </>
  );
}
