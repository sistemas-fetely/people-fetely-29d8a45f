import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ThumbsUp,
  Send,
  ArrowRightLeft,
  FileSearch,
  Paperclip,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import EnviarPagamentoDialog from "./EnviarPagamentoDialog";
import BuscarNFStageDialog from "./BuscarNFStageDialog";
import { useContaWorkflow, type ContaStatus } from "@/hooks/useContaWorkflow";

// Aceita o shape da view consolidada (campos extras são ignorados).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conta = Record<string, any> & {
  id: string;
  status: string;
  descricao: string;
  valor: number;
  tem_doc_pendente?: boolean | null;
  movimentacao_bancaria_id?: string | null;
  nf_stage_id?: string | null;
};

interface Props {
  conta: Conta;
}

export default function AcoesInlineConta({ conta }: Props) {
  const qc = useQueryClient();
  const workflow = useContaWorkflow();
  const [aprovando, setAprovando] = useState(false);
  const [lancandoMov, setLancandoMov] = useState(false);
  const [showEnviar, setShowEnviar] = useState(false);
  const [showBuscar, setShowBuscar] = useState(false);

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const stopVoid = (e: React.MouseEvent) => e.stopPropagation();

  const extractMsg = (e: unknown) =>
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null
        ? ((e as { message?: string }).message ?? JSON.stringify(e))
        : String(e);

  const podeAprovar = conta.status === "aberto" || conta.status === "atrasado";
  const podeEnviarEmail =
    conta.status === "aprovado" || conta.status === "doc_pendente";
  const podeLancarMov =
    conta.status === "aprovado" && !conta.movimentacao_bancaria_id;
  const semNF = !conta.nf_stage_id;

  async function handleAprovar() {
    setAprovando(true);
    try {
      await workflow.mudarStatus.mutateAsync({
        contaId: conta.id,
        statusAnterior: conta.status,
        novoStatus: "aprovado" as ContaStatus,
      });
      toast.success("Conta aprovada");
    } catch (e) {
      toast.error("Erro: " + extractMsg(e));
    } finally {
      setAprovando(false);
    }
  }

  async function handleLancarMov() {
    setLancandoMov(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any).rpc(
        "gerar_movimentacao_de_conta",
        { p_conta_id: conta.id },
      );
      if (error) throw error;
      if (!result?.ok) {
        toast.error(result?.erro || "Erro ao lançar em movimentação");
        return;
      }
      toast.success(
        result?.ja_existia ? "Já tinha movimentação" : "Lançada em Movimentação",
      );
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      qc.invalidateQueries({ queryKey: ["lancamentos-caixa-banco"] });
    } catch (e) {
      toast.error("Erro: " + extractMsg(e));
    } finally {
      setLancandoMov(false);
    }
  }

  return (
    <div className="flex items-center gap-1" onClick={stopVoid}>
      {/* NF (Upload + Buscar no Stage) */}
      {semNF && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Anexar NF"
              onClick={stopVoid}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={stopVoid}>
            <DropdownMenuItem onClick={stop(() => setShowBuscar(true))}>
              <FileSearch className="h-3.5 w-3.5 mr-2" />
              Buscar no Stage
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={stop(() => {
                toast.info("Use o drawer para upload de NF nova");
              })}
            >
              <Upload className="h-3.5 w-3.5 mr-2" />
              Upload novo arquivo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Aprovar */}
      {podeAprovar && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
          title="Aprovar conta"
          disabled={aprovando}
          onClick={stop(handleAprovar)}
        >
          {aprovando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="h-3.5 w-3.5" />
          )}
        </Button>
      )}

      {/* Enviar email */}
      {podeEnviarEmail && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-blue-600 hover:text-blue-700"
          title="Enviar para pagamento"
          onClick={stop(() => setShowEnviar(true))}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Lançar em Movimentação */}
      {podeLancarMov && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-purple-600 hover:text-purple-700"
          title="Lançar em movimentação"
          disabled={lancandoMov}
          onClick={stop(handleLancarMov)}
        >
          {lancandoMov ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRightLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      )}

      {/* Modais */}
      {showEnviar && (
        <EnviarPagamentoDialog
          open={showEnviar}
          onOpenChange={setShowEnviar}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          conta={conta as any}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["contas-pagar"] });
          }}
        />
      )}
      {showBuscar && (
        <BuscarNFStageDialog
          open={showBuscar}
          onOpenChange={setShowBuscar}
          contaId={conta.id}
          contaDescricao={conta.descricao}
          contaValor={conta.valor}
          onVinculado={() => {
            qc.invalidateQueries({ queryKey: ["contas-pagar"] });
            qc.invalidateQueries({ queryKey: ["nfs-stage"] });
          }}
        />
      )}
    </div>
  );
}
