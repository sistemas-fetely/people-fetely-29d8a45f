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
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conta = Record<string, any> & {
  id: string;
  status: string;
  status_efetivo?: string | null;
  descricao: string;
  valor: number;
  tem_doc_pendente?: boolean | null;
  movimentacao_bancaria_id?: string | null;
  nf_stage_id?: string | null;
  nf_numero_repositorio?: string | null;
  email_pagamento_enviado?: boolean | null;
};

interface Props {
  conta: Conta;
}

type EstadoIcone = "feito" | "pendente" | "na";

const COR_ICONE: Record<EstadoIcone, string> = {
  feito: "text-emerald-600 hover:bg-emerald-50",
  pendente: "text-rose-600 hover:bg-rose-50",
  na: "text-zinc-300 cursor-not-allowed hover:bg-transparent",
};

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

  // ESTADOS
  const status = conta.status;
  const temNF = !!conta.nf_stage_id;
  const aprovado =
    status === "aprovado" ||
    status === "aguardando_pagamento" ||
    status === "doc_pendente" ||
    status === "paga";
  const emailEnviado = !!conta.email_pagamento_enviado;
  const temMov = !!conta.movimentacao_bancaria_id;

  const estadoNF: EstadoIcone = temNF ? "feito" : "pendente";
  const estadoAprovar: EstadoIcone = aprovado ? "feito" : "pendente";
  const estadoEmail: EstadoIcone = emailEnviado
    ? "feito"
    : status === "aprovado" || status === "doc_pendente"
      ? "pendente"
      : "na";
  const estadoMov: EstadoIcone = temMov
    ? "feito"
    : status === "aprovado"
      ? "pendente"
      : "na";

  async function handleAprovar() {
    if (estadoAprovar !== "pendente") return;
    setAprovando(true);
    try {
      await workflow.mudarStatus.mutateAsync({
        contaId: conta.id,
        statusAnterior: status,
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
    if (estadoMov !== "pendente") {
      if (estadoMov === "feito") toast.info("Já tem movimentação vinculada");
      else toast.info("Aprove antes de lançar em Movimentação");
      return;
    }
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

  function handleEmail() {
    if (estadoEmail === "na") {
      toast.info("Aprove a conta antes de enviar email");
      return;
    }
    if (estadoEmail === "feito") {
      toast.info("Email já enviado — abra o drawer pra reenviar se precisar");
      return;
    }
    setShowEnviar(true);
  }

  const tooltipNF = temNF ? "NF anexada" : "Sem NF — clique pra anexar";
  const tooltipAprovar = aprovado ? "Já aprovada" : "Aprovar pagamento";
  const tooltipEmail =
    estadoEmail === "feito"
      ? "Email enviado"
      : estadoEmail === "pendente"
        ? "Enviar email de pagamento"
        : "Aprove antes de enviar email";
  const tooltipMov =
    estadoMov === "feito"
      ? "Já em Movimentação"
      : estadoMov === "pendente"
        ? "Lançar em Movimentação"
        : "Aprove antes de lançar em Movimentação";

  return (
    <div className="flex items-center gap-1" onClick={stopVoid}>
      {/* 1) NF — sempre visível */}
      {estadoNF === "pendente" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={cn("h-7 w-7", COR_ICONE[estadoNF])}
              title={tooltipNF}
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
              onClick={stop(() =>
                toast.info("Use o drawer para upload de NF nova"),
              )}
            >
              <Upload className="h-3.5 w-3.5 mr-2" />
              Upload novo arquivo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          className={cn("h-7 w-7", COR_ICONE[estadoNF])}
          title={tooltipNF}
          onClick={stopVoid}
        >
          <Paperclip className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* 2) Aprovar */}
      <Button
        size="icon"
        variant="ghost"
        className={cn("h-7 w-7", COR_ICONE[estadoAprovar])}
        title={tooltipAprovar}
        disabled={aprovando}
        onClick={stop(handleAprovar)}
      >
        {aprovando ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ThumbsUp className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* 3) Email */}
      <Button
        size="icon"
        variant="ghost"
        className={cn("h-7 w-7", COR_ICONE[estadoEmail])}
        title={tooltipEmail}
        onClick={stop(handleEmail)}
      >
        <Send className="h-3.5 w-3.5" />
      </Button>

      {/* 4) Movimentação */}
      <Button
        size="icon"
        variant="ghost"
        className={cn("h-7 w-7", COR_ICONE[estadoMov])}
        title={tooltipMov}
        disabled={lancandoMov}
        onClick={stop(handleLancarMov)}
      >
        {lancandoMov ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ArrowRightLeft className="h-3.5 w-3.5" />
        )}
      </Button>

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
