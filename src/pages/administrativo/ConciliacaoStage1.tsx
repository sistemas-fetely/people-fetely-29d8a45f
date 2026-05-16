import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  FileSpreadsheet, Loader2, Link2, Search, AlertCircle, CheckCircle2, Plus,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { CriarCPRAvulsaDialog } from "@/components/financeiro/CriarCPRAvulsaDialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

type ContaBancaria = { id: string; nome_exibicao: string };

type PlanilhaItem = {
  id: string;
  nome_favorecido: string | null;
  cnpj_favorecido: string | null;
  tipo_pagamento: string | null;
  valor_pago: number | null;
  data_pagamento: string | null;
  status_conciliacao: string;
};

type Candidato = {
  movimentacao_id: string;
  data_transacao: string;
  descricao: string;
  valor: number;
  conta_pagar_id: string | null;
  conta_pagar_descricao: string | null;
  parceiro_nome: string | null;
  parceiro_cnpj: string | null;
  match_nivel: number;
  match_descricao: string;
};

export default function ConciliacaoStage1() {
  const qc = useQueryClient();
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [drawerPlanilha, setDrawerPlanilha] = useState<PlanilhaItem | null>(null);
  const [criarCPROpen, setCriarCPROpen] = useState(false);

  const { data: contas } = useQuery({
    queryKey: ["contas-bancarias-stage1"],
    queryFn: async () => {
      const { data } = await sb
        .from("contas_bancarias")
        .select("id, nome_exibicao")
        .eq("ativo", true)
        .eq("tipo", "corrente")
        .order("nome_exibicao");
      return (data || []) as ContaBancaria[];
    },
  });

  const { data: pendentes = [], isLoading: loadingPend } = useQuery({
    queryKey: ["stage1-planilhas-pendentes", contaBancariaId],
    enabled: !!contaBancariaId,
    queryFn: async () => {
      const { data } = await sb
        .from("itau_pagamentos_stage")
        .select("id, nome_favorecido, cnpj_favorecido, tipo_pagamento, valor_pago, data_pagamento, status_conciliacao")
        .eq("conta_bancaria_id", contaBancariaId)
        .is("movimentacao_id", null)
        .not("status_conciliacao", "in", "(ignorado)")
        .order("data_pagamento", { ascending: false });
      return (data || []) as PlanilhaItem[];
    },
  });

  const { data: candidatos = [], isLoading: loadingCand } = useQuery({
    queryKey: ["stage1-candidatos", drawerPlanilha?.id],
    enabled: !!drawerPlanilha,
    queryFn: async () => {
      if (!drawerPlanilha) return [];
      const { data, error } = await sb.rpc("apontar_matches_stage_1", {
        p_planilha_id: drawerPlanilha.id,
      });
      if (error) throw error;
      return (data || []) as Candidato[];
    },
  });

  const vincularMutation = useMutation({
    mutationFn: async ({ planilhaId, movimentacaoId }: { planilhaId: string; movimentacaoId: string }) => {
      const { data, error } = await sb.rpc("vincular_stage_1", {
        p_planilha_id: planilhaId,
        p_movimentacao_id: movimentacaoId,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.motivo || "Erro desconhecido");
    },
    onSuccess: () => {
      toast.success("Vínculo Stage 1 criado — aguarda Stage 2");
      setDrawerPlanilha(null);
      qc.invalidateQueries({ queryKey: ["stage1-planilhas-pendentes", contaBancariaId] });
      qc.invalidateQueries({ queryKey: ["conciliacao-hub-stage1-count"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Link to="/administrativo/conciliacao" className="hover:text-foreground hover:underline">
          Conciliação
        </Link>
        <span>/</span>
        <span>Stage 1</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          Stage 1 — Planilha ↔ Movimentação
        </h1>
        <p className="text-sm text-muted-foreground">
          Cada linha da planilha Itaú corresponde a uma movimentação do sistema (criada quando uma CPR foi marcada como paga).
          A IA aponta matches por CNPJ, Data e Valor — você confirma.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Conta bancária:</span>
        <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Selecione uma conta" />
          </SelectTrigger>
          <SelectContent>
            {(contas ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome_exibicao}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!contaBancariaId ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Selecione uma conta bancária para começar.
          </CardContent>
        </Card>
      ) : loadingPend ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando pendentes…
        </div>
      ) : pendentes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <p className="font-medium">Nenhuma linha pendente nesta conta.</p>
            <p className="text-sm text-muted-foreground">
              Importe uma planilha em{" "}
              <Link to="/administrativo/importar-dados" className="underline">
                Importar Dados
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {pendentes.length} linha{pendentes.length !== 1 ? "s" : ""} pendente{pendentes.length !== 1 ? "s" : ""}
          </div>
          {pendentes.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 p-4 border rounded-md bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{p.nome_favorecido ?? "—"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.cnpj_favorecido ?? "Sem CNPJ"} · {p.tipo_pagamento ?? "—"}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-xs text-muted-foreground">
                  {p.data_pagamento ? formatDateBR(p.data_pagamento) : "—"}
                </div>
                <div className="font-medium tabular-nums">
                  {formatBRL(p.valor_pago ?? 0)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setDrawerPlanilha(p)}
                >
                  <Search className="h-3.5 w-3.5" />
                  Buscar matches
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {drawerPlanilha && (
        <Dialog open={!!drawerPlanilha} onOpenChange={(v) => { if (!v) setDrawerPlanilha(null); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Candidatos para vínculo Stage 1</DialogTitle>
              <DialogDescription>
                Selecione a movimentação do sistema que corresponde a esta linha da planilha.
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 rounded-md bg-muted/50 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium truncate">{drawerPlanilha.nome_favorecido ?? "—"}</span>
                <span className="font-medium tabular-nums">{formatBRL(drawerPlanilha.valor_pago ?? 0)}</span>
              </div>
              <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                <span>CNPJ: {drawerPlanilha.cnpj_favorecido ?? "—"}</span>
                <span>·</span>
                <span>Data: {drawerPlanilha.data_pagamento ? formatDateBR(drawerPlanilha.data_pagamento) : "—"}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-auto">
              <div className="text-sm font-medium">Movimentações candidatas:</div>
              {loadingCand ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando matches…
                </div>
              ) : candidatos.length === 0 ? (
                <div className="flex items-start gap-3 p-4 border rounded-md bg-amber-50 text-amber-900">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium">Nenhuma movimentação candidata encontrada nesta conta.</p>
                    <p className="text-xs">
                      Possível causa: a CPR correspondente ainda não foi marcada como paga (sem movimentação criada).
                      Resolva em Contas a Pagar e volte aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {candidatos.map((c) => {
                    const nivelClass =
                      c.match_nivel === 1 ? "bg-emerald-100 text-emerald-800" :
                      c.match_nivel === 2 ? "bg-amber-100 text-amber-800" :
                                            "bg-muted text-muted-foreground";
                    return (
                      <div
                        key={c.movimentacao_id}
                        className="flex items-start justify-between gap-3 p-3 border rounded-md hover:bg-accent/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div>
                            <Badge className={`${nivelClass} hover:${nivelClass}`}>
                              Match {c.match_nivel} · {c.match_descricao}
                            </Badge>
                          </div>
                          <div className="font-medium truncate">
                            {c.parceiro_nome ?? c.descricao ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {c.conta_pagar_descricao ?? c.descricao}
                            {c.parceiro_cnpj ? ` · CNPJ ${c.parceiro_cnpj}` : ""}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="font-medium tabular-nums">{formatBRL(c.valor)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateBR(c.data_transacao)}
                          </div>
                          <Button
                            size="sm"
                            className="gap-1 mt-1"
                            disabled={vincularMutation.isPending}
                            onClick={() => vincularMutation.mutate({
                              planilhaId: drawerPlanilha.id,
                              movimentacaoId: c.movimentacao_id,
                            })}
                          >
                            {vincularMutation.isPending
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Link2 className="h-3.5 w-3.5" />}
                            Vincular
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDrawerPlanilha(null)}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
