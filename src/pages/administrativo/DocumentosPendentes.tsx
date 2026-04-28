import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileWarning,
  ChevronDown,
  ChevronRight,
  Upload,
  Package,
  AlertCircle,
  Clock,
  TrendingDown,
  Users,
  Calendar,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { toast } from "sonner";
import ContaPagarDetalheDrawer from "@/components/financeiro/ContaPagarDetalheDrawer";
import { UploadEmMassaDialog } from "@/components/financeiro/UploadEmMassaDialog";
import JSZip from "jszip";

type Conta = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status_conta: string;
  docs_status: "pendente" | "parcial";
  nf_numero: string | null;
  dias: number;
};

type GrupoFornecedor = {
  parceiro_id: string | null;
  parceiro_razao_social: string;
  total_contas: number;
  total_valor: number;
  contas_pendente: number;
  contas_parcial: number;
  mais_antigo_dias: number;
  contas_json: Conta[];
};

const STATUS_STYLES: Record<string, string> = {
  pendente: "border-red-300 text-red-700 bg-red-50",
  parcial: "border-amber-400 text-amber-700 bg-amber-50",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Sem doc",
  parcial: "Parcial",
};

export default function DocumentosPendentes() {
  const qc = useQueryClient();
  const [periodoInicio, setPeriodoInicio] = useState<string>("");
  const [periodoFim, setPeriodoFim] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [contaIdDrawer, setContaIdDrawer] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const { data: grupos, isLoading } = useQuery({
    queryKey: ["docs-pendentes", periodoInicio, periodoFim, filtroStatus],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "documentos_pendentes_agrupados",
        {
          p_periodo_inicio: periodoInicio || null,
          p_periodo_fim: periodoFim || null,
          p_status: filtroStatus === "todos" ? null : filtroStatus,
        },
      );
      if (error) throw error;
      return (data || []) as GrupoFornecedor[];
    },
  });

  const filtrados = useMemo(() => {
    if (!busca.trim()) return grupos || [];
    const t = busca.toLowerCase();
    return (grupos || []).filter((g) =>
      g.parceiro_razao_social?.toLowerCase().includes(t),
    );
  }, [grupos, busca]);

  const totals = useMemo(() => {
    const all = grupos || [];
    return {
      totalContas: all.reduce((s, g) => s + g.total_contas, 0),
      totalValor: all.reduce((s, g) => s + Number(g.total_valor || 0), 0),
      totalFornecedores: all.length,
      maisAntigo: all.length > 0 ? Math.max(...all.map((g) => g.mais_antigo_dias || 0)) : 0,
    };
  }, [grupos]);

  function toggleExpand(parceiroKey: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(parceiroKey)) next.delete(parceiroKey);
      else next.add(parceiroKey);
      return next;
    });
  }

  function expandirTodos() {
    if (!filtrados) return;
    setExpandidos(new Set(filtrados.map((g) => g.parceiro_id || g.parceiro_razao_social)));
  }

  function colapsarTodos() {
    setExpandidos(new Set());
  }

  async function handleExportarPacote() {
    if (!periodoInicio || !periodoFim) {
      toast.error("Defina período de pagamento (data inicial e final) antes de exportar.");
      return;
    }
    setExportando(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "exportar_pacote_documentos",
        {
          p_periodo_inicio: periodoInicio,
          p_periodo_fim: periodoFim,
        },
      );
      if (error) throw error;
      const docs = (data || []) as Array<{
        conta_id: string;
        parceiro_razao_social: string;
        conta_descricao: string;
        conta_valor: number;
        conta_data_pagamento: string;
        doc_id: string;
        doc_tipo: string;
        doc_nome_arquivo: string;
        doc_storage_path: string;
      }>;

      if (docs.length === 0) {
        toast.error("Nenhum documento encontrado no período.");
        return;
      }

      const zip = new JSZip();
      const csvLinhas = ["Fornecedor;Descrição;Valor;Data Pagamento;Tipo;Arquivo"];

      // Gera signed URLs e baixa
      let baixados = 0;
      for (const d of docs) {
        const { data: signed } = await supabase.storage
          .from("financeiro-docs")
          .createSignedUrl(d.doc_storage_path, 60 * 30);
        if (!signed?.signedUrl) continue;

        try {
          const res = await fetch(signed.signedUrl);
          const blob = await res.blob();
          const pasta = (d.parceiro_razao_social || "Sem-fornecedor").replace(/[\/\\:*?"<>|]/g, "_");
          zip.file(`${pasta}/${d.doc_nome_arquivo}`, blob);
          baixados++;
          csvLinhas.push(
            [
              d.parceiro_razao_social,
              d.conta_descricao?.replace(/;/g, ","),
              d.conta_valor,
              d.conta_data_pagamento,
              d.doc_tipo,
              d.doc_nome_arquivo,
            ].join(";"),
          );
        } catch (e) {
          console.warn("Falha ao baixar", d.doc_nome_arquivo, e);
        }
      }

      // Adiciona CSV resumo
      zip.file("_resumo.csv", csvLinhas.join("\n"));

      // Gera ZIP e dispara download
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documentos_${periodoInicio}_${periodoFim}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Pacote exportado: ${baixados} documento(s) em ZIP.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro ao exportar: " + msg);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* HEADER */}
      <div className="px-6 pt-6 pb-3 border-b bg-background/95 backdrop-blur sticky top-0 z-20 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileWarning className="h-6 w-6 text-admin" />
              Documentos Pendentes
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Visão consolidada por fornecedor — para cobrar e enviar ao contador.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload em Massa
            </Button>
            <Button
              onClick={handleExportarPacote}
              disabled={exportando}
              className="gap-2 bg-admin hover:bg-admin-accent text-admin-foreground"
            >
              <Package className="h-4 w-4" />
              {exportando ? "Exportando..." : "Exportar Pacote"}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Contas pendentes</p>
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              </div>
              <p className="text-2xl font-bold mt-1">{totals.totalContas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Fornecedores</p>
                <Users className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold mt-1">{totals.totalFornecedores}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Valor pendente</p>
                <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <p className="text-lg font-bold mt-1">{formatBRL(totals.totalValor)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Mais antigo</p>
                <Clock className="h-3.5 w-3.5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold mt-1">
                {totals.maisAntigo}
                <span className="text-xs text-muted-foreground ml-1">dias</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="h-8 text-xs w-36"
              placeholder="De"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="h-8 text-xs w-36"
              placeholder="Até"
            />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos pendentes</SelectItem>
              <SelectItem value="pendente">Sem doc</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Buscar fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 text-xs flex-1 min-w-[200px] max-w-[300px]"
          />
          <Button variant="ghost" size="sm" onClick={expandirTodos} className="h-8 text-xs">
            Expandir todos
          </Button>
          <Button variant="ghost" size="sm" onClick={colapsarTodos} className="h-8 text-xs">
            Colapsar
          </Button>
        </div>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : filtrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileWarning className="h-12 w-12 mx-auto mb-3 text-emerald-600" />
              <p className="font-medium">Tudo em ordem!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Nenhum documento pendente no período selecionado.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtrados.map((grupo) => {
            const key = grupo.parceiro_id || grupo.parceiro_razao_social;
            const isOpen = expandidos.has(key);
            return (
              <Card key={key}>
                <Collapsible open={isOpen} onOpenChange={() => toggleExpand(key)}>
                  <CollapsibleTrigger asChild>
                    <div className="p-4 cursor-pointer hover:bg-muted/30 flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{grupo.parceiro_razao_social}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{grupo.total_contas} conta(s)</span>
                          {grupo.contas_pendente > 0 && (
                            <Badge variant="outline" className={`text-[9px] ${STATUS_STYLES.pendente}`}>
                              {grupo.contas_pendente} sem doc
                            </Badge>
                          )}
                          {grupo.contas_parcial > 0 && (
                            <Badge variant="outline" className={`text-[9px] ${STATUS_STYLES.parcial}`}>
                              {grupo.contas_parcial} parcial
                            </Badge>
                          )}
                          {grupo.mais_antigo_dias > 30 && (
                            <Badge variant="outline" className="text-[9px] border-orange-300 text-orange-700 bg-orange-50">
                              <Clock className="h-2.5 w-2.5 mr-0.5" />
                              {grupo.mais_antigo_dias}d
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="font-mono text-sm shrink-0">{formatBRL(grupo.total_valor)}</div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t divide-y">
                      {grupo.contas_json.map((c) => (
                        <div
                          key={c.id}
                          className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-muted/30"
                          onClick={() => setContaIdDrawer(c.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs truncate" title={c.descricao}>
                              {c.descricao}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex gap-2 mt-0.5">
                              <span>Venc: {formatDateBR(c.data_vencimento)}</span>
                              {c.data_pagamento && <span>Pago: {formatDateBR(c.data_pagamento)}</span>}
                              {c.nf_numero && <span>NF: {c.nf_numero}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[9px] ${STATUS_STYLES[c.docs_status] || ""}`}>
                            {STATUS_LABEL[c.docs_status] || c.docs_status}
                          </Badge>
                          <div className="font-mono text-xs shrink-0">{formatBRL(c.valor)}</div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        )}
      </div>

      {/* DRAWER */}
      <ContaPagarDetalheDrawer
        contaId={contaIdDrawer}
        onClose={() => {
          setContaIdDrawer(null);
          qc.invalidateQueries({ queryKey: ["docs-pendentes"] });
        }}
      />

      {/* UPLOAD EM MASSA */}
      <UploadEmMassaDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          qc.invalidateQueries({ queryKey: ["docs-pendentes"] });
        }}
      />
    </div>
  );
}
