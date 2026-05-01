import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Link2, FileText } from "lucide-react";
import { toast } from "sonner";

type CandidatoNF = {
  nf_id: string;
  nf_numero: string;
  nf_chave_acesso: string;
  fornecedor_razao_social: string;
  fornecedor_cliente: string;
  fornecedor_cnpj: string;
  nf_data_emissao: string;
  valor_total: number;
  descricao: string;
  categoria_id: string | null;
  categoria_codigo: string | null;
  categoria_nome: string | null;
  score: number;
  motivos: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  contaDescricao: string;
  contaValor: number;
  onVinculado?: () => void;
}

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v ?? 0);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, dd] = d.slice(0, 10).split("-");
  return `${dd}/${m}/${y}`;
}

export default function BuscarNFStageDialog({
  open,
  onOpenChange,
  contaId,
  contaDescricao,
  contaValor,
  onVinculado,
}: Props) {
  const qc = useQueryClient();
  const [vinculando, setVinculando] = useState<string | null>(null);

  const { data: candidatos = [], isLoading } = useQuery({
    queryKey: ["buscar-nfs-stage", contaId],
    enabled: open && !!contaId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "buscar_nfs_stage_para_conta",
        { p_conta_id: contaId }
      );
      if (error) throw error;
      return (data || []) as CandidatoNF[];
    },
  });

  async function handleVincular(nfId: string) {
    setVinculando(nfId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("vincular_nf_a_conta", {
        p_nf_id: nfId,
        p_conta_id: contaId,
      });
      if (error) throw error;
      if (!data?.ok) {
        toast.error(data?.erro || "Erro ao vincular");
        return;
      }
      toast.success("NF vinculada — dados enriquecidos");
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      qc.invalidateQueries({ queryKey: ["conta-pagar-detalhe", contaId] });
      qc.invalidateQueries({ queryKey: ["nfs-stage"] });
      if (onVinculado) onVinculado();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setVinculando(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Buscar NF em Stage
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <div>
              Conta: <span className="font-medium">{contaDescricao}</span> —{" "}
              {formatBRL(contaValor)}
            </div>
            <div className="text-xs">
              IA busca match por CNPJ, valor, razão social, nome fantasia e data de emissão.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : candidatos.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground space-y-2">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p>Nenhuma NF compatível encontrada em Stage.</p>
              <p className="text-xs">
                Use o botão "Anexar NF" pra subir um PDF/XML manualmente.
              </p>
            </div>
          ) : (
            candidatos.map((c) => (
              <div
                key={c.nf_id}
                className="flex items-start justify-between gap-3 p-3 border rounded-md hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {c.fornecedor_razao_social || c.fornecedor_cliente || "—"}
                    </span>
                    <Badge
                      className={
                        c.score >= 80
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]"
                          : c.score >= 60
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]"
                      }
                    >
                      {c.score}% match
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    NF nº {c.nf_numero || "—"} · {formatDate(c.nf_data_emissao)} ·{" "}
                    {formatBRL(c.valor_total)}
                    {(() => {
                      if (!contaValor || contaValor <= 0) return null;
                      const ratio = c.valor_total / contaValor;
                      const ratioRounded = Math.round(ratio);
                      if (
                        ratioRounded >= 2 &&
                        ratioRounded <= 36 &&
                        Math.abs(ratio - ratioRounded) <= 0.02
                      ) {
                        return (
                          <span className="text-blue-700 font-medium">
                            {" "}({ratioRounded}x {formatBRL(contaValor)})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </p>
                  {c.fornecedor_cnpj && (
                    <p className="text-xs text-muted-foreground">
                      CNPJ {c.fornecedor_cnpj}
                    </p>
                  )}
                  {c.categoria_codigo && (
                    <p className="text-xs text-muted-foreground">
                      📁 {c.categoria_codigo} {c.categoria_nome}
                    </p>
                  )}
                  {c.motivos && (
                    <p className="text-[11px] text-blue-600">
                      ✨ {c.motivos}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleVincular(c.nf_id)}
                  disabled={!!vinculando}
                  className="gap-1 shrink-0"
                >
                  {vinculando === c.nf_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                  Vincular
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
