import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Link2,
  ArrowRight,
  GitMerge,
  CreditCard,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { classificarComAprendizado } from "@/hooks/useEngineClassificacao";

type LancamentoSemMatch = {
  id: string;
  data_compra: string;
  descricao: string;
  valor: number;
  cnpj_estabelecimento: string | null;
  categoria_id: string | null;
  fatura: {
    id: string;
    conta_bancaria: { nome_exibicao: string | null } | null;
  } | null;
};

type SugestaoMatch = {
  nf_id: string;
  nf_numero: string;
  nf_fornecedor: string;
  nf_cnpj: string | null;
  nf_valor: number;
  nf_data: string;
  nf_categoria_id: string | null;
  score: number;
  motivo: string;
};

function classeScore(score: number): string {
  if (score >= 90) return "bg-emerald-100 text-emerald-900 border-emerald-300";
  if (score >= 70) return "bg-green-100 text-green-800 border-green-300";
  if (score >= 50) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-orange-100 text-orange-800 border-orange-300";
}

function labelScore(score: number): string {
  if (score >= 90) return "Match perfeito";
  if (score >= 70) return "Match forte";
  if (score >= 50) return "Match razoável";
  return "Match fraco";
}

export default function ReconciliacaoCartao() {
  const qc = useQueryClient();
  const [vinculando, setVinculando] = useState<Set<string>>(new Set());

  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ["reconciliacao-cartao-pendentes"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("fatura_cartao_lancamentos")
        .select(`
          id, data_compra, descricao, valor, cnpj_estabelecimento, categoria_id,
          fatura:faturas_cartao(id, conta_bancaria:contas_bancarias(nome_exibicao))
        `)
        .is("nf_vinculada_id", null)
        .order("data_compra", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as LancamentoSemMatch[];
    },
  });

  const { data: sugestoesPorLanc } = useQuery({
    queryKey: [
      "reconciliacao-cartao-sugestoes",
      (lancamentos || []).map((l) => l.id).join(","),
    ],
    queryFn: async () => {
      if (!lancamentos || lancamentos.length === 0) return {};
      const result: Record<string, SugestaoMatch[]> = {};
      for (let i = 0; i < lancamentos.length; i += 10) {
        const lote = lancamentos.slice(i, i + 10);
        const promessas = lote.map(async (l) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (supabase as any).rpc(
            "sugerir_match_cartao_nf",
            { p_lancamento_id: l.id },
          );
          return { id: l.id, sugs: (data || []) as SugestaoMatch[] };
        });
        const respostas = await Promise.all(promessas);
        respostas.forEach((r) => {
          result[r.id] = r.sugs;
        });
      }
      return result;
    },
    enabled: !!lancamentos && lancamentos.length > 0,
  });

  const stats = useMemo(() => {
    if (!lancamentos || !sugestoesPorLanc)
      return { total: 0, comSug: 0, fortes: 0 };
    const total = lancamentos.length;
    let comSug = 0;
    let fortes = 0;
    lancamentos.forEach((l) => {
      const sugs = sugestoesPorLanc[l.id];
      if (sugs && sugs.length > 0) {
        comSug++;
        if (sugs[0].score >= 90) fortes++;
      }
    });
    return { total, comSug, fortes };
  }, [lancamentos, sugestoesPorLanc]);

  async function vincular(lancId: string, sug: SugestaoMatch) {
    setVinculando((prev) => new Set(prev).add(lancId));
    try {
      const updates: {
        nf_vinculada_id: string;
        status: string;
        categoria_id?: string;
      } = {
        nf_vinculada_id: sug.nf_id,
        status: "classificado",
      };
      if (sug.nf_categoria_id) {
        updates.categoria_id = sug.nf_categoria_id;
      }
      const { error } = await supabase
        .from("fatura_cartao_lancamentos")
        .update(updates)
        .eq("id", lancId);

      if (error) throw error;

      const lanc = lancamentos?.find((l) => l.id === lancId);
      if (lanc && sug.nf_categoria_id) {
        await classificarComAprendizado({
          descricao: lanc.descricao,
          cnpj: lanc.cnpj_estabelecimento,
          categoria_id: sug.nf_categoria_id,
          origem: "cartao",
        });
      }

      toast.success("Vinculado e classificado pela NF");
      qc.invalidateQueries({ queryKey: ["reconciliacao-cartao-pendentes"] });
      qc.invalidateQueries({ queryKey: ["faturas-cartao"] });
      qc.invalidateQueries({ queryKey: ["fatura-lancamentos"] });
      qc.invalidateQueries({ queryKey: ["engine-regras-ativas"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao vincular";
      toast.error(msg);
    } finally {
      setVinculando((prev) => {
        const next = new Set(prev);
        next.delete(lancId);
        return next;
      });
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitMerge className="h-6 w-6 text-primary" />
            Reconciliação Cartão ↔ NF
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Convergência: cada lançamento de cartão herda categoria da NF
            correspondente. Engine aprende a cada vínculo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">
              Aguardando Match
            </p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-violet-700 uppercase">Com Sugestão</p>
            <p className="text-2xl font-bold text-violet-900">{stats.comSug}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-emerald-700 uppercase">Match Perfeito</p>
            <p className="text-2xl font-bold text-emerald-900">
              {stats.fortes}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Lançamentos com sugestão de NF
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!lancamentos || lancamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm">Tudo reconciliado! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lancamentos.map((l) => {
                const sugs = sugestoesPorLanc?.[l.id] || [];
                const melhor = sugs[0];
                const isVinculando = vinculando.has(l.id);

                return (
                  <div
                    key={l.id}
                    className="border rounded-lg p-3 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p
                            className="text-sm font-medium truncate"
                            title={l.descricao}
                          >
                            {l.descricao}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateBR(l.data_compra)} ·{" "}
                            {formatBRL(l.valor)}
                            {l.cnpj_estabelecimento && (
                              <span className="ml-1">
                                · CNPJ {l.cnpj_estabelecimento}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {melhor ? (
                        <>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p
                                  className="text-sm font-medium truncate"
                                  title={melhor.nf_fornecedor}
                                >
                                  NF {melhor.nf_numero} ·{" "}
                                  {melhor.nf_fornecedor}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] ${classeScore(melhor.score)}`}
                                >
                                  {labelScore(melhor.score)} · {melhor.score}{" "}
                                  pts
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDateBR(melhor.nf_data)} ·{" "}
                                {formatBRL(melhor.nf_valor)} · {melhor.motivo}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={isVinculando}
                            onClick={() => vincular(l.id, melhor)}
                            className="gap-1 shrink-0"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Vincular
                          </Button>
                        </>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground"
                        >
                          Sem sugestão de NF
                        </Badge>
                      )}
                    </div>

                    {sugs.length > 1 && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                          + {sugs.length - 1} outra
                          {sugs.length > 2 ? "s" : ""} sugestão
                          {sugs.length > 2 ? "ões" : ""}
                        </summary>
                        <div className="mt-2 space-y-1 pl-4">
                          {sugs.slice(1).map((s) => (
                            <div
                              key={s.nf_id}
                              className="flex items-center justify-between gap-2 text-[10px]"
                            >
                              <span className="truncate flex-1">
                                NF {s.nf_numero} · {s.nf_fornecedor} ·{" "}
                                {formatBRL(s.nf_valor)}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] ${classeScore(s.score)}`}
                              >
                                {s.score} pts
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isVinculando}
                                onClick={() => vincular(l.id, s)}
                                className="h-6 text-[10px]"
                              >
                                Vincular
                              </Button>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
