/**
 * Movimentações (Caixa & Banco) — orchestrator.
 *
 * Refatorado em 2 abas (A pagar / Realizado). Esta página fica responsável
 * por: fetch da view consolidada + maps auxiliares, filtros globais (busca +
 * conta bancária), split via statusVisual e roteamento de prop pra cada aba.
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Wallet, Search } from "lucide-react";
import { useFiltrosPersistentes } from "@/hooks/useFiltrosPersistentes";
import ContaPagarDetalheDrawer from "@/components/financeiro/ContaPagarDetalheDrawer";
import {
  getCompromissoInfoMap,
  type CompromissoInfo,
} from "@/lib/financeiro/get-compromisso-info";
import {
  getStatusFlagsMap,
  type FlagsContaPagar,
} from "@/lib/financeiro/get-status-flags";
import AbaAPagar from "./CaixaBanco/AbaAPagar";
import AbaRealizado from "./CaixaBanco/AbaRealizado";
import {
  type Lancamento,
  type ContaBancariaLite,
  statusVisual,
} from "./CaixaBanco/utils";

type FormaPgtoLite = { id: string; nome: string };
type Parceiro = { id: string; razao_social: string | null };
type CategoriaLite = { id: string; nome: string };

export default function CaixaBanco() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as "a_pagar" | "realizado") || "a_pagar";
  const setTab = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", v);
    setSearchParams(next, { replace: true });
  };

  const [contaBancariaFilter, setContaBancariaFilter] = useFiltrosPersistentes<string>(
    "caixabanco_conta",
    "todas",
  );
  const [busca, setBusca] = useFiltrosPersistentes<string>("caixabanco_busca", "");
  const [contaIdDrawer, setContaIdDrawer] = useState<string | null>(null);

  // Query principal — view unificada
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

  const { data: formasPagamento } = useQuery({
    queryKey: ["formas-pagamento-lite"],
    queryFn: async () => {
      const { data } = await supabase.from("formas_pagamento").select("id, nome");
      return (data || []) as FormaPgtoLite[];
    },
  });

  const { data: parceiros } = useQuery({
    queryKey: ["parceiros-lite"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parceiros_comerciais")
        .select("id, razao_social");
      return (data || []) as Parceiro[];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["plano-contas-lite"],
    queryFn: async () => {
      const { data } = await supabase.from("plano_contas").select("id, nome");
      return (data || []) as CategoriaLite[];
    },
  });

  // Compromisso info (recorrente/parcelado)
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

  const { data: statusFlagsMap = new Map<string, FlagsContaPagar>() } = useQuery({
    queryKey: ["status-flags-map-caixa-banco", idsParaCompromisso.join(",")],
    enabled: idsParaCompromisso.length > 0,
    queryFn: () => getStatusFlagsMap(idsParaCompromisso),
  });

  // Inconsistência via movimentações vinculadas
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data || []).forEach((r: any) =>
        m.set(r.id, {
          categoria_inconsistente: r.categoria_inconsistente,
          inconsistencia_motivo: r.inconsistencia_motivo,
        }),
      );
      return m;
    },
  });

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
      (data || []).forEach(
        (nf: { conta_pagar_id: string | null; categoria_id: string | null }) => {
          if (nf.conta_pagar_id) map.set(nf.conta_pagar_id, nf.categoria_id);
        },
      );
      return map;
    },
  });

  const { data: contadorMap } = useQuery({
    queryKey: ["contador-enviados-mov", lancamentoIds.join(",")],
    enabled: lancamentoIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("remessas_contador_itens")
        .select("conta_id, remessas_contador!inner(enviada_em, descricao)")
        .in("conta_id", lancamentoIds);
      if (error) throw error;
      const map = new Map<string, { enviada_em: string; descricao: string | null }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data || []).forEach((it: any) => {
        const r = it.remessas_contador;
        if (!r || !it.conta_id) return;
        const existing = map.get(it.conta_id);
        if (!existing || new Date(r.enviada_em) > new Date(existing.enviada_em)) {
          map.set(it.conta_id, { enviada_em: r.enviada_em, descricao: r.descricao });
        }
      });
      return map;
    },
  });

  // Enriquecimento com flags de inconsistência
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

  // Maps de lookup
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

  // Filtros globais (busca + conta bancária)
  const filteredGlobal = useMemo(() => {
    let list = lancamentosEnriched;
    if (contaBancariaFilter !== "todas") {
      list = list.filter((l) => l.pago_em_conta_id === contaBancariaFilter);
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
    return list;
  }, [lancamentosEnriched, contaBancariaFilter, busca, mapParceiros]);

  // Split por status visual
  const { listaAPagar, listaRealizado } = useMemo(() => {
    const aPagar: Lancamento[] = [];
    const realizado: Lancamento[] = [];
    for (const l of filteredGlobal) {
      const sv = statusVisual(l);
      if (sv === "aguardando_pagamento") aPagar.push(l);
      else if (sv === "paga") realizado.push(l);
    }
    return { listaAPagar: aPagar, listaRealizado: realizado };
  }, [filteredGlobal]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* HEADER STICKY GLOBAL */}
      <div className="sticky top-0 z-20 bg-background px-6 pt-6 pb-3 border-b space-y-3 backdrop-blur">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="h-6 w-6 text-admin" />
              Movimentações
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Espinha dorsal financeira (realizado + comprometido).
            </p>
          </div>
        </div>

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

          <Select value={contaBancariaFilter} onValueChange={setContaBancariaFilter}>
            <SelectTrigger className="w-[220px]">
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
        </div>
      </div>

      {/* CONTEÚDO COM SCROLL */}
      <div className="flex-1 overflow-auto px-6 pb-6 pt-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="a_pagar">
              A pagar ({listaAPagar.length})
            </TabsTrigger>
            <TabsTrigger value="realizado">
              Realizado ({listaRealizado.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="a_pagar">
            <AbaAPagar
              lista={listaAPagar}
              isLoading={isLoading}
              mapParceiros={mapParceiros}
              mapFormas={mapFormas}
              mapCategorias={mapCategorias}
              nfMap={nfMap}
              statusFlagsMap={statusFlagsMap}
              compromissoInfoMap={compromissoInfoMap}
              onOpenConta={setContaIdDrawer}
            />
          </TabsContent>

          <TabsContent value="realizado">
            <AbaRealizado
              lista={listaRealizado}
              isLoading={isLoading}
              mapParceiros={mapParceiros}
              mapFormas={mapFormas}
              mapCategorias={mapCategorias}
              nfMap={nfMap}
              statusFlagsMap={statusFlagsMap}
              contadorMap={contadorMap}
              compromissoInfoMap={compromissoInfoMap}
              onOpenConta={setContaIdDrawer}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ContaPagarDetalheDrawer
        contaId={contaIdDrawer}
        onClose={() => setContaIdDrawer(null)}
      />
    </div>
  );
}
