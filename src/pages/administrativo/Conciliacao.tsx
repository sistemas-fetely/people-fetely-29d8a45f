import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle, AlertTriangle, ArrowRight, Building2, Check, CheckCircle2,
  GitCompare, Link2, Loader2, Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { encontrarMatches, type MatchResult } from "@/lib/financeiro/conciliacao";
import { CategoriaCombobox } from "@/components/financeiro/CategoriaCombobox";
import { useCategoriasPlano } from "@/hooks/useCategoriasPlano";

// KPI CANDIDATO: % conciliado no mês (meta: >95%)
// KPI CANDIDATO: Valor total não conciliado
// KPI CANDIDATO: Tempo médio pra conciliação (dias)
// KPI CANDIDATO: Movimentações órfãs (no extrato sem NF) por mês
// KPI CANDIDATO: Contas sem extrato (possivelmente não pagas) por mês
// KPI CANDIDATO: Score médio de match automático

type ContaBancaria = {
  id: string;
  nome_exibicao: string;
  cor: string | null;
};

type Movimentacao = {
  id: string;
  conta_bancaria_id: string;
  data_transacao: string;
  descricao: string;
  valor: number;
  tipo: string | null;
  conciliado: boolean | null;
  conta_pagar_id: string | null;
  conta_plano_id: string | null;
};

type ContaPagar = {
  id: string;
  data_vencimento: string;
  valor: number;
  status: string;
  descricao: string;
  fornecedor_cliente: string | null;
  nf_numero: string | null;
  nf_cnpj_emitente: string | null;
};

export default function Conciliacao() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const [contaBancariaId, setContaBancariaId] = useState<string>("todas");
  const [periodoIni, setPeriodoIni] = useState<string>(inicioMes.toISOString().slice(0, 10));
  const [periodoFim, setPeriodoFim] = useState<string>(hoje.toISOString().slice(0, 10));

  const [movSelecionada, setMovSelecionada] = useState<string | null>(null);
  const [cpSelecionada, setCpSelecionada] = useState<string | null>(null);

  const [matchesSugeridos, setMatchesSugeridos] = useState<MatchResult[]>([]);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [matchesParaConfirmar, setMatchesParaConfirmar] = useState<MatchResult[]>([]);
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [conciliando, setConciliando] = useState(false);

  const { data: contasBanco = [] } = useQuery({
    queryKey: ["contas-bancarias-conciliacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("id, nome_exibicao, cor")
        .eq("ativo", true)
        .order("nome_exibicao");
      if (error) throw error;
      return (data || []) as ContaBancaria[];
    },
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ["mov-conciliacao", contaBancariaId, periodoIni, periodoFim],
    queryFn: async () => {
      let q = supabase
        .from("movimentacoes_bancarias")
        .select("id, conta_bancaria_id, data_transacao, descricao, valor, tipo, conciliado, conta_pagar_id, conta_plano_id")
        .gte("data_transacao", periodoIni)
        .lte("data_transacao", periodoFim)
        .order("data_transacao", { ascending: false });
      if (contaBancariaId !== "todas") q = q.eq("conta_bancaria_id", contaBancariaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Movimentacao[];
    },
  });

  const { data: contasPagar = [] } = useQuery({
    queryKey: ["cp-conciliacao", periodoIni, periodoFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar_receber")
        .select("id, data_vencimento, valor, status, descricao, fornecedor_cliente, nf_numero, nf_cnpj_emitente")
        .eq("tipo", "pagar")
        .gte("data_vencimento", periodoIni)
        .lte("data_vencimento", periodoFim)
        .order("data_vencimento", { ascending: false });
      if (error) throw error;
      return (data || []) as ContaPagar[];
    },
  });

  const { data: categoriasOpts = [] } = useCategoriasPlano();

  // Splits
  const movsNaoConciliadas = useMemo(
    () => movimentacoes.filter((m) => !m.conciliado),
    [movimentacoes]
  );
  const cpsNaoConciliadas = useMemo(
    () =>
      contasPagar.filter(
        (c) => c.status !== "conciliado" && c.status !== "cancelado"
      ),
    [contasPagar]
  );

  // Cenário 1: conciliadas
  const conciliadas = useMemo(
    () => movimentacoes.filter((m) => m.conciliado),
    [movimentacoes]
  );

  // Cenário 2: extrato sem NF — débitos não conciliados que não têm match >= 50
  const movsOrfas = useMemo(() => {
    const matches = encontrarMatches(movsNaoConciliadas, cpsNaoConciliadas);
    const matchedIds = new Set(matches.map((m) => m.movimentacao_id));
    return movsNaoConciliadas.filter(
      (m) => Number(m.valor) < 0 && !matchedIds.has(m.id)
    );
  }, [movsNaoConciliadas, cpsNaoConciliadas]);

  // Cenário 3: NF sem extrato — contas pagas/agendadas sem match
  const cpsSemExtrato = useMemo(() => {
    const matches = encontrarMatches(movsNaoConciliadas, cpsNaoConciliadas);
    const matchedIds = new Set(matches.map((m) => m.conta_pagar_id));
    return cpsNaoConciliadas.filter(
      (c) =>
        (c.status === "pago" || c.status === "agendado") && !matchedIds.has(c.id)
    );
  }, [movsNaoConciliadas, cpsNaoConciliadas]);

  // Stats
  const stats = useMemo(() => {
    const valorConciliado = conciliadas.reduce((s, m) => s + Math.abs(Number(m.valor)), 0);
    const valorOrfas = movsOrfas.reduce((s, m) => s + Math.abs(Number(m.valor)), 0);
    const valorSemExtrato = cpsSemExtrato.reduce((s, c) => s + Number(c.valor), 0);
    return {
      conciliadasCount: conciliadas.length,
      conciliadasValor: valorConciliado,
      orfasCount: movsOrfas.length,
      orfasValor: valorOrfas,
      semExtratoCount: cpsSemExtrato.length,
      semExtratoValor: valorSemExtrato,
    };
  }, [conciliadas, movsOrfas, cpsSemExtrato]);

  function conciliarAutomatico() {
    const matches = encontrarMatches(movsNaoConciliadas, cpsNaoConciliadas);
    setMatchesSugeridos(matches);
    const altoConfianca = matches.filter((m) => m.score >= 70);
    if (altoConfianca.length === 0) {
      toast.info("Nenhum match com confiança alta. Veja sugestões em amarelo no extrato.");
      return;
    }
    const sel: Record<string, boolean> = {};
    altoConfianca.forEach((m) => {
      sel[m.movimentacao_id] = true;
    });
    setSelecionados(sel);
    setMatchesParaConfirmar(altoConfianca);
    setShowConfirmar(true);
  }

  async function efetivarConciliacao(movId: string, cpId: string, dataPagamento: string) {
    if (!user) return;
    // 1. movimentação
    await supabase
      .from("movimentacoes_bancarias")
      .update({
        conciliado: true,
        conta_pagar_id: cpId,
        conciliado_em: new Date().toISOString(),
        conciliado_por: user.id,
      })
      .eq("id", movId);

    // 2. conta a pagar
    const cp = contasPagar.find((c) => c.id === cpId);
    const statusAnterior = cp?.status || "pago";
    await supabase
      .from("contas_pagar_receber")
      .update({
        status: "conciliado",
        data_pagamento: dataPagamento,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cpId);

    // 3. histórico
    await supabase.from("contas_pagar_historico").insert({
      conta_id: cpId,
      status_anterior: statusAnterior,
      status_novo: "conciliado",
      observacao: "Conciliado com extrato bancário",
      usuario_id: user.id,
    });
  }

  async function confirmarConciliacaoBatch() {
    setConciliando(true);
    try {
      const aPersistir = matchesParaConfirmar.filter((m) => selecionados[m.movimentacao_id]);
      for (const m of aPersistir) {
        await efetivarConciliacao(m.movimentacao_id, m.conta_pagar_id, m.mov.data_transacao);
      }
      toast.success(`${aPersistir.length} conciliações realizadas`);
      setShowConfirmar(false);
      setMatchesSugeridos([]);
      qc.invalidateQueries({ queryKey: ["mov-conciliacao"] });
      qc.invalidateQueries({ queryKey: ["cp-conciliacao"] });
    } catch (e) {
      toast.error("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setConciliando(false);
    }
  }

  async function conciliarManual() {
    if (!movSelecionada || !cpSelecionada) return;
    const mov = movimentacoes.find((m) => m.id === movSelecionada);
    if (!mov) return;
    setConciliando(true);
    try {
      await efetivarConciliacao(movSelecionada, cpSelecionada, mov.data_transacao);
      toast.success("Conciliado");
      setMovSelecionada(null);
      setCpSelecionada(null);
      qc.invalidateQueries({ queryKey: ["mov-conciliacao"] });
      qc.invalidateQueries({ queryKey: ["cp-conciliacao"] });
    } catch (e) {
      toast.error("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setConciliando(false);
    }
  }

  async function categorizarMovOrfa(movId: string, catId: string | null) {
    await supabase
      .from("movimentacoes_bancarias")
      .update({ conta_plano_id: catId })
      .eq("id", movId);
    toast.success("Categorizado");
    qc.invalidateQueries({ queryKey: ["mov-conciliacao"] });
  }

  async function criarContaDeMov(mov: Movimentacao) {
    if (!user) return;
    try {
      const { error: e1 } = await supabase.from("contas_pagar_receber").insert({
        tipo: "pagar",
        descricao: mov.descricao,
        valor: Math.abs(Number(mov.valor)),
        data_vencimento: mov.data_transacao,
        data_pagamento: mov.data_transacao,
        status: "conciliado",
        origem: "extrato",
        conta_id: mov.conta_plano_id || null,
        criado_por: user.id,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("movimentacoes_bancarias")
        .update({
          conciliado: true,
          conciliado_em: new Date().toISOString(),
          conciliado_por: user.id,
        })
        .eq("id", mov.id);
      if (e2) throw e2;
      toast.success("Conta criada e conciliada");
      qc.invalidateQueries({ queryKey: ["mov-conciliacao"] });
      qc.invalidateQueries({ queryKey: ["cp-conciliacao"] });
    } catch (e) {
      toast.error("Erro: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  function getMatch(movId?: string | null, cpId?: string | null) {
    if (movId) return matchesSugeridos.find((m) => m.movimentacao_id === movId);
    if (cpId) return matchesSugeridos.find((m) => m.conta_pagar_id === cpId);
    return undefined;
  }

  const matchesConfirmadosCount = Object.values(selecionados).filter(Boolean).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conciliação</h1>
          <p className="text-sm text-muted-foreground">
            Cruzamento automático: extrato bancário × contas a pagar.
          </p>
        </div>
        <Button
          onClick={conciliarAutomatico}
          className="bg-admin hover:bg-admin/90 text-admin-foreground gap-2"
        >
          <GitCompare className="h-4 w-4" />
          Conciliar automaticamente
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Conta bancária</Label>
            <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as contas</SelectItem>
                {contasBanco.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_exibicao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Período início</Label>
            <Input type="date" value={periodoIni} onChange={(e) => setPeriodoIni(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Período fim</Label>
            <Input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="w-[160px]" />
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Conciliadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conciliadasCount}</div>
            <p className="text-xs text-muted-foreground">{formatBRL(stats.conciliadasValor)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              No extrato sem NF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orfasCount}</div>
            <p className="text-xs text-muted-foreground">{formatBRL(stats.orfasValor)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Na NF sem extrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.semExtratoCount}</div>
            <p className="text-xs text-muted-foreground">{formatBRL(stats.semExtratoValor)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lado-a-lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Extrato */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Extrato bancário
              <Badge variant="outline">{movsNaoConciliadas.length} pendentes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {movsNaoConciliadas.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">Tudo conciliado neste período.</p>
              )}
              {movsNaoConciliadas.map((mov) => {
                const match = getMatch(mov.id, null);
                const ativa = movSelecionada === mov.id;
                return (
                  <button
                    key={mov.id}
                    type="button"
                    onClick={() => setMovSelecionada(ativa ? null : mov.id)}
                    className={
                      "w-full text-left p-3 rounded-lg border text-sm transition-colors " +
                      (ativa
                        ? "border-admin bg-admin/5"
                        : match
                          ? "border-warning/40 bg-warning/5 hover:bg-warning/10"
                          : "hover:bg-muted/50")
                    }
                  >
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">{formatDateBR(mov.data_transacao)}</span>
                      <span className={"font-medium " + (Number(mov.valor) < 0 ? "text-destructive" : "text-success")}>
                        {formatBRL(Number(mov.valor))}
                      </span>
                    </div>
                    <p className="text-xs mt-1 truncate">{mov.descricao}</p>
                    {match && (
                      <Badge className="mt-1 text-[10px] bg-warning/15 text-warning hover:bg-warning/15 border-warning/30">
                        Match {match.score}% — {match.motivo}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Contas a pagar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Contas a pagar
              <Badge variant="outline">{cpsNaoConciliadas.length} pendentes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {cpsNaoConciliadas.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">Sem contas pendentes neste período.</p>
              )}
              {cpsNaoConciliadas.map((cp) => {
                const match = getMatch(null, cp.id);
                const ativa = cpSelecionada === cp.id;
                return (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => setCpSelecionada(ativa ? null : cp.id)}
                    className={
                      "w-full text-left p-3 rounded-lg border text-sm transition-colors " +
                      (ativa
                        ? "border-admin bg-admin/5"
                        : match
                          ? "border-warning/40 bg-warning/5 hover:bg-warning/10"
                          : "hover:bg-muted/50")
                    }
                  >
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">{formatDateBR(cp.data_vencimento)}</span>
                      <span className="font-medium text-destructive">{formatBRL(Number(cp.valor))}</span>
                    </div>
                    <p className="text-xs mt-1 truncate">{cp.fornecedor_cliente || "—"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{cp.descricao}</p>
                    {match && (
                      <Badge className="mt-1 text-[10px] bg-warning/15 text-warning hover:bg-warning/15 border-warning/30">
                        Match sugerido
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conciliação manual */}
      {movSelecionada && cpSelecionada && (
        <div className="flex justify-center">
          <Button
            onClick={conciliarManual}
            disabled={conciliando}
            className="bg-admin hover:bg-admin/90 text-admin-foreground gap-2"
          >
            {conciliando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Conciliar selecionados
          </Button>
        </div>
      )}

      {/* Cenário 2: extrato sem NF */}
      {movsOrfas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              No extrato, sem NF
              <Badge variant="outline">{movsOrfas.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {movsOrfas.map((mov) => (
              <div key={mov.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{mov.descricao}</p>
                  <p className="text-xs text-muted-foreground">{formatDateBR(mov.data_transacao)}</p>
                </div>
                <span className="font-medium text-sm text-destructive">{formatBRL(Number(mov.valor))}</span>
                <div className="w-[220px]">
                  <CategoriaCombobox
                    options={categoriasOpts}
                    value={mov.conta_plano_id}
                    onChange={(catId) => categorizarMovOrfa(mov.id, catId)}
                    placeholder="Categorizar"
                    allowNull
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => criarContaDeMov(mov)}>
                  Criar conta
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cenário 3: NF sem extrato */}
      {cpsSemExtrato.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Na NF, sem extrato
              <Badge variant="destructive">{cpsSemExtrato.length}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Contas com status "pago" ou "agendado" que não foram encontradas no extrato bancário.
            </p>
          </CardHeader>
          <CardContent className="space-y-1">
            {cpsSemExtrato.map((cp) => (
              <div key={cp.id} className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{cp.fornecedor_cliente || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {formatDateBR(cp.data_vencimento)} {cp.nf_numero ? `· NF ${cp.nf_numero}` : ""}
                  </p>
                </div>
                <span className="font-medium text-sm">{formatBRL(Number(cp.valor))}</span>
                <Badge variant="outline" className="text-[10px]">{cp.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dialog confirmação batch */}
      <Dialog open={showConfirmar} onOpenChange={setShowConfirmar}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar conciliação automática</DialogTitle>
            <DialogDescription>
              {matchesParaConfirmar.length} matches encontrados com alta confiança (≥ 70%).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {matchesParaConfirmar.map((m) => (
              <div key={m.movimentacao_id} className="flex items-center gap-3 p-2 rounded-lg border text-xs">
                <Checkbox
                  checked={!!selecionados[m.movimentacao_id]}
                  onCheckedChange={(v) =>
                    setSelecionados((prev) => ({ ...prev, [m.movimentacao_id]: !!v }))
                  }
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{m.mov.descricao}</p>
                  <p className="text-muted-foreground">
                    {formatDateBR(m.mov.data_transacao)} · {formatBRL(Number(m.mov.valor))}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{m.cp.fornecedor_cliente || "—"}</p>
                  <p className="text-muted-foreground">
                    {m.cp.nf_numero ? `NF ${m.cp.nf_numero} · ` : ""}{formatBRL(Number(m.cp.valor))}
                  </p>
                </div>
                <Badge className="text-[10px] flex-shrink-0">{m.score}%</Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmar(false)} disabled={conciliando}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarConciliacaoBatch}
              disabled={conciliando || matchesConfirmadosCount === 0}
              className="bg-admin hover:bg-admin/90 text-admin-foreground gap-2"
            >
              {conciliando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Conciliar {matchesConfirmadosCount} selecionado{matchesConfirmadosCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
