import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePedidosPipeline } from "@/hooks/pedidos/usePedidosPipeline";
import { ESTAGIO_LABELS, PIPELINE_PRINCIPAL } from "@/types/pedido";
import type { EstagioPedido } from "@/types/pedido";
import { ESTAGIO_CORES } from "./BadgesPedido";
import { useMemo } from "react";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

interface Props {
  onClickEstagio?: (estagio: EstagioPedido) => void;
  estagioAtivo?: EstagioPedido | null;
}

interface EstagioConsolidado {
  estagio: EstagioPedido;
  qtd: number;
  valor: number;
  sla: number;
}

export function PipelineHorizontal({ onClickEstagio, estagioAtivo }: Props) {
  const { data, isLoading } = usePedidosPipeline();

  const consolidado: EstagioConsolidado[] = useMemo(() => {
    const map = new Map<EstagioPedido, { qtd: number; valor: number; sla: number }>();
    PIPELINE_PRINCIPAL.forEach((e) => map.set(e, { qtd: 0, valor: 0, sla: 0 }));
    (data || []).forEach((row) => {
      const atual = map.get(row.estagio as EstagioPedido);
      if (!atual) return; // estágios fora do pipeline principal (cancelado, recuperacao_venda)
      atual.qtd += row.qtd;
      atual.valor += Number(row.soma_valor || 0);
      atual.sla += row.qtd_sla_estourado;
    });
    return PIPELINE_PRINCIPAL.map((estagio) => ({
      estagio,
      ...(map.get(estagio) || { qtd: 0, valor: 0, sla: 0 }),
    }));
  }, [data]);

  const totalAtivo = consolidado
    .filter((e) => e.estagio !== "entregue")
    .reduce((acc, e) => acc + e.qtd, 0);
  const totalPipeline = consolidado.reduce((acc, e) => acc + e.qtd, 0);
  const slaEstouradoTotal = consolidado.reduce((acc, e) => acc + e.sla, 0);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold">{totalAtivo} em operação</span>
            <span className="text-muted-foreground"> · {totalPipeline} no pipeline</span>
          </div>
          {slaEstouradoTotal > 0 && (
            <div className="text-xs text-red-600 font-medium">
              {slaEstouradoTotal} pedido{slaEstouradoTotal > 1 ? "s" : ""} com SLA estourado
            </div>
          )}
        </div>

        {/* Barra de segmentos */}
        <div className="flex h-8 w-full rounded-md overflow-hidden border border-border">
          {consolidado.map(({ estagio, qtd }) => {
            const flexBase = qtd > 0 ? Math.max(qtd, 0.5) : 0.4;
            const isAtivo = estagioAtivo === estagio;
            return (
              <button
                key={estagio}
                type="button"
                onClick={() => onClickEstagio?.(estagio)}
                style={{ flex: flexBase }}
                title={`${ESTAGIO_LABELS[estagio]}: ${qtd}`}
                className={cn(
                  "text-[11px] font-medium text-white px-1 transition-all hover:opacity-90 border-r border-background last:border-r-0",
                  ESTAGIO_CORES[estagio],
                  qtd === 0 && "opacity-30",
                  isAtivo && "ring-2 ring-foreground/40 ring-inset",
                )}
              >
                {qtd > 0 ? qtd : ""}
              </button>
            );
          })}
        </div>

        {/* Legenda — todos os estágios do pipeline principal */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {consolidado.map(({ estagio, qtd, valor, sla }) => (
            <div key={estagio} className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-sm", ESTAGIO_CORES[estagio])} />
              <span>{ESTAGIO_LABELS[estagio]}</span>
              <span className="font-medium text-foreground">· {qtd}</span>
              {qtd > 0 && <span>· {fmtBRL(valor)}</span>}
              {sla > 0 && (
                <span className="text-red-600 font-medium">· {sla} SLA</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
