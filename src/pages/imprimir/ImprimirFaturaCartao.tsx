import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Extrato printável da Fatura de Cartão — uso interno (Flavio).
 *
 * Doutrina cravada (29/04/2026):
 * - Sem sidebar, sem header de app (rota standalone)
 * - Layout limpo, fonte serif, paleta Fetely
 * - CSS @media print cuida de margens e quebra de página
 * - Botões "Voltar" e "Imprimir" só aparecem na tela (não no PDF)
 */

type FaturaDetalhe = {
  id: string;
  data_vencimento: string;
  data_fechamento: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  valor_total: number;
  status: string;
  observacao: string | null;
  conta_bancaria?: { nome_exibicao: string; banco: string | null } | null;
};

type Lancamento = {
  id: string;
  data_compra: string;
  descricao: string;
  valor: number;
  status: string;
  estabelecimento_local: string | null;
  conta_pagar_id?: string | null;
};

type ContaPagarLite = {
  id: string;
  descricao: string;
  status: string;
  conta_id: string | null;
  centro_custo: string | null;
};

type PlanoConta = {
  id: string;
  codigo: string | null;
  nome: string;
};

const STATUS_LANC_LABEL: Record<string, string> = {
  pendente: "Pendente",
  conciliado: "Vinculada",
  virou_despesa: "Virou despesa",
  ignorado: "Ignorada",
};

function formatBRL(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  // Aceita YYYY-MM-DD ou ISO
  const apenas = d.slice(0, 10);
  const [y, m, dd] = apenas.split("-");
  if (!y || !m || !dd) return d;
  return `${dd}/${m}/${y}`;
}

export default function ImprimirFaturaCartao() {
  const { faturaId } = useParams<{ faturaId: string }>();
  const navigate = useNavigate();

  // 1) Busca fatura
  const { data: fatura, isLoading: loadFat } = useQuery({
    queryKey: ["imprimir-fatura", faturaId],
    enabled: !!faturaId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("faturas_cartao")
        .select("*, conta_bancaria:conta_bancaria_id (nome_exibicao, banco)")
        .eq("id", faturaId)
        .single();
      if (error) throw error;
      return data as FaturaDetalhe;
    },
  });

  // 2) Busca lançamentos
  const { data: lancamentos = [], isLoading: loadLanc } = useQuery({
    queryKey: ["imprimir-fatura-lancamentos", faturaId],
    enabled: !!faturaId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("fatura_cartao_lancamentos")
        .select("id, data_compra, descricao, valor, status, estabelecimento_local, conta_pagar_id")
        .eq("fatura_id", faturaId)
        .order("data_compra", { ascending: true });
      if (error) throw error;
      return (data || []) as Lancamento[];
    },
  });

  // 3) Busca contas a pagar vinculadas (pra trazer categoria + centro de custo)
  const contaPagarIds = useMemo(
    () =>
      Array.from(
        new Set(
          lancamentos
            .map((l) => l.conta_pagar_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    [lancamentos],
  );

  const { data: contasPagar = [] } = useQuery({
    queryKey: ["imprimir-fatura-contas", contaPagarIds.join(",")],
    enabled: contaPagarIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar_receber")
        .select("id, descricao, status, conta_id, centro_custo")
        .in("id", contaPagarIds);
      if (error) throw error;
      return (data || []) as ContaPagarLite[];
    },
  });

  // 4) Plano de contas (categorias)
  const planoIds = useMemo(
    () =>
      Array.from(
        new Set(
          contasPagar.map((c) => c.conta_id).filter((id): id is string => Boolean(id)),
        ),
      ),
    [contasPagar],
  );

  const { data: planos = [] } = useQuery({
    queryKey: ["imprimir-fatura-plano", planoIds.join(",")],
    enabled: planoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_contas")
        .select("id, codigo, nome")
        .in("id", planoIds);
      if (error) throw error;
      return (data || []) as PlanoConta[];
    },
  });

  // Indexes
  const cpById = useMemo(() => {
    const m = new Map<string, ContaPagarLite>();
    contasPagar.forEach((c) => m.set(c.id, c));
    return m;
  }, [contasPagar]);

  const planoById = useMemo(() => {
    const m = new Map<string, PlanoConta>();
    planos.forEach((p) => m.set(p.id, p));
    return m;
  }, [planos]);

  // Função pra pegar categoria de um lançamento via conta a pagar vinculada
  function categoriaDoLancamento(l: Lancamento): string {
    if (!l.conta_pagar_id) return "—";
    const cp = cpById.get(l.conta_pagar_id);
    if (!cp || !cp.conta_id) return "—";
    const p = planoById.get(cp.conta_id);
    if (!p) return "—";
    return `${p.codigo || ""} ${p.nome}`.trim();
  }

  // Totais agrupados por categoria
  const totaisPorCategoria = useMemo(() => {
    const map = new Map<string, { categoria: string; valor: number; qtd: number }>();
    for (const l of lancamentos) {
      if (l.status === "ignorado") continue;
      const cat = categoriaDoLancamento(l);
      const atual = map.get(cat) || { categoria: cat, valor: 0, qtd: 0 };
      atual.valor += Number(l.valor) || 0;
      atual.qtd += 1;
      map.set(cat, atual);
    }
    return Array.from(map.values()).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
  }, [lancamentos, cpById, planoById]);

  // Totais por status
  const totaisPorStatus = useMemo(() => {
    const stats: Record<string, { qtd: number; valor: number }> = {};
    for (const l of lancamentos) {
      if (!stats[l.status]) stats[l.status] = { qtd: 0, valor: 0 };
      stats[l.status].qtd += 1;
      stats[l.status].valor += Number(l.valor) || 0;
    }
    return stats;
  }, [lancamentos]);

  // Soma efetiva (descartando ignorados)
  const somaEfetiva = useMemo(
    () =>
      lancamentos
        .filter((l) => l.status !== "ignorado")
        .reduce((s, l) => s + (Number(l.valor) || 0), 0),
    [lancamentos],
  );

  // Imprimir automaticamente quando query param ?auto=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auto") === "1" && fatura && lancamentos.length > 0) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [fatura, lancamentos]);

  if (loadFat || loadLanc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!fatura) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Fatura não encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* CSS de impressão */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page {
            size: A4;
            margin: 14mm 12mm;
          }
          body, html {
            background: white !important;
          }
          .impressao-wrapper {
            box-shadow: none !important;
            padding: 0 !important;
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div className="min-h-screen bg-zinc-50 py-8 px-4">
        {/* Toolbar (só na tela) */}
        <div className="no-print max-w-5xl mx-auto mb-4 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir / Salvar PDF
          </Button>
        </div>

        {/* Documento */}
        <div className="impressao-wrapper max-w-5xl mx-auto bg-white p-10 shadow-md print:shadow-none print:p-0" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
          {/* Cabeçalho */}
          <div className="border-b-2 pb-4 mb-6" style={{ borderColor: "#1a3d2b" }}>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1a3d2b" }}>
                  Fetély.
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  FETELY COMERCIO IMPORTACAO E EXPORTACAO LTDA
                </p>
                <p className="text-xs text-zinc-500">
                  CNPJ 63.591.078/0001-48
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-semibold" style={{ color: "#1a3d2b" }}>
                  Extrato de Fatura — Cartão de Crédito
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Documento gerado em {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>
          </div>

          {/* Identificação da fatura */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
            <div>
              <span className="text-zinc-500">Cartão:</span>{" "}
              <span className="font-medium">
                {fatura.conta_bancaria?.nome_exibicao || "—"}
                {fatura.conta_bancaria?.banco ? ` (${fatura.conta_bancaria.banco})` : ""}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Status:</span>{" "}
              <span className="font-medium uppercase">{fatura.status}</span>
            </div>
            <div>
              <span className="text-zinc-500">Data de vencimento:</span>{" "}
              <span className="font-medium">{formatDate(fatura.data_vencimento)}</span>
            </div>
            <div>
              <span className="text-zinc-500">Data de fechamento:</span>{" "}
              <span className="font-medium">{formatDate(fatura.data_fechamento)}</span>
            </div>
            <div>
              <span className="text-zinc-500">Período:</span>{" "}
              <span className="font-medium">
                {formatDate(fatura.periodo_inicio)} a {formatDate(fatura.periodo_fim)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Valor total:</span>{" "}
              <span className="font-bold text-base">{formatBRL(fatura.valor_total)}</span>
            </div>
          </div>

          {fatura.observacao && (
            <div className="mb-4 p-3 bg-zinc-50 border-l-2 text-xs italic" style={{ borderColor: "#1a3d2b" }}>
              <strong>Observação:</strong> {fatura.observacao}
            </div>
          )}

          {/* Tabela de lançamentos */}
          <h3 className="text-sm font-semibold uppercase tracking-wide mt-8 mb-3" style={{ color: "#1a3d2b" }}>
            Lançamentos ({lancamentos.length})
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2" style={{ borderColor: "#1a3d2b" }}>
                <th className="text-left py-2 px-1 font-semibold">Data</th>
                <th className="text-left py-2 px-1 font-semibold">Descrição</th>
                <th className="text-left py-2 px-1 font-semibold">Categoria</th>
                <th className="text-left py-2 px-1 font-semibold">Status</th>
                <th className="text-right py-2 px-1 font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l) => (
                <tr key={l.id} className="border-b border-zinc-200">
                  <td className="py-1.5 px-1 whitespace-nowrap">{formatDate(l.data_compra)}</td>
                  <td className="py-1.5 px-1">
                    {l.descricao}
                    {l.estabelecimento_local && (
                      <span className="text-zinc-400"> · {l.estabelecimento_local}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-1 text-zinc-600">{categoriaDoLancamento(l)}</td>
                  <td className="py-1.5 px-1 text-zinc-600">
                    {STATUS_LANC_LABEL[l.status] || l.status}
                  </td>
                  <td className={`py-1.5 px-1 text-right font-mono whitespace-nowrap ${l.valor < 0 ? "text-red-600" : ""}`}>
                    {formatBRL(l.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold" style={{ borderColor: "#1a3d2b" }}>
                <td colSpan={4} className="py-2 px-1 text-right">
                  Total efetivo (excl. ignorados):
                </td>
                <td className="py-2 px-1 text-right font-mono">{formatBRL(somaEfetiva)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Resumos */}
          <div className="grid grid-cols-2 gap-6 mt-8">
            {/* Totais por categoria */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#1a3d2b" }}>
                Totais por categoria
              </h3>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {totaisPorCategoria.map((t) => (
                    <tr key={t.categoria} className="border-b border-zinc-100">
                      <td className="py-1 px-1">{t.categoria}</td>
                      <td className="py-1 px-1 text-zinc-500 text-right">({t.qtd})</td>
                      <td className="py-1 px-1 text-right font-mono">{formatBRL(t.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totais por status */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#1a3d2b" }}>
                Totais por status
              </h3>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {Object.entries(totaisPorStatus).map(([status, info]) => (
                    <tr key={status} className="border-b border-zinc-100">
                      <td className="py-1 px-1">{STATUS_LANC_LABEL[status] || status}</td>
                      <td className="py-1 px-1 text-zinc-500 text-right">({info.qtd})</td>
                      <td className="py-1 px-1 text-right font-mono">{formatBRL(info.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-12 pt-4 border-t text-[10px] text-zinc-400 text-center">
            Documento de uso interno · Fetély #celebreoqueimporta · Gerado pelo SNCF (Sistema Fetely)
          </div>
        </div>
      </div>
    </>
  );
}
