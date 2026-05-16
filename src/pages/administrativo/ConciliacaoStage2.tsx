import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Banknote, Loader2, Link2, Search, AlertCircle, CheckCircle2, Layers, Plus, TrendingUp, TrendingDown, Zap,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { CriarCPRAvulsaDialog } from "@/components/financeiro/CriarCPRAvulsaDialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

type ContaBancaria = { id: string; nome_exibicao: string };

type OFXItem = {
  id: string;
  data_transacao: string;
  descricao: string;
  valor: number;
};

type MatchExato = {
  planilha_id: string;
  nome_favorecido: string | null;
  cnpj_favorecido: string | null;
  valor_pago: number;
  data_pagamento: string | null;
  numero_lote: string | null;
  tipo_pagamento: string | null;
};

type MatchLote = {
  numero_lote: string;
  soma: number;
  qtd_planilhas: number;
  planilhas: Array<{
    planilha_id: string;
    nome_favorecido: string | null;
    cnpj_favorecido: string | null;
    valor_pago: number;
    data_pagamento: string | null;
    tipo_pagamento: string | null;
  }>;
};

type RespostaMatches = {
  exatos: MatchExato[];
  lotes: MatchLote[];
  erro?: string;
};

type Selecao =
  | { tipo: "exato"; planilha_id: string }
  | { tipo: "lote"; numero_lote: string; planilha_ids: string[] };

export default function ConciliacaoStage2() {
  const qc = useQueryClient();
  const [contaBancariaId, setContaBancariaId] = useState("");

  // Débitos
  const [drawerOfxDebito, setDrawerOfxDebito] = useState<OFXItem | null>(null);
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [criarCPRDebitoOpen, setCriarCPRDebitoOpen] = useState(false);

  // Créditos
  const [ofxCreditoSelecionado, setOfxCreditoSelecionado] = useState<OFXItem | null>(null);

  const { data: contas } = useQuery({
    queryKey: ["contas-bancarias-stage2"],
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

  const { data: pendDebitos = [], isLoading: loadingDebitos } = useQuery({
    queryKey: ["stage2-ofx-pendentes-debitos", contaBancariaId],
    enabled: !!contaBancariaId,
    queryFn: async () => {
      const { data } = await sb
        .from("ofx_transacoes_stage")
        .select("id, data_transacao, descricao, valor")
        .eq("conta_bancaria_id", contaBancariaId)
        .eq("status", "pendente")
        .lt("valor", 0)
        .order("data_transacao", { ascending: false });
      return (data || []) as OFXItem[];
    },
  });

  const { data: pendCreditos = [], isLoading: loadingCreditos } = useQuery({
    queryKey: ["stage2-ofx-pendentes-creditos", contaBancariaId],
    enabled: !!contaBancariaId,
    queryFn: async () => {
      const { data } = await sb
        .from("ofx_transacoes_stage")
        .select("id, data_transacao, descricao, valor")
        .eq("conta_bancaria_id", contaBancariaId)
        .eq("status", "pendente")
        .gt("valor", 0)
        .order("data_transacao", { ascending: false });
      return (data || []) as OFXItem[];
    },
  });

  const { data: matches, isLoading: loadingMatches } = useQuery({
    queryKey: ["stage2-matches", drawerOfxDebito?.id],
    enabled: !!drawerOfxDebito,
    queryFn: async () => {
      if (!drawerOfxDebito) return null;
      const { data, error } = await sb.rpc("apontar_matches_stage_2", {
        p_ofx_id: drawerOfxDebito.id,
      });
      if (error) throw error;
      return data as RespostaMatches;
    },
  });

  const vincularMutation = useMutation({
    mutationFn: async ({ ofxId, planilhaIds }: { ofxId: string; planilhaIds: string[] }) => {
      const { data, error } = await sb.rpc("vincular_stage_2", {
        p_ofx_id: ofxId,
        p_planilha_ids: planilhaIds,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.motivo || "Erro desconhecido");
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(
        `Conciliado ✓ — ${d.movs_atualizadas} mov(s) com pg_em ${formatDateBR(d.pg_em_aplicado)}`
      );
      fecharDrawerDebito();
      qc.invalidateQueries({ queryKey: ["stage2-ofx-pendentes-debitos", contaBancariaId] });
      qc.invalidateQueries({ queryKey: ["conciliacao-hub-stage2-count"] });
      qc.invalidateQueries({ queryKey: ["conciliacao-hub-stage1-count"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  function handleVincular() {
    if (!drawerOfxDebito || !selecao) return;
    const planilhaIds = selecao.tipo === "exato" ? [selecao.planilha_id] : selecao.planilha_ids;
    vincularMutation.mutate({ ofxId: drawerOfxDebito.id, planilhaIds });
  }

  function fecharDrawerDebito() {
    setDrawerOfxDebito(null);
    setSelecao(null);
    setCriarCPRDebitoOpen(false);
  }

  const exatos = matches?.exatos ?? [];
  const lotes = matches?.lotes ?? [];
  const semMatches = !loadingMatches && exatos.length === 0 && lotes.length === 0 && !matches?.erro;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/administrativo/conciliacao" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Conciliação
        </Link>
        <span>/</span>
        <span className="text-foreground">Stage 2</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Banknote className="h-6 w-6" />
          Stage 2 — Planilha ↔ Extrato OFX
        </h1>
        <p className="text-sm text-muted-foreground">
          Débitos: cada linha do OFX casa com 1 ou N planilhas Stage 1. Créditos: receitas registradas direto do OFX. A <code>pg_em</code> das movimentações vinculadas recebe a data do extrato.
        </p>
      </div>

      <div>
        <Link
          to="/administrativo/regras-ofx"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Zap className="h-3.5 w-3.5" />
          Configurar regras automáticas
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Conta bancária:</span>
        <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Selecione…" />
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
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Selecione uma conta bancária para começar.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="debitos" className="w-full">
          <TabsList>
            <TabsTrigger value="debitos" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              Débitos
              {pendDebitos.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendDebitos.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="creditos" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Créditos
              {pendCreditos.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendCreditos.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="debitos" className="space-y-2 mt-4">
            {loadingDebitos ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : pendDebitos.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
                  <p className="text-sm font-medium">Nenhum débito OFX pendente nesta conta.</p>
                </CardContent>
              </Card>
            ) : (
              pendDebitos.map((o) => (
                <div key={o.id} className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{o.descricao}</div>
                    <div className="text-xs text-muted-foreground">{formatDateBR(o.data_transacao)}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="font-mono text-sm font-medium">{formatBRL(o.valor)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setDrawerOfxDebito(o); setSelecao(null); }}
                    >
                      <Search className="h-3.5 w-3.5" />
                      Buscar matches
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="creditos" className="space-y-2 mt-4">
            {loadingCreditos ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : pendCreditos.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
                  <p className="text-sm font-medium">Nenhum crédito OFX pendente nesta conta.</p>
                </CardContent>
              </Card>
            ) : (
              pendCreditos.map((o) => (
                <div key={o.id} className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{o.descricao}</div>
                    <div className="text-xs text-muted-foreground">{formatDateBR(o.data_transacao)}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="font-mono text-sm font-medium text-emerald-700">{formatBRL(o.valor)}</span>
                    <Button
                      size="sm"
                      onClick={() => setOfxCreditoSelecionado(o)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Registrar receita
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog Débitos — candidatos */}
      {drawerOfxDebito && (
        <Dialog open={!!drawerOfxDebito && !criarCPRDebitoOpen} onOpenChange={(v) => { if (!v) fecharDrawerDebito(); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Candidatos para vínculo Stage 2</DialogTitle>
              <DialogDescription>
                Escolha 1 match exato OU 1 lote inteiro. Se nada serve, crie a CPR avulsa.
              </DialogDescription>
            </DialogHeader>

            <div className="border rounded-md p-3 bg-muted/30">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm truncate">{drawerOfxDebito.descricao}</div>
                <span className="font-mono text-sm font-semibold">{formatBRL(drawerOfxDebito.valor)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Data extrato: {formatDateBR(drawerOfxDebito.data_transacao)}
              </div>
            </div>

            {loadingMatches ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando matches…
              </div>
            ) : matches?.erro ? (
              <div className="flex items-start gap-2 p-3 border border-destructive/30 rounded bg-destructive/5 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p>{matches.erro}</p>
              </div>
            ) : semMatches ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 border rounded bg-muted/30 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <p className="font-medium">Nenhum match encontrado. Crie a despesa avulsa pra fechar este débito.</p>
                </div>
                <Button className="w-full gap-1.5" onClick={() => setCriarCPRDebitoOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Criar despesa avulsa e conciliar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {exatos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      <Link2 className="h-3.5 w-3.5" />
                      Match exato ({exatos.length})
                    </div>
                    {exatos.map((e) => {
                      const sel = selecao?.tipo === "exato" && selecao.planilha_id === e.planilha_id;
                      return (
                        <button
                          key={e.planilha_id}
                          type="button"
                          onClick={() => setSelecao({ tipo: "exato", planilha_id: e.planilha_id })}
                          className={`w-full text-left p-2.5 border rounded text-xs transition-colors ${
                            sel ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{e.nome_favorecido ?? "—"}</div>
                              <div className="text-muted-foreground mt-0.5">
                                {e.cnpj_favorecido ?? "Sem CNPJ"} · {e.tipo_pagamento ?? "—"}
                                {e.numero_lote && e.numero_lote !== "-" ? ` · lote ${e.numero_lote}` : ""}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-semibold">{formatBRL(e.valor_pago)}</div>
                              <div className="text-muted-foreground">
                                {e.data_pagamento ? formatDateBR(e.data_pagamento) : "—"}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {lotes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                      <Layers className="h-3.5 w-3.5" />
                      Match por lote ({lotes.length})
                    </div>
                    {lotes.map((l) => {
                      const sel = selecao?.tipo === "lote" && selecao.numero_lote === l.numero_lote;
                      return (
                        <button
                          key={l.numero_lote}
                          type="button"
                          onClick={() => setSelecao({
                            tipo: "lote",
                            numero_lote: l.numero_lote,
                            planilha_ids: l.planilhas.map((p) => p.planilha_id),
                          })}
                          className={`w-full text-left p-2.5 border rounded text-xs transition-colors ${
                            sel ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">
                                Lote {l.numero_lote} · {l.qtd_planilhas} pagamentos
                              </div>
                              <div className="text-muted-foreground mt-0.5 truncate">
                                {l.planilhas.slice(0, 3).map((p) => p.nome_favorecido ?? "—").join(", ")}
                                {l.planilhas.length > 3 ? `, +${l.planilhas.length - 3}` : ""}
                              </div>
                            </div>
                            <div className="font-mono font-semibold shrink-0">{formatBRL(l.soma)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={fecharDrawerDebito}>Cancelar</Button>
              {!semMatches && !matches?.erro && (
                <Button onClick={handleVincular} disabled={!selecao || vincularMutation.isPending}>
                  {vincularMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Link2 className="h-4 w-4" />}
                  Vincular
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog CRIAR CPR — débito sem match */}
      {drawerOfxDebito && (
        <CriarCPRAvulsaDialog
          open={criarCPRDebitoOpen}
          onOpenChange={setCriarCPRDebitoOpen}
          origem="stage_2_debito"
          fonteId={drawerOfxDebito.id}
          resumo={{
            titulo: drawerOfxDebito.descricao,
            valor: drawerOfxDebito.valor,
            data: drawerOfxDebito.data_transacao,
          }}
          descricaoInicial={drawerOfxDebito.descricao}
          onSucesso={() => {
            fecharDrawerDebito();
            qc.invalidateQueries({ queryKey: ["stage2-ofx-pendentes-debitos", contaBancariaId] });
            qc.invalidateQueries({ queryKey: ["conciliacao-hub-stage2-count"] });
          }}
        />
      )}

      {/* Dialog CRIAR CPR — crédito (receita) */}
      {ofxCreditoSelecionado && (
        <CriarCPRAvulsaDialog
          open={!!ofxCreditoSelecionado}
          onOpenChange={(v) => { if (!v) setOfxCreditoSelecionado(null); }}
          origem="stage_2_credito"
          fonteId={ofxCreditoSelecionado.id}
          resumo={{
            titulo: ofxCreditoSelecionado.descricao,
            valor: ofxCreditoSelecionado.valor,
            data: ofxCreditoSelecionado.data_transacao,
          }}
          descricaoInicial={ofxCreditoSelecionado.descricao}
          onSucesso={() => {
            setOfxCreditoSelecionado(null);
            qc.invalidateQueries({ queryKey: ["stage2-ofx-pendentes-creditos", contaBancariaId] });
            qc.invalidateQueries({ queryKey: ["conciliacao-hub-stage2-count"] });
          }}
        />
      )}
    </div>
  );
}
