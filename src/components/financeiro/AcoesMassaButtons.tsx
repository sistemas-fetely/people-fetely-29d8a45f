import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useContaWorkflow, type ContaStatus } from "@/hooks/useContaWorkflow";
import { toast } from "sonner";

export interface ContaSelecionada {
  id: string;
  status: string;
  conta_id: string | null;
  tem_nf: boolean;
}

interface Props {
  contas: ContaSelecionada[];
  onDone: () => void;
}

export default function AcoesMassaButtons({ contas, onDone }: Props) {
  const [executando, setExecutando] = useState(false);
  const workflow = useContaWorkflow();

  function countStatus(...statuses: string[]) {
    return contas.filter((c) => statuses.includes(c.status)).length;
  }

  async function executarLote(
    novoStatus: ContaStatus,
    filtroStatuses: string[],
    observacao: string,
  ) {
    setExecutando(true);
    let sucesso = 0;
    let pulados = 0;
    let erros = 0;

    for (const conta of contas) {
      if (!filtroStatuses.includes(conta.status)) {
        pulados++;
        continue;
      }

      // Se é rascunho indo pra "aberto" sem categoria → pula
      if (
        conta.status === "rascunho" &&
        novoStatus === "aberto" &&
        !conta.conta_id
      ) {
        pulados++;
        continue;
      }

      try {
        await workflow.mudarStatus.mutateAsync({
          contaId: conta.id,
          statusAnterior: conta.status,
          novoStatus,
          observacao,
        });
        sucesso++;
      } catch {
        erros++;
      }
    }

    let msg = `${sucesso} atualizada${sucesso !== 1 ? "s" : ""}`;
    if (pulados > 0) msg += ` (${pulados} pulada${pulados > 1 ? "s" : ""})`;
    if (erros > 0) msg += ` (${erros} erro${erros > 1 ? "s" : ""})`;

    if (sucesso > 0) toast.success(msg);
    else if (pulados > 0) toast.warning(msg);
    else toast.error(msg);

    setExecutando(false);
    onDone();
  }

  const nRascunho = countStatus("rascunho");
  const nAberto = countStatus("aberto", "atrasado");

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {executando && <Loader2 className="h-4 w-4 animate-spin" />}

      {/* VALIDAR (rascunho → aberto) */}
      {nRascunho > 0 && (
        <Button
          size="sm"
          variant="outline"
          disabled={executando}
          onClick={() => executarLote("aberto", ["rascunho"], "Validado em massa")}
        >
          Validar {nRascunho}
        </Button>
      )}

      {/* APROVAR (aberto → aprovado) */}
      {nAberto > 0 && (
        <Button
          size="sm"
          variant="outline"
          disabled={executando}
          onClick={() => executarLote("aprovado", ["aberto", "atrasado"], "Aprovado em massa")}
        >
          Aprovar {nAberto}
        </Button>
      )}

      {/* MAIS AÇÕES VIRÃO NAS PRÓXIMAS FASES */}
    </div>
  );
}
