import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertCircle, AlertTriangle, ArrowRight, Building2, Check, CheckCircle2,
  GitCompare, Link2, Loader2, Receipt, Sparkles, Upload, X, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { encontrarMatches, type MatchResult } from "@/lib/financeiro/conciliacao";
import { identificarTransacaoBancaria, type RegraExtrato } from "@/lib/financeiro/regras-extrato";
import {
  encontrarAgrupamentosCartao,
  validarAgrupamento,
  type AgrupamentoSugerido,
} from "@/lib/financeiro/agrupamentos-cartao";
import { CategoriaCombobox } from "@/components/financeiro/CategoriaCombobox";
import { useCategoriasPlano } from "@/hooks/useCategoriasPlano";
import { useFiltrosPersistentes } from "@/hooks/useFiltrosPersistentes";
import { FilterInput } from "@/components/ui/filter-input";
import { FilterSelectTrigger } from "@/components/ui/filter-select-trigger";
import { ImportarExtratoDialog } from "@/components/financeiro/ImportarExtratoDialog";

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

type MovComRegra = Movimentacao & { _regra_auto?: RegraExtrato };

const inicioMesISO = (() => {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), 1).toISOString().slice(0, 10);
})();
const hojeISO = new Date().toISOString().slice(0, 10);

export default function Conciliacao() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [contaBancariaId, setContaBancariaId] = useFiltrosPersistentes<string>(
    "conciliacao_conta", "todas"
  );
  const [periodoIni, setPeriodoIni] = useFiltrosPersistentes<string>(
    "conciliacao_inicio", inicioMesISO
  );
  const [periodoFim, setPeriodoFim] = useFiltrosPersistentes<string>(
    "conciliacao_fim", hojeISO
  );
  const [tabAtiva, setTabAtiva] = useState<"conciliar" | "extrato_sem_nf" | "nf_sem_extrato">("conciliar");

  const [movSelecionada, setMovSelecionada] = useState<string | null>(null);
  const [cpSelecionada, setCpSelecionada] = useState<string | null>(null);

  // Agrupamento N:1 manual
  const [contasSelecionadasManual, setContasSelecionadasManual] = useState<Set<string>>(new Set());

  // Agrupamentos sugeridos pela IA
  const [agrupamentosRejeitados, setAgrupamentosRejeitados] = useState<Set<string>>(new Set());

  const [matchesSugeridos, setMatchesSugeridos] = useState<MatchResult[]>([]);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [matchesParaConfirmar, setMatchesParaConfirmar] = useState<MatchResult[]>([]);
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [conciliando, setConciliando] = useState(false);
  const [showImportar, setShowImportar] = useState(false);

  // Aprendizado de regra
  const [showCriarRegra, setShowCriarRegra] = useState(false);
  const [regraDraft, setRegraDraft] = useState<{ padrao: string; categoriaId: string; categoriaNome: string } | null>(null);

  // Ordenação na conciliação manual
  const [ordenacaoMov, setOrdenacaoMov] = useState<"valor_asc" | "valor_desc" | "data_asc" | "data_desc">("valor_asc");
  const [ordenacaoCp, setOrdenacaoCp] = useState<"valor_asc" | "valor_desc" | "venc_asc" | "venc_desc" | "fornecedor">("valor_asc");

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

  const conciliadas = useMemo(
    () => movimentacoes.filter((m) => m.conciliado),
    [movimentacoes]
  );

  // Recalcula matches uma única vez por mudança nos arrays
  const matchesGlobais = useMemo(
    () => encontrarMatches(movsNaoConciliadas, cpsNaoConciliadas),
    [movsNaoConciliadas, cpsNaoConciliadas]
  );

  const movsOrfas = useMemo<MovComRegra[]>(() => {
    const matchedIds = new Set(matchesGlobais.map((m) => m.movimentacao_id));
    return movsNaoConciliadas
      .filter((m) => Number(m.valor) < 0 && !matchedIds.has(m.id))
      .map<MovComRegra>((m) => {
        const regra = identificarTransacaoBancaria(m.descricao);
        return regra ? { ...m, _regra_auto: regra } : { ...m };
      });
  }, [movsNaoConciliadas, matchesGlobais]);

  // Inclui receitas auto-categorizáveis (rendimentos, estornos, aportes)
  const receitasAutoCategorizaveis = useMemo<MovComRegra[]>(() => {
    const out: MovComRegra[] = [];
    for (const m of movsNaoConciliadas) {
      if (Number(m.valor) < 0) continue;
      const regra = identificarTransacaoBancaria(m.descricao);
      if (regra) out.push({ ...m, _regra_auto: regra });
    }
    return out;
  }, [movsNaoConciliadas]);

  const autoCategorizaveis = useMemo(
    () => [...movsOrfas.filter((m) => m._regra_auto), ...receitasAutoCategorizaveis],
    [movsOrfas, receitasAutoCategorizaveis]
  );
  const manuais = useMemo(
    () => movsOrfas.filter((m) => !m._regra_auto),
    [movsOrfas]
  );

  const cpsSemExtrato = useMemo(() => {
    const matchedIds = new Set(matchesGlobais.map((m) => m.conta_pagar_id));
    return cpsNaoConciliadas.filter(
      (c) =>
        (c.status === "pago" || c.status === "agendado") && !matchedIds.has(c.id)
    );
  }, [cpsNaoConciliadas, matchesGlobais]);

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
      autoCount: autoCategorizaveis.length,
    };
  }, [conciliadas, movsOrfas, cpsSemExtrato, autoCategorizaveis]);

  // Agrupamentos sugeridos pela IA (N:1)
  const agrupamentosSugeridos = useMemo<AgrupamentoSugerido[]>(() => {
    if (movsNaoConciliadas.length === 0 || cpsNaoConciliadas.length === 0) return [];
    const todos = encontrarAgrupamentosCartao(movsNaoConciliadas, cpsNaoConciliadas);
    return todos.filter((s) => !agrupamentosRejeitados.has(s.id));
  }, [movsNaoConciliadas, cpsNaoConciliadas, agrupamentosRejeitados]);

  // Validação em tempo real do agrupamento manual
  const validacaoManual = useMemo(() => {
    if (!movSelecionada || contasSelecionadasManual.size === 0) return null;
    const mov = movsNaoConciliadas.find((m) => m.id === movSelecionada);
    if (!mov) return null;
    return validarAgrupamento(
      Array.from(contasSelecionadasManual),
      cpsNaoConciliadas,
      Number(mov.valor)
    );
  }, [movSelecionada, contasSelecionadasManual, movsNaoConciliadas, cpsNaoConciliadas]);

  // Movimentações ordenadas (apenas saídas — valor < 0)
  const movsOrdenadas = useMemo(() => {
    const movs = movsNaoConciliadas.filter((m) => Number(m.valor) < 0);
    switch (ordenacaoMov) {
      case "valor_asc":
        return [...movs].sort((a, b) => Math.abs(Number(a.valor)) - Math.abs(Number(b.valor)));
      case "valor_desc":
        return [...movs].sort((a, b) => Math.abs(Number(b.valor)) - Math.abs(Number(a.valor)));
      case "data_asc":
        return [...movs].sort((a, b) => a.data_transacao.localeCompare(b.data_transacao));
      case "data_desc":
        return [...movs].sort((a, b) => b.data_transacao.localeCompare(a.data_transacao));
      default:
        return movs;
    }
  }, [movsNaoConciliadas, ordenacaoMov]);

  // Contas a pagar ordenadas
  const cpsOrdenadas = useMemo(() => {
    const cps = [...cpsNaoConciliadas];
    switch (ordenacaoCp) {
      case "valor_asc":
        return cps.sort((a, b) => Number(a.valor) - Number(b.valor));
      case "valor_desc":
        return cps.sort((a, b) => Number(b.valor) - Number(a.valor));
      case "venc_asc":
        return cps.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
      case "venc_desc":
        return cps.sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento));
      case "fornecedor":
        return cps.sort((a, b) => {
          const nomeA = a.fornecedor_cliente || a.descricao || "";
          const nomeB = b.fornecedor_cliente || b.descricao || "";
          return nomeA.localeCompare(nomeB);
        });
      default:
        return cps;
    }
  }, [cpsNaoConciliadas, ordenacaoCp]);

  const filtrosAtivos =
    (contaBancariaId !== "todas" ? 1 : 0) +
    (periodoIni !== inicioMesISO ? 1 : 0) +
    (periodoFim !== hojeISO ? 1 : 0);

  function limparFiltros() {
    setContaBancariaId("todas");
    setPeriodoIni(inicioMesISO);
    setPeriodoFim(hojeISO);
  }

  function conciliarAutomatico() {
    const matches = matchesGlobais;
    setMatchesSugeridos(matches);
    const altoConfianca = matches.filter((m) => m.score >= 60);
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
    await supabase
      .from("movimentacoes_bancarias")
      .update({
        conciliado: true,
        conta_pagar_id: cpId,
        conciliado_em: new Date().toISOString(),
        conciliado_por: user.id,
      })
      .eq("id", movId);

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

  /** Aceita uma transação bancária pura: gera lançamento + marca conciliada. */
  async function aceitarAuto(mov: MovComRegra) {
    if (!user || !mov._regra_auto) return;
    const regra = mov._regra_auto;
    const categoria = categoriasOpts.find((c) => c.codigo === regra.categoria_codigo);
    if (!categoria) {
      toast.error(`Categoria ${regra.categoria_codigo} não encontrada no plano de contas`);
      return;
    }
    await supabase.from("movimentacoes_bancarias").update({
      conta_plano_id: categoria.id,
      conciliado: true,
      conciliado_em: new Date().toISOString(),
      conciliado_por: user.id,
    }).eq("id", mov.id);

    await supabase.from("lancamentos_financeiros").insert({
      conta_id: categoria.id,
      descricao: regra.descricao_limpa,
      valor: Math.abs(Number(mov.valor)),
      tipo_lancamento: Number(mov.valor) >= 0 ? "credito" : "debito",
      data_competencia: mov.data_transacao,
      data_pagamento: mov.data_transacao,
      fornecedor: "Banco (automático)",
      origem: "extrato",
    });
  }

  async function aceitarTodosAuto() {
    if (autoCategorizaveis.length === 0) return;
    setConciliando(true);
    let sucesso = 0;
    for (const mov of autoCategorizaveis) {
      try {
        await aceitarAuto(mov);
        sucesso++;
      } catch {
        /* segue */
      }
    }
    toast.success(`${sucesso} lançamento${sucesso !== 1 ? "s" : ""} criado${sucesso !== 1 ? "s" : ""} automaticamente`);
    qc.invalidateQueries({ queryKey: ["mov-conciliacao"] });
    setConciliando(false);
  }

  async function aceitarUmAuto(mov: MovComRegra) {
    setConciliando(true);
    try {
      await aceitarAuto(mov);
      toast.success("Lançamento criado: " + (mov._regra_auto?.descricao_limpa || ""));
      qc.invalidateQueries({ queryKey: ["mov-conciliacao"] });
    } catch (e) {
      toast.error("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setConciliando(false);
    }
  }

  async function categorizarMovOrfa(mov: Movimentacao, catId: string | null) {
    await supabase
      .from("movimentacoes_bancarias")
      .update({ conta_plano_id: catId })
      .eq("id", mov.id);
    toast.success("Categorizado");
    qc.invalidateQueries({ queryKey: ["mov-conciliacao"] });

    // Sugerir criar regra a partir das primeiras 3 palavras da descrição
    if (catId) {
      const cat = categoriasOpts.find((c) => c.id === catId);
      const padrao = (mov.descricao || "").split(/\s+/).slice(0, 3).join(" ");
      if (padrao && cat) {
        setRegraDraft({ padrao, categoriaId: catId, categoriaNome: `${cat.codigo} — ${cat.nome}` });
        setShowCriarRegra(true);
      }
    }
  }

  async function criarRegra() {
    if (!regraDraft || !user) return;
    try {
      const { error } = await supabase.from("regras_categorizacao").insert({
        descricao_contem: regraDraft.padrao,
        conta_plano_id: regraDraft.categoriaId,
        prioridade: 50,
        ativo: true,
        criado_por: user.id,
      });
      if (error) throw error;
      toast.success("Regra criada");
      setShowCriarRegra(false);
      setRegraDraft(null);
    } catch (e) {
      toast.error("Erro: " + (e instanceof Error ? e.message : String(e)));
    }
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

  function toggleContaManual(contaId: string) {
    setContasSelecionadasManual((prev) => {
      const novo = new Set(prev);
      if (novo.has(contaId)) novo.delete(contaId);
      else novo.add(contaId);
      return novo;
    });
  }

  async function aceitarAgrupamento(agrup: AgrupamentoSugerido) {
    setConciliando(true);
    try {
      const { data, error } = await supabase.functions.invoke("conciliar-agrupado", {
        body: {
          movimentacao_id: agrup.movimentacao.id,
          contas_pagar_ids: agrup.contas.map((c) => c.id),
          observacao: `Conciliação automática IA — ${agrup.motivo} (score ${agrup.score}%)`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${agrup.contas.length} contas conciliadas`);
      qc.invalidateQueries({ queryKey: ["mov-conciliacao"] });
      qc.invalidateQueries({ queryKey: ["cp-conciliacao"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conciliar agrupamento");
    } finally {
      setConciliando(false);
    }
  }

  function rejeitarAgrupamento(agrupId: string) {
    setAgrupamentosRejeitados((prev) => new Set(prev).add(agrupId));
    toast("Sugestão ignorada");
  }

  async function conciliarManualGrupo() {
    if (!movSelecionada || contasSelecionadasManual.size === 0) return;
    if (!validacaoManual?.valido) {
      toast.error("Diferença acima de 1% — não é possível conciliar");
      return;
    }
    setConciliando(true);
    try {
      const { data, error } = await supabase.functions.invoke("conciliar-agrupado", {
        body: {
          movimentacao_id: movSelecionada,
          contas_pagar_ids: Array.from(contasSelecionadasManual),
          observacao: "Conciliação manual N:1",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${contasSelecionadasManual.size} contas conciliadas`);
      setMovSelecionada(null);
      setContasSelecionadasManual(new Set());
      qc.invalidateQueries({ queryKey: ["mov-conciliacao"] });
      qc.invalidateQueries({ queryKey: ["cp-conciliacao"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conciliar");
    } finally {
      setConciliando(false);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conciliação</h1>
          <p className="text-sm text-muted-foreground">
            Cruzamento automático: extrato bancário × contas a pagar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportar(true)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar extrato
          </Button>
          <Button
            onClick={conciliarAutomatico}
            className="bg-admin hover:bg-admin/90 text-admin-foreground gap-2"
          >
            <GitCompare className="h-4 w-4" />
            Conciliar automaticamente
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Conta bancária</Label>
            <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
              <FilterSelectTrigger active={contaBancariaId !== "todas"} className="w-[220px]">
                <SelectValue />
              </FilterSelectTrigger>
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
            <FilterInput
              type="date"
              value={periodoIni}
              active={periodoIni !== inicioMesISO}
              onChange={(e) => setPeriodoIni(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Período fim</Label>
            <FilterInput
              type="date"
              value={periodoFim}
              active={periodoFim !== hojeISO}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="w-[160px]"
            />
          </div>
          {filtrosAtivos > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="outline" className="text-[10px] text-admin border-admin">
                {filtrosAtivos} filtro{filtrosAtivos > 1 ? "s" : ""} ativo{filtrosAtivos > 1 ? "s" : ""}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-admin hover:text-admin/80 gap-1 text-xs h-7"
                onClick={limparFiltros}
              >
                <X className="h-3 w-3" /> Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs clicáveis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setTabAtiva("conciliar")}
          className={
            "text-left rounded-lg border bg-card transition-colors " +
            (tabAtiva === "conciliar" ? "border-admin ring-1 ring-admin/30" : "hover:bg-muted/30")
          }
        >
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Conciliadas
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.conciliadasCount}</div>
            <p className="text-xs text-muted-foreground">{formatBRL(stats.conciliadasValor)}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTabAtiva("extrato_sem_nf")}
          className={
            "text-left rounded-lg border bg-card transition-colors " +
            (tabAtiva === "extrato_sem_nf" ? "border-admin ring-1 ring-admin/30" : "hover:bg-muted/30")
          }
        >
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                No extrato sem NF
              </span>
              {stats.autoCount > 0 && (
                <Badge className="bg-admin/10 text-admin border-admin/30 text-[10px] gap-1">
                  <Zap className="h-3 w-3" /> {stats.autoCount} auto
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold">{stats.orfasCount}</div>
            <p className="text-xs text-muted-foreground">{formatBRL(stats.orfasValor)}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTabAtiva("nf_sem_extrato")}
          className={
            "text-left rounded-lg border bg-card transition-colors " +
            (tabAtiva === "nf_sem_extrato" ? "border-admin ring-1 ring-admin/30" : "hover:bg-muted/30")
          }
        >
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Na NF sem extrato
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.semExtratoCount}</div>
            <p className="text-xs text-muted-foreground">{formatBRL(stats.semExtratoValor)}</p>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <Tabs value={tabAtiva} onValueChange={(v) => setTabAtiva(v as typeof tabAtiva)}>
        <TabsList>
          <TabsTrigger value="conciliar" className="gap-2">
            Conciliar
            {matchesSugeridos.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{matchesSugeridos.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="extrato_sem_nf" className="gap-2">
            No extrato sem NF
            <Badge variant="secondary" className="text-[10px]">{movsOrfas.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="nf_sem_extrato" className="gap-2">
            Na NF sem extrato
            <Badge variant="secondary" className="text-[10px]">{cpsSemExtrato.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1 — CONCILIAR (lado a lado) */}
        <TabsContent value="conciliar" className="space-y-4 mt-4">
          {/* SEÇÃO 1 — AGRUPAMENTOS SUGERIDOS PELA IA */}
          {agrupamentosSugeridos.length > 0 && (
            <Card className="border-admin/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-admin" />
                  Agrupamentos sugeridos pela IA
                  <Badge className="bg-admin/10 text-admin border-admin/30">
                    {agrupamentosSugeridos.length}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Grupos de contas a pagar que somam o valor de uma única movimentação (ex: fatura de cartão, lote SISPAG).
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {agrupamentosSugeridos.map((agrup) => (
                  <div key={agrup.id} className="rounded-lg border bg-card overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center p-3">
                      {/* MOVIMENTAÇÃO */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <Badge variant="outline" className="text-[10px]">Extrato</Badge>
                        </div>
                        <p className="text-sm truncate" title={agrup.movimentacao.descricao}>
                          {agrup.movimentacao.descricao}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateBR(agrup.movimentacao.data_transacao)}
                        </p>
                        <p className="text-base font-semibold text-destructive">
                          {formatBRL(agrup.valor_movimentacao)}
                        </p>
                      </div>

                      {/* SETA */}
                      <div className="hidden md:flex items-center justify-center">
                        <ArrowRight className="h-5 w-5 text-admin" />
                      </div>

                      {/* CONTAS */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                          <Badge variant="outline" className="text-[10px]">
                            {agrup.contas.length} contas
                          </Badge>
                        </div>
                        <div className="space-y-0.5 max-h-24 overflow-y-auto">
                          {agrup.contas.slice(0, 5).map((cp) => (
                            <div key={cp.id} className="flex justify-between text-xs">
                              <span className="truncate pr-2">{cp.fornecedor_cliente || cp.descricao}</span>
                              <span className="text-muted-foreground tabular-nums">
                                {formatBRL(Number(cp.valor))}
                              </span>
                            </div>
                          ))}
                          {agrup.contas.length > 5 && (
                            <p className="text-[10px] text-muted-foreground">
                              + {agrup.contas.length - 5} mais
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-semibold pt-1 border-t">
                          Total: {formatBRL(agrup.soma_contas)}
                        </p>
                      </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex items-center justify-between gap-2 p-3 bg-muted/30 border-t flex-wrap">
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <Badge className="bg-admin/15 text-admin border-admin/30">
                          Score {agrup.score}%
                        </Badge>
                        <span className="text-muted-foreground">{agrup.motivo}</span>
                        {agrup.diferenca_percentual > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            Dif: {agrup.diferenca_percentual.toFixed(2)}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => rejeitarAgrupamento(agrup.id)}
                          disabled={conciliando}
                          className="gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => aceitarAgrupamento(agrup)}
                          disabled={conciliando}
                          className="bg-admin hover:bg-admin/90 text-admin-foreground gap-1"
                        >
                          {conciliando ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* SEÇÃO 2 — CONCILIAÇÃO MANUAL (LADO A LADO) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* COLUNA ESQUERDA — EXTRATO */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Extrato bancário
                  <Badge variant="outline">{movsNaoConciliadas.length} pendentes</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Selecione uma movimentação para conciliar 1:1 ou marcar várias contas (N:1).
                </p>
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
                        onClick={() => {
                          if (ativa) {
                            setMovSelecionada(null);
                            setContasSelecionadasManual(new Set());
                          } else {
                            setMovSelecionada(mov.id);
                            setContasSelecionadasManual(new Set());
                            setCpSelecionada(null);
                          }
                        }}
                        className={
                          "w-full text-left p-3 rounded-lg border text-sm transition-colors " +
                          (ativa
                            ? "border-admin bg-admin/5 shadow-sm"
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

            {/* COLUNA DIREITA — CONTAS A PAGAR */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Contas a pagar
                  <Badge variant="outline">{cpsNaoConciliadas.length} pendentes</Badge>
                </CardTitle>
                {movSelecionada && (
                  <p className="text-xs text-admin">
                    Marque várias contas para agrupar (soma deve bater com a movimentação ±1%).
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {/* CARD RESUMO da seleção N:1 */}
                {movSelecionada && contasSelecionadasManual.size > 0 && validacaoManual && (
                  <div
                    className={
                      "mb-3 p-3 rounded-lg border-2 space-y-2 " +
                      (validacaoManual.valido
                        ? "border-success/50 bg-success/5"
                        : "border-destructive/50 bg-destructive/5")
                    }
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Movimentação:</span>
                      <span className="font-medium">
                        {formatBRL(
                          Math.abs(Number(movsNaoConciliadas.find((m) => m.id === movSelecionada)?.valor || 0))
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {contasSelecionadasManual.size} conta{contasSelecionadasManual.size !== 1 ? "s" : ""}:
                      </span>
                      <span className="font-medium">{formatBRL(validacaoManual.soma)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Diferença:</span>
                      <div className="flex items-center gap-2">
                        <span className={"font-semibold " + (validacaoManual.valido ? "text-success" : "text-destructive")}>
                          {validacaoManual.percentual.toFixed(2)}%
                        </span>
                        {validacaoManual.valido ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={conciliarManualGrupo}
                      disabled={conciliando || !validacaoManual.valido}
                      className="w-full bg-admin hover:bg-admin/90 text-admin-foreground gap-2"
                      size="sm"
                    >
                      {conciliando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      Conciliar {contasSelecionadasManual.size} conta{contasSelecionadasManual.size !== 1 ? "s" : ""}
                    </Button>
                  </div>
                )}

                <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                  {cpsNaoConciliadas.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">Sem contas pendentes neste período.</p>
                  )}
                  {cpsNaoConciliadas.map((cp) => {
                    const match = getMatch(null, cp.id);
                    const ativa = cpSelecionada === cp.id;
                    const checked = contasSelecionadasManual.has(cp.id);
                    const modoNxN = !!movSelecionada;
                    return (
                      <div
                        key={cp.id}
                        className={
                          "flex items-start gap-2 p-3 rounded-lg border text-sm transition-colors " +
                          (checked
                            ? "border-admin bg-admin/5"
                            : ativa
                              ? "border-admin bg-admin/5"
                              : match
                                ? "border-warning/40 bg-warning/5"
                                : "hover:bg-muted/50")
                        }
                      >
                        {modoNxN && (
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleContaManual(cp.id)}
                            className="mt-0.5"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (modoNxN) {
                              toggleContaManual(cp.id);
                            } else {
                              setCpSelecionada(ativa ? null : cp.id);
                            }
                          }}
                          className="flex-1 text-left min-w-0"
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
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botão match 1:1 (legado) — só aparece quando há seleção 1:1 sem checkboxes */}
          {movSelecionada && cpSelecionada && contasSelecionadasManual.size === 0 && (
            <div className="flex justify-center">
              <Button
                onClick={conciliarManual}
                disabled={conciliando}
                className="bg-admin hover:bg-admin/90 text-admin-foreground gap-2"
              >
                {conciliando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Conciliar selecionados (1:1)
              </Button>
            </div>
          )}
        </TabsContent>


        {/* TAB 2 — EXTRATO SEM NF (auto + manuais) */}
        <TabsContent value="extrato_sem_nf" className="space-y-4 mt-4">
          {autoCategorizaveis.length > 0 && (
            <Card className="border-admin/30">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-admin" />
                  Transações bancárias reconhecidas
                  <Badge className="bg-admin/10 text-admin border-admin/30">{autoCategorizaveis.length}</Badge>
                </CardTitle>
                <Button
                  size="sm"
                  onClick={aceitarTodosAuto}
                  disabled={conciliando}
                  className="bg-admin hover:bg-admin/90 text-admin-foreground gap-2"
                >
                  {conciliando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Aceitar todos
                </Button>
              </CardHeader>
              <CardContent className="space-y-1">
                {autoCategorizaveis.map((mov) => (
                  <div key={mov.id} className="flex items-center gap-3 p-3 rounded-lg border bg-admin/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{mov.descricao}</p>
                      <p className="text-xs text-muted-foreground">{formatDateBR(mov.data_transacao)}</p>
                    </div>
                    <span className={"font-medium text-sm " + (Number(mov.valor) < 0 ? "text-destructive" : "text-success")}>
                      {formatBRL(Number(mov.valor))}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {mov._regra_auto?.categoria_codigo} — {mov._regra_auto?.descricao_limpa}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => aceitarUmAuto(mov)}
                      disabled={conciliando}
                    >
                      Aceitar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {manuais.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Pendentes de identificação
                  <Badge variant="outline">{manuais.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {manuais.map((mov) => (
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
                        onChange={(catId) => categorizarMovOrfa(mov, catId)}
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

          {autoCategorizaveis.length === 0 && manuais.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma transação no extrato sem NF correspondente.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3 — NF SEM EXTRATO */}
        <TabsContent value="nf_sem_extrato" className="space-y-4 mt-4">
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
              {cpsSemExtrato.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Tudo conciliado — todas as contas pagas têm correspondência no extrato.
                </p>
              )}
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
        </TabsContent>
      </Tabs>

      {/* Dialog confirmação batch */}
      <Dialog open={showConfirmar} onOpenChange={setShowConfirmar}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar conciliação automática</DialogTitle>
            <DialogDescription>
              {matchesParaConfirmar.length} matches encontrados com alta confiança (≥ 60%).
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

      {/* Dialog criar regra (aprendizado) */}
      <Dialog open={showCriarRegra} onOpenChange={setShowCriarRegra}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar regra para o extrato?</DialogTitle>
            <DialogDescription>
              {regraDraft && (
                <>
                  Próxima vez que o extrato contiver <strong>"{regraDraft.padrao}"</strong>, categorizar
                  automaticamente como <strong>{regraDraft.categoriaNome}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCriarRegra(false)}>
              Não
            </Button>
            <Button
              onClick={criarRegra}
              className="bg-admin hover:bg-admin/90 text-admin-foreground gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Sim, criar regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarExtratoDialog
        open={showImportar}
        onOpenChange={setShowImportar}
        contaPreSelecionada={contaBancariaId !== "todas" ? contaBancariaId : undefined}
      />
    </div>
  );
}
