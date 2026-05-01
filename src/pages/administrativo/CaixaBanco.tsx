import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  Search,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  FileWarning,
  CreditCard,
  Repeat,
  AlertTriangle,
  Stethoscope,
  Receipt,
  FolderTree,
  Paperclip,
  Flame,
  AlertOctagon,
  CalendarClock,
  CalendarRange,
  RefreshCcw,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { formatBRL, formatDateBR } from "@/lib/format-currency";

import ContaPagarDetalheDrawer from "@/components/financeiro/ContaPagarDetalheDrawer";
import { getCompromissoInfoMap, type CompromissoInfo } from "@/lib/financeiro/get-compromisso-info";
import { getMeioPagamentoIcon } from "@/lib/financeiro/meio-pagamento-icon";
import { useQualidadeDadoMap } from "@/hooks/useQualidadeDadoMap";
import { getQualidadeDadoIcon } from "@/lib/financeiro/qualidade-dado-icon";

import { getStatusFlagsMap, type FlagsContaPagar } from "@/lib/financeiro/get-status-flags";
import { classFundoFuturo } from "@/lib/financeiro/is-vencimento-futuro";
import { cn } from "@/lib/utils";
import { useFiltrosPersistentes } from "@/hooks/useFiltrosPersistentes";

type Lancamento = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  pago_em: string | null;
  pago_em_conta_id: string | null;
  conciliado_em: string | null;
  movimentacao_bancaria_id: string | null;
  status_conta_pagar: string;
  status_caixa: "em_aberto" | "pago" | "conciliado";
  fornecedor_cliente: string | null;
  parceiro_id: string | null;
  forma_pagamento_id: string | null;
  categoria_id: string | null;
  unidade: string | null;
  nf_numero: string | null;
  origem_view: "conta_pagar" | "cartao_lancamento";
  origem?: string | null;
  fatura_id: string | null;
  vinculada_cartao?: boolean | null;
  fatura_vencimento?: string | null;
  categoria_inconsistente?: boolean | null;
  inconsistencia_motivo?: string | null;
};

/**
 * Status visual = espelho do status decisório de Contas a Pagar.
 * Lançamentos de cartão (que ainda não viraram conta a pagar individual)
 * não têm status_conta_pagar — caem em fallback derivado.
 */
function statusVisual(l: Lancamento): string {
  if (l.origem_view === "cartao_lancamento") {
    // Lançamentos de fatura ainda não viraram conta a pagar autônoma.
    // Usa derivação simples: se conciliado/pago, "paga"; senão "aguardando_pagamento".
    if (l.movimentacao_bancaria_id || l.status_caixa === "conciliado") return "paga";
    if (l.status_caixa === "pago") return "paga";
    return "aguardando_pagamento";
  }
  // Conta a pagar normal: espelha direto
  return l.status_conta_pagar || "aberto";
}

/**
 * Conta a pagar é "atrasada" quando vencimento passou e não foi paga/cancelada.
 * Computado client-side (view não expõe campo equivalente).
 */
function isAtrasada(l: Lancamento): boolean {
  if (!l.data_vencimento) return false;
  const status = statusVisual(l);
  if (status === "paga" || status === "cancelado") return false;
  // Comparação de data sem hora (evita TZ surpresas)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(l.data_vencimento + "T00:00:00");
  return venc < hoje;
}

/**
 * Qualidade da NF: vermelho se nenhum NF anexada; verde caso contrário.
 */
function getQualidadeNF(
  m: { id: string },
  nfMap?: Map<string, string | null>,
): { cor: "verde" | "vermelho"; motivo: string } {
  const temNF = nfMap?.has(m.id) === true;
  return temNF
    ? { cor: "verde", motivo: "NF vinculada" }
    : { cor: "vermelho", motivo: "Sem NF anexada" };
}

/**
 * Qualidade da Categoria: compara com a categoria da NF vinculada.
 * Verde = validada por NF (ou NF não tem categoria pra comparar)
 * Amarelo = tem categoria mas sem NF pra validar
 * Vermelho = sem categoria OU diverge da NF
 */
function getQualidadeCategoria(
  m: { id: string; categoria_id: string | null },
  nfMap?: Map<string, string | null>,
): { cor: "verde" | "amarelo" | "vermelho"; motivo: string } {
  if (!m.categoria_id) {
    return { cor: "vermelho", motivo: "Sem categoria" };
  }
  const categoriaDaNF = nfMap?.get(m.id);
  if (categoriaDaNF === undefined) {
    return { cor: "amarelo", motivo: "Tem categoria mas não validada por NF" };
  }
  if (categoriaDaNF === null) {
    return { cor: "verde", motivo: "Categoria OK (NF sem categoria pra comparar)" };
  }
  if (m.categoria_id !== categoriaDaNF) {
    return {
      cor: "vermelho",
      motivo: "Categoria diverge da NF — edite na NF pra resolver",
    };
  }
  return { cor: "verde", motivo: "Categoria validada por NF" };
}

type ContaBancariaLite = {
  id: string;
  nome_exibicao: string;
  cor: string | null;
};

type FormaPgtoLite = {
  id: string;
  nome: string;
};

type Parceiro = {
  id: string;
  razao_social: string | null;
};

type CategoriaLite = {
  id: string;
  nome: string;
};

// Status visual em Caixa & Banco ESPELHA status decisório de Contas a Pagar.
// Doutrina: status é status — sem tradução, sem derivação.
const STATUS_STYLES: Record<string, string> = {
  aberto: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  aprovado: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  aguardando_pagamento: "bg-teal-100 text-teal-800 hover:bg-teal-100",
  paga: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  cancelado: "bg-red-100 text-red-800 hover:bg-red-100",
};

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  aprovado: "Aprovado",
  aguardando_pagamento: "Aguardando pagamento",
  paga: "Paga",
  cancelado: "Cancelado",
};

type FiltroOperacional =
  | "todos"
  | "atrasados"
  | "mes_atual"
  | "proximo_mes"
  | "tres_meses"
  | "sem_conciliacao"
  | "qualidade_nf"
  | "qualidade_categoria"
  | "qualidade_doc";

function CardKPI({
  titulo,
  valor,
  sublinha,
  cor,
  ativo,
  onClick,
  icone: Icon,
}: {
  titulo: string;
  valor: string;
  sublinha: string;
  cor: "red" | "blue" | "purple" | "teal" | "fetely";
  ativo: boolean;
  onClick: () => void;
  icone?: LucideIcon;
}) {
  const corMap: Record<string, string> = {
    red: ativo ? "bg-red-50 border-red-300" : "",
    blue: ativo ? "bg-blue-50 border-blue-300" : "",
    purple: ativo ? "bg-purple-50 border-purple-300" : "",
    teal: ativo ? "bg-teal-50 border-teal-300" : "",
    fetely: ativo ? "bg-emerald-50 border-emerald-300" : "",
  };
  const textMap: Record<string, string> = {
    red: "text-red-700",
    blue: "text-blue-700",
    purple: "text-purple-700",
    teal: "text-teal-700",
    fetely: "text-emerald-700",
  };
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        corMap[cor],
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-[11px] font-normal text-muted-foreground flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3" />}
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 px-3">
        <div className={cn("text-lg font-bold", textMap[cor])}>{valor}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{sublinha}</div>
      </CardContent>
    </Card>
  );
}

const PAGE_SIZE = 25;

export default function CaixaBanco() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useFiltrosPersistentes<string>("caixabanco_status", "todos");
  const [contaBancariaFilter, setContaBancariaFilter] = useFiltrosPersistentes<string>("caixabanco_conta", "todas");
  const [busca, setBusca] = useFiltrosPersistentes<string>("caixabanco_busca", "");
  const [contaIdDrawer, setContaIdDrawer] = useState<string | null>(null);
  const [mostrarSoInconsistentes, setMostrarSoInconsistentes] = useState(false);
  const [filtroOp, setFiltroOp] = useState<FiltroOperacional>("todos");
  const navigate = useNavigate();

  // Query da view unificada
  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ["lancamentos-caixa-banco"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("vw_lancamentos_caixa_banco")
        .select("*")
        .in("status_conta_pagar", ["aguardando_pagamento", "paga"])
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return (data || []) as Lancamento[];
    },
  });

  // Contas bancárias
  const { data: contasBancarias } = useQuery({
    queryKey: ["contas-bancarias-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contas_bancarias")
        .select("id, nome_exibicao, cor")
        .order("nome_exibicao");
      return (data || []) as ContaBancariaLite[];
    },
  });

  // Formas de pagamento
  const { data: formasPagamento } = useQuery({
    queryKey: ["formas-pagamento-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("formas_pagamento")
        .select("id, nome");
      return (data || []) as FormaPgtoLite[];
    },
  });

  // Parceiros
  const { data: parceiros } = useQuery({
    queryKey: ["parceiros-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parceiros_comerciais")
        .select("id, razao_social");
      return (data || []) as Parceiro[];
    },
  });

  // Plano de contas (categorias)
  const { data: categorias } = useQuery({
    queryKey: ["plano-contas-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plano_contas")
        .select("id, nome");
      return (data || []) as CategoriaLite[];
    },
  });

  // Map: lancamento.id -> { tipo: 'recorrente'|'parcelado', titulo }
  // Só busca pra lançamentos vindos de contas a pagar (não pra cartão_lancamento)
  const idsParaCompromisso = useMemo(
    () =>
      (lancamentos || [])
        .filter((l) => l.origem_view === "conta_pagar")
        .map((l) => l.id),
    [lancamentos],
  );

  const { data: compromissoInfoMap = new Map<string, CompromissoInfo>() } = useQuery({
    queryKey: ["compromisso-info-map-caixa-banco", idsParaCompromisso.join(",")],
    enabled: idsParaCompromisso.length > 0,
    queryFn: () => getCompromissoInfoMap(idsParaCompromisso),
  });

  // Map: lancamento.id -> { tem_doc_pendente, atrasada }
  // Necessário porque vw_lancamentos_caixa_banco não expõe esses derivados.
  const { data: statusFlagsMap = new Map<string, FlagsContaPagar>() } = useQuery({
    queryKey: ["status-flags-map-caixa-banco", idsParaCompromisso.join(",")],
    enabled: idsParaCompromisso.length > 0,
    queryFn: () => getStatusFlagsMap(idsParaCompromisso),
  });

  // Map de qualidade do dado por id (bolinha 🔴/🟡 na coluna Tags).
  const { data: qualidadeMap } = useQualidadeDadoMap(idsParaCompromisso);

  // Inconsistência de categoria (NF vs Conta) — vive em movimentacoes_bancarias.
  const movIds = useMemo(
    () =>
      Array.from(
        new Set(
          (lancamentos || [])
            .map((l) => l.movimentacao_bancaria_id)
            .filter((x): x is string => !!x),
        ),
      ),
    [lancamentos],
  );

  const { data: inconsistMap = new Map<string, { categoria_inconsistente: boolean | null; inconsistencia_motivo: string | null }>() } = useQuery({
    queryKey: ["mov-inconsist-map", movIds.join(",")],
    enabled: movIds.length > 0,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("movimentacoes_bancarias")
        .select("id, categoria_inconsistente, inconsistencia_motivo")
        .in("id", movIds);
      if (error) throw error;
      const m = new Map<string, { categoria_inconsistente: boolean | null; inconsistencia_motivo: string | null }>();
      (data || []).forEach((r: any) => m.set(r.id, { categoria_inconsistente: r.categoria_inconsistente, inconsistencia_motivo: r.inconsistencia_motivo }));
      return m;
    },
  });

  // NF vinculada a cada lançamento (pra validar categoria mesmo sem mov criada).
  const lancamentoIds = useMemo(
    () => (lancamentos || []).map((l) => l.id).filter(Boolean),
    [lancamentos],
  );

  const { data: nfMap } = useQuery({
    queryKey: ["nfs-vinculadas-mov", lancamentoIds.join(",")],
    enabled: lancamentoIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("nfs_stage")
        .select("conta_pagar_id, categoria_id")
        .in("conta_pagar_id", lancamentoIds);
      if (error) throw error;
      const map = new Map<string, string | null>();
      (data || []).forEach((nf: { conta_pagar_id: string | null; categoria_id: string | null }) => {
        if (nf.conta_pagar_id) map.set(nf.conta_pagar_id, nf.categoria_id);
      });
      return map;
    },
  });

  // Lançamentos enriquecidos com flags de inconsistência da movimentação vinculada.
  const lancamentosEnriched = useMemo(() => {
    return (lancamentos || []).map((l) => {
      if (!l.movimentacao_bancaria_id) return l;
      const inc = inconsistMap.get(l.movimentacao_bancaria_id);
      if (!inc) return l;
      return {
        ...l,
        categoria_inconsistente: inc.categoria_inconsistente,
        inconsistencia_motivo: inc.inconsistencia_motivo,
      };
    });
  }, [lancamentos, inconsistMap]);
  // Mapas de lookup
  const mapContas = useMemo(() => {
    const m: Record<string, ContaBancariaLite> = {};
    (contasBancarias || []).forEach((c) => (m[c.id] = c));
    return m;
  }, [contasBancarias]);

  const mapFormas = useMemo(() => {
    const m: Record<string, string> = {};
    (formasPagamento || []).forEach((f) => (m[f.id] = f.nome));
    return m;
  }, [formasPagamento]);

  const mapParceiros = useMemo(() => {
    const m: Record<string, string> = {};
    (parceiros || []).forEach((p) => {
      if (p.razao_social) m[p.id] = p.razao_social;
    });
    return m;
  }, [parceiros]);

  const mapCategorias = useMemo(() => {
    const m: Record<string, string> = {};
    (categorias || []).forEach((c) => (m[c.id] = c.nome));
    return m;
  }, [categorias]);

  // Filtros
  const filtered = useMemo(() => {
    let list = lancamentosEnriched;
    if (statusFilter !== "todos") {
      list = list.filter((l) => statusVisual(l) === statusFilter);
    }
    if (contaBancariaFilter !== "todas") {
      list = list.filter((l) => l.pago_em_conta_id === contaBancariaFilter);
    }
    if (mostrarSoInconsistentes) {
      list = list.filter((l) => l.categoria_inconsistente === true);
    }
    if (busca.trim()) {
      const t = busca.toLowerCase();
      list = list.filter((l) => {
        const parceiroNome =
          (l.parceiro_id && mapParceiros[l.parceiro_id]) || l.fornecedor_cliente || "";
        return (
          l.descricao?.toLowerCase().includes(t) ||
          parceiroNome.toLowerCase().includes(t) ||
          (l.nf_numero || "").toLowerCase().includes(t)
        );
      });
    }

    // Filtros operacionais (cards clicáveis)
    if (filtroOp !== "todos") {
      const h = new Date();
      h.setHours(0, 0, 0, 0);
      const iniMes = new Date(h.getFullYear(), h.getMonth(), 1);
      const fimMes = new Date(h.getFullYear(), h.getMonth() + 1, 0, 23, 59, 59);
      const iniProx = new Date(h.getFullYear(), h.getMonth() + 1, 1);
      const fimProx = new Date(h.getFullYear(), h.getMonth() + 2, 0, 23, 59, 59);
      const fim3 = new Date(h.getFullYear(), h.getMonth() + 4, 0, 23, 59, 59);
      const flagsDoc = (l: Lancamento) => statusFlagsMap.get(l.id)?.tem_doc_pendente === true;

      if (filtroOp === "atrasados") {
        list = list.filter((l) => {
          if (!l.data_vencimento) return false;
          const v = new Date(l.data_vencimento + "T00:00:00");
          return v < h && statusVisual(l) === "aguardando_pagamento";
        });
      } else if (filtroOp === "mes_atual") {
        list = list.filter((l) => {
          if (!l.data_vencimento) return false;
          const v = new Date(l.data_vencimento + "T00:00:00");
          return v >= iniMes && v <= fimMes && statusVisual(l) === "aguardando_pagamento";
        });
      } else if (filtroOp === "proximo_mes") {
        list = list.filter((l) => {
          if (!l.data_vencimento) return false;
          const v = new Date(l.data_vencimento + "T00:00:00");
          return v >= iniProx && v <= fimProx && statusVisual(l) === "aguardando_pagamento";
        });
      } else if (filtroOp === "tres_meses") {
        list = list.filter((l) => {
          if (!l.data_vencimento) return false;
          const v = new Date(l.data_vencimento + "T00:00:00");
          return v >= iniProx && v <= fim3 && statusVisual(l) === "aguardando_pagamento";
        });
      } else if (filtroOp === "sem_conciliacao") {
        list = list.filter((l) => {
          if (!l.data_vencimento) return false;
          const v = new Date(l.data_vencimento + "T00:00:00");
          return (
            v >= iniMes &&
            v <= fimMes &&
            statusVisual(l) === "paga" &&
            !l.conciliado_em
          );
        });
      } else if (filtroOp === "qualidade_nf") {
        list = list.filter((l) => getQualidadeNF(l, nfMap).cor === "vermelho");
      } else if (filtroOp === "qualidade_categoria") {
        list = list.filter((l) => getQualidadeCategoria(l, nfMap).cor === "vermelho");
      } else if (filtroOp === "qualidade_doc") {
        list = list.filter(flagsDoc);
      }
    }

    return list;
  }, [lancamentosEnriched, statusFilter, contaBancariaFilter, busca, mapParceiros, mostrarSoInconsistentes, filtroOp, nfMap, statusFlagsMap]);

  // Totais
  const totals = useMemo(() => {
    const all = lancamentos || [];
    const emAberto = all
      .filter((l) => {
        const s = statusVisual(l);
        return s !== "paga" && s !== "cancelado" && l.origem_view !== "cartao_lancamento";
      })
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const pago = all
      .filter((l) => statusVisual(l) === "paga")
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const conciliado = all
      .filter((l) => l.movimentacao_bancaria_id)
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    return {
      emAberto,
      pago,
      conciliado,
      countAberto: all.filter((l) => {
        const s = statusVisual(l);
        return s !== "paga" && s !== "cancelado" && l.origem_view !== "cartao_lancamento";
      }).length,
      countPago: all.filter((l) => statusVisual(l) === "paga").length,
      countConciliado: all.filter((l) => l.movimentacao_bancaria_id).length,
    };
  }, [lancamentos]);

  // Saúde do dado (binário: vermelho/verde) — usa lancamentosEnriched p/ pegar inconsistência.
  const qtdComProblema = useMemo(
    () =>
      lancamentosEnriched.filter((m) => {
        const qNF = getQualidadeNF(m, nfMap);
        const qCat = getQualidadeCategoria(m, nfMap);
        return qNF.cor === "vermelho" || qCat.cor === "vermelho";
      }).length,
    [lancamentosEnriched, nfMap],
  );
  const totalLancamentos = lancamentosEnriched.length;
  const pctSaude = totalLancamentos > 0
    ? Math.round((1 - qtdComProblema / totalLancamentos) * 100)
    : 100;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function nomeParceiro(l: Lancamento): string {
    return (
      (l.parceiro_id && mapParceiros[l.parceiro_id]) ||
      l.fornecedor_cliente ||
      "—"
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-admin" />
            Caixa e Banco
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Movimentações — espinha dorsal financeira (realizado + comprometido).
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" /> Em aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatBRL(totals.emAberto)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totals.countAberto} {totals.countAberto === 1 ? "lançamento" : "lançamentos"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatBRL(totals.pago)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totals.countPago} {totals.countPago === 1 ? "pagamento" : "pagamentos"} aguardando conciliação
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-emerald-700" /> Conciliado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-800">
              {formatBRL(totals.conciliado)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totals.countConciliado} batem com extrato
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-colors",
            filtroSoVermelhas && "ring-2 ring-red-400",
          )}
          onClick={() => setFiltroSoVermelhas(!filtroSoVermelhas)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-emerald-600" /> Saúde do dado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                pctSaude >= 95
                  ? "text-emerald-700"
                  : pctSaude >= 70
                    ? "text-amber-700"
                    : "text-red-700",
              )}
            >
              {pctSaude}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {qtdComProblema} {qtdComProblema === 1 ? "lançamento" : "lançamentos"} com alerta
              {filtroSoVermelhas && " · filtro ativo"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + Ações em massa */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar parceiro, descrição ou NF..."
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="em_aberto">Em aberto</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="conciliado">Conciliado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={contaBancariaFilter} onValueChange={setContaBancariaFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Conta bancária" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as contas</SelectItem>
                {(contasBancarias || []).map((cb) => (
                  <SelectItem key={cb.id} value={cb.id}>
                    {cb.nome_exibicao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMostrarSoInconsistentes(!mostrarSoInconsistentes)}
              className={cn(
                "gap-1",
                mostrarSoInconsistentes && "bg-amber-600 hover:bg-amber-700 text-white border-amber-600",
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Inconsistências
            </Button>

          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum lançamento encontrado.
              <p className="text-xs mt-2">
                Quando uma conta a pagar for finalizada, aparece aqui automaticamente.
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Dt. Vencimento</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Dt. Pagamento</TableHead>
                      <TableHead>Meio PG</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((l) => {
                      const sVisual = statusVisual(l);
                      const atrasada = isAtrasada(l);
                      const formaNome =
                        l.forma_pagamento_id && mapFormas[l.forma_pagamento_id];
                      const categoriaNome =
                        l.categoria_id && mapCategorias[l.categoria_id];
                      const conciliada = !!l.movimentacao_bancaria_id;
                      const flags = statusFlagsMap.get(l.id);
                      const docPendente = !!flags?.tem_doc_pendente;
                      return (
                        <TableRow
                          key={l.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors",
                            atrasada && "bg-red-50/60 hover:bg-red-50",
                            !atrasada && classFundoFuturo(l.data_vencimento),
                          )}
                          onClick={() => {
                            if (l.origem_view === "cartao_lancamento") {
                              navigate("/administrativo/faturas-cartao");
                            } else {
                              setContaIdDrawer(l.id);
                            }
                          }}
                        >
                          <TableCell className="max-w-[180px]">
                            <div className="truncate" title={nomeParceiro(l)}>
                              {nomeParceiro(l)}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate text-xs text-muted-foreground" title={l.descricao}>
                                {l.descricao}
                              </span>
                              {(() => {
                                const ci = compromissoInfoMap.get(l.id);
                                if (ci?.tipo === "recorrente") {
                                  return (
                                    <span
                                      className="shrink-0"
                                      title={`Recorrente — ${ci.titulo}`}
                                    >
                                      <Repeat className="h-3.5 w-3.5 text-indigo-600" />
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              {conciliada && (
                                <span
                                  className="shrink-0"
                                  title="Conciliada — bateu com extrato bancário"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                </span>
                              )}
                            </div>
                            {(l.vinculada_cartao || l.origem_view === "cartao_lancamento") && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1.5 h-4 border-violet-300 text-violet-700 bg-violet-50/50 gap-1 mt-0.5"
                              >
                                <CreditCard className="h-2.5 w-2.5" />
                                Cartão
                                {l.fatura_vencimento && (
                                  <span className="ml-0.5 opacity-80">
                                    · venc {new Date(l.fatura_vencimento).toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {formatDateBR(l.data_vencimento)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1.5">
                              {categoriaNome ? (
                                <div
                                  className="truncate max-w-[160px]"
                                  title={categoriaNome}
                                >
                                  {categoriaNome}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                              {l.categoria_inconsistente && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] py-0 px-1.5 h-4 border-amber-400 text-amber-700 bg-amber-50 gap-1 whitespace-nowrap shrink-0"
                                      >
                                        <AlertTriangle className="h-2.5 w-2.5" />
                                        Inconsistente
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-xs">
                                        {l.inconsistencia_motivo || "Categoria diverge da NF vinculada."}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {l.data_pagamento ? (
                              formatDateBR(l.data_pagamento)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {(() => {
                              if (!formaNome) return "—";
                              const ico = getMeioPagamentoIcon(formaNome);
                              if (ico) {
                                return (
                                  <span
                                    className="flex items-center gap-1.5 whitespace-nowrap"
                                    title={formaNome}
                                  >
                                    <ico.Icon className={`h-4 w-4 ${ico.cor} shrink-0`} />
                                    <span>{formaNome}</span>
                                  </span>
                                );
                              }
                              return formaNome;
                            })()}
                          </TableCell>
                          <TableCell className="text-right font-mono whitespace-nowrap">
                            {formatBRL(l.valor)}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_STYLES[sVisual] || "bg-muted"}>
                              {STATUS_LABEL[sVisual] || sVisual}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <div className="flex flex-wrap gap-1 items-center">
                              {(() => {
                                const qNF = getQualidadeNF(l, nfMap);
                                const qCat = getQualidadeCategoria(l, nfMap);
                                const docOk = !docPendente;
                                const corClass = (cor: "verde" | "amarelo" | "vermelho") => {
                                  if (cor === "verde") return "text-emerald-600";
                                  if (cor === "amarelo") return "text-amber-500";
                                  return "text-red-500";
                                };
                                return (
                                  <TooltipProvider>
                                    <div className="flex items-center gap-2 mr-1">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Receipt className={cn("h-3.5 w-3.5 cursor-help", corClass(qNF.cor))} strokeWidth={2.2} />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="text-xs">📄 {qNF.motivo}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <FolderTree className={cn("h-3.5 w-3.5 cursor-help", corClass(qCat.cor))} strokeWidth={2.2} />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="text-xs">🏷️ {qCat.motivo}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Paperclip
                                            className={cn(
                                              "h-3.5 w-3.5 cursor-help",
                                              docOk ? "text-emerald-600" : "text-red-500"
                                            )}
                                            strokeWidth={2.2}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="text-xs">
                                            {docOk ? "Documento anexado/OK" : "Documento pendente"}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TooltipProvider>
                                );
                              })()}
                              {(() => {
                                const q = qualidadeMap?.get(l.id);
                                const visual = getQualidadeDadoIcon(q?.nivel, q?.motivos);
                                if (!visual) return null;
                                const QIcon = visual.Icon;
                                return (
                                  <span title={visual.tooltip} className="inline-flex items-center mr-1">
                                    <QIcon className={`h-2.5 w-2.5 ${visual.cor} ${visual.bg}`} />
                                  </span>
                                );
                              })()}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "lançamento" : "lançamentos"} • Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ContaPagarDetalheDrawer
        contaId={contaIdDrawer}
        onClose={() => setContaIdDrawer(null)}
      />
    </div>
  );
}
