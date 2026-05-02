import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  History,
  Mail,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ContaPagarDetalheDrawer from "@/components/financeiro/ContaPagarDetalheDrawer";
import { UploadEmMassaDialog } from "@/components/financeiro/UploadEmMassaDialog";
import MarcarEnviadasDialog from "@/components/financeiro/MarcarEnviadasDialog";
import JSZip from "jszip";

type Estado = "cobrar" | "pronto" | "enviado";

type Conta = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status_conta: string;
  docs_status: "pendente" | "parcial" | "completo";
  nf_numero: string | null;
  cancelada_apos_envio?: boolean;
  dias?: number;
};

type GrupoFornecedor = {
  parceiro_id: string | null;
  parceiro_razao_social: string;
  qtd_contas: number;
  total_valor: number;
  mais_antigo_dias: number;
  qtd_canceladas_apos_envio: number;
  contas_json: Conta[];
};

type Remessa = {
  id: string;
  descricao: string;
  enviada_em: string;
  metodo: string;
  destinatarios: string[] | null;
  observacao: string | null;
  qtd_contas: number;
  qtd_documentos: number;
  periodo_inicio: string | null;
  periodo_fim: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pendente: "border-red-300 text-red-700 bg-red-50",
  parcial: "border-amber-400 text-amber-700 bg-amber-50",
  completo: "border-emerald-300 text-emerald-700 bg-emerald-50",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Sem doc",
  parcial: "Parcial",
  completo: "Completo",
};

export default function DocumentosPendentes() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Estado>("cobrar");
  const [periodoInicio, setPeriodoInicio] = useState<string>("");
  const [periodoFim, setPeriodoFim] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [contaIdDrawer, setContaIdDrawer] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [marcarOpen, setMarcarOpen] = useState(false);
  const [remessaParaDesfazer, setRemessaParaDesfazer] = useState<Remessa | null>(
    null,
  );

  const { data: grupos, isLoading } = useQuery({
    queryKey: ["docs-envio-agrupados", tab, periodoInicio, periodoFim],
    enabled: tab !== "enviado",
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "documentos_envio_agrupados",
        {
          p_estado: tab,
          p_periodo_inicio: periodoInicio || null,
          p_periodo_fim: periodoFim || null,
          p_busca: null,
        },
      );
      if (error) throw error;
      return (data || []) as GrupoFornecedor[];
    },
  });

  const { data: remessas, isLoading: loadingRemessas } = useQuery({
    queryKey: ["remessas-contador"],
    enabled: tab === "enviado",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("remessas_contador")
        .select("*")
        .order("enviada_em", { ascending: false });
      if (error) throw error;
      return (data || []) as Remessa[];
    },
  });

  const filtrados = useMemo(() => {
    if (!grupos) return [];
    if (!busca.trim()) return grupos;
    const t = busca.toLowerCase();
    return grupos.filter((g) =>
      g.parceiro_razao_social?.toLowerCase().includes(t),
    );
  }, [grupos, busca]);

  const remessasFiltradas = useMemo(() => {
    if (!remessas) return [];
    if (!busca.trim()) return remessas;
    const t = busca.toLowerCase();
    return remessas.filter((r) => r.descricao?.toLowerCase().includes(t));
  }, [remessas, busca]);

  const totals = useMemo(() => {
    const all = grupos || [];
    return {
      totalContas: all.reduce((s, g) => s + Number(g.qtd_contas || 0), 0),
      totalValor: all.reduce((s, g) => s + Number(g.total_valor || 0), 0),
      totalFornecedores: all.length,
      maisAntigo:
        all.length > 0
          ? Math.max(...all.map((g) => g.mais_antigo_dias || 0))
          : 0,
      totalCanceladas: all.reduce(
        (s, g) => s + Number(g.qtd_canceladas_apos_envio || 0),
        0,
      ),
    };
  }, [grupos]);

  const totalRemessas = remessas?.length || 0;
  const totalContasRemetidas = useMemo(
    () => (remessas || []).reduce((s, r) => s + (r.qtd_contas || 0), 0),
    [remessas],
  );

  // Seleção
  const todasContasPronto = useMemo(() => {
    if (tab !== "pronto") return [];
    return (filtrados || []).flatMap((g) => g.contas_json || []);
  }, [filtrados, tab]);

  const valorSelecionado = useMemo(() => {
    return todasContasPronto
      .filter((c) => selecionados.has(c.id))
      .reduce((s, c) => s + Number(c.valor || 0), 0);
  }, [todasContasPronto, selecionados]);

  function toggleConta(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFornecedor(grupo: GrupoFornecedor) {
    const ids = (grupo.contas_json || []).map((c) => c.id);
    const todasMarcadas = ids.every((id) => selecionados.has(id));
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (todasMarcadas) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function fornecedorEstado(grupo: GrupoFornecedor): "none" | "all" | "some" {
    const ids = (grupo.contas_json || []).map((c) => c.id);
    if (ids.length === 0) return "none";
    const sel = ids.filter((id) => selecionados.has(id)).length;
    if (sel === 0) return "none";
    if (sel === ids.length) return "all";
    return "some";
  }

  function toggleExpand(parceiroKey: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(parceiroKey)) next.delete(parceiroKey);
      else next.add(parceiroKey);
      return next;
    });
  }

  function expandirTodos() {
    setExpandidos(
      new Set(
        (filtrados || []).map(
          (g) => g.parceiro_id || g.parceiro_razao_social,
        ),
      ),
    );
  }

  function colapsarTodos() {
    setExpandidos(new Set());
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  // Exportar pacote: opera em cima da seleção
  async function handleExportarSelecao() {
    if (selecionados.size === 0) {
      toast.error("Selecione ao menos uma conta.");
      return;
    }
    setExportando(true);
    try {
      const ids = Array.from(selecionados);
      // Busca contas selecionadas
      const { data: contas, error: errC } = await supabase
        .from("contas_pagar")
        .select("id, descricao, valor, data_pagamento, parceiro_id")
        .in("id", ids);
      if (errC) throw errC;

      const parceiroIds = Array.from(
        new Set((contas || []).map((c) => c.parceiro_id).filter(Boolean) as string[]),
      );
      const parceiroMap = new Map<string, string>();
      if (parceiroIds.length > 0) {
        const { data: parceiros } = await supabase
          .from("parceiros_comerciais")
          .select("id, razao_social")
          .in("id", parceiroIds);
        (parceiros || []).forEach((p) => parceiroMap.set(p.id, p.razao_social || ""));
      }

      const { data: docs, error: errD } = await supabase
        .from("contas_pagar_documentos")
        .select("id, conta_id, tipo, nome_arquivo, storage_path")
        .in("conta_id", ids);
      if (errD) throw errD;

      if (!docs || docs.length === 0) {
        toast.error("Nenhum documento encontrado nas contas selecionadas.");
        return;
      }

      const contaMap = new Map<
        string,
        { fornecedor: string; descricao: string; valor: number; data_pagamento: string | null }
      >();
      (contas || []).forEach((c) => {
        contaMap.set(c.id, {
          fornecedor:
            (c.parceiro_id && parceiroMap.get(c.parceiro_id)) || "Sem-fornecedor",
          descricao: c.descricao,
          valor: Number(c.valor || 0),
          data_pagamento: c.data_pagamento,
        });
      });

      const zip = new JSZip();
      const csvLinhas = ["Fornecedor;Descrição;Valor;Data Pagamento;Tipo;Arquivo"];
      let baixados = 0;

      for (const d of docs) {
        const info = contaMap.get(d.conta_id);
        const { data: signed } = await supabase.storage
          .from("financeiro-docs")
          .createSignedUrl(d.storage_path, 60 * 30);
        if (!signed?.signedUrl) continue;
        try {
          const res = await fetch(signed.signedUrl);
          const blob = await res.blob();
          const pasta = (info?.fornecedor || "Sem-fornecedor").replace(
            /[\/\\:*?"<>|]/g,
            "_",
          );
          zip.file(`${pasta}/${d.nome_arquivo}`, blob);
          baixados++;
          csvLinhas.push(
            [
              info?.fornecedor || "",
              (info?.descricao || "").replace(/;/g, ","),
              info?.valor ?? "",
              info?.data_pagamento ?? "",
              d.tipo,
              d.nome_arquivo,
            ].join(";"),
          );
        } catch (e) {
          console.warn("Falha ao baixar", d.nome_arquivo, e);
        }
      }

      zip.file("_resumo.csv", csvLinhas.join("\n"));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documentos_selecao_${format(new Date(), "yyyyMMdd_HHmm")}.zip`;
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

  const desfazerMutation = useMutation({
    mutationFn: async (remessaId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("desfazer_remessa", {
        p_remessa_id: remessaId,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.erro || "Erro ao desfazer remessa");
      return data;
    },
    onSuccess: () => {
      toast.success("Remessa desfeita. Contas voltaram para 'Pronto pra enviar'.");
      qc.invalidateQueries({ queryKey: ["remessas-contador"] });
      qc.invalidateQueries({ queryKey: ["docs-envio-agrupados"] });
      setRemessaParaDesfazer(null);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  // KPIs por aba
  function renderKPIs() {
    if (tab === "enviado") {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Remessas</p>
                <History className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold mt-1">{totalRemessas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Contas remetidas</p>
                <Send className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold mt-1">{totalContasRemetidas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Última remessa</p>
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mt-1">
                {remessas?.[0]
                  ? formatDateBR(remessas[0].enviada_em.slice(0, 10))
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {tab === "cobrar" ? "Contas pendentes" : "Prontas pra enviar"}
              </p>
              {tab === "cobrar" ? (
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              )}
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
              <p className="text-xs text-muted-foreground">Valor</p>
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
    );
  }

  function renderListaAgrupada(comSelecao: boolean) {
    if (isLoading) {
      return (
        <>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </>
      );
    }
    if (!filtrados || filtrados.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <FileWarning className="h-12 w-12 mx-auto mb-3 text-emerald-600" />
            <p className="font-medium">
              {tab === "cobrar"
                ? "Tudo em ordem!"
                : "Nenhuma conta pronta pra enviar."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === "cobrar"
                ? "Nenhum documento pendente no período."
                : "Quando contas com docs forem pagas, aparecem aqui."}
            </p>
          </CardContent>
        </Card>
      );
    }

    return filtrados.map((grupo) => {
      const key = grupo.parceiro_id || grupo.parceiro_razao_social;
      const isOpen = expandidos.has(key);
      const estadoSel = comSelecao ? fornecedorEstado(grupo) : "none";

      return (
        <Card key={key}>
          <Collapsible open={isOpen} onOpenChange={() => toggleExpand(key)}>
            <div className="flex items-center gap-2 p-4 hover:bg-muted/30">
              {comSelecao && (
                <Checkbox
                  checked={
                    estadoSel === "all"
                      ? true
                      : estadoSel === "some"
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={() => toggleFornecedor(grupo)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <CollapsibleTrigger asChild>
                <div className="flex-1 cursor-pointer flex items-center gap-3 min-w-0">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {grupo.parceiro_razao_social}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{grupo.qtd_contas} conta(s)</span>
                      {grupo.mais_antigo_dias > 30 && (
                        <Badge
                          variant="outline"
                          className="text-[9px] border-orange-300 text-orange-700 bg-orange-50"
                        >
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          {grupo.mais_antigo_dias}d
                        </Badge>
                      )}
                      {grupo.qtd_canceladas_apos_envio > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[9px] border-amber-400 text-amber-700 bg-amber-50"
                        >
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          {grupo.qtd_canceladas_apos_envio} alterada(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-sm shrink-0">
                    {formatBRL(grupo.total_valor)}
                  </div>
                </div>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="border-t divide-y">
                {(grupo.contas_json || []).map((c) => {
                  const isSel = selecionados.has(c.id);
                  const bgPorStatus =
                    tab === "pronto"
                      ? c.status_conta === "paga"
                        ? ""
                        : c.status_conta === "aguardando_pagamento" ||
                            c.status_conta === "aprovado"
                          ? "bg-amber-50/40"
                          : ""
                      : "";
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "px-4 py-2 flex items-center gap-3 hover:bg-muted/30",
                        bgPorStatus,
                        isSel && "bg-emerald-50/50",
                      )}
                    >
                      {comSelecao && (
                        <Checkbox
                          checked={isSel}
                          onCheckedChange={() => toggleConta(c.id)}
                        />
                      )}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setContaIdDrawer(c.id)}
                      >
                        <div className="text-xs truncate" title={c.descricao}>
                          {c.descricao}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex gap-2 mt-0.5 flex-wrap">
                          <span>Venc: {formatDateBR(c.data_vencimento)}</span>
                          {c.data_pagamento && (
                            <span>Pago: {formatDateBR(c.data_pagamento)}</span>
                          )}
                          {c.nf_numero && <span>NF: {c.nf_numero}</span>}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${STATUS_STYLES[c.docs_status] || ""}`}
                      >
                        {STATUS_LABEL[c.docs_status] || c.docs_status}
                      </Badge>
                      <div className="font-mono text-xs shrink-0">
                        {formatBRL(c.valor)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      );
    });
  }

  function renderRemessas() {
    if (loadingRemessas) {
      return (
        <>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </>
      );
    }
    if (!remessasFiltradas || remessasFiltradas.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Nenhuma remessa registrada.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use a aba "Pronto pra enviar" pra criar a primeira remessa.
            </p>
          </CardContent>
        </Card>
      );
    }

    return remessasFiltradas.map((r) => {
      const isOpen = expandidos.has(r.id);
      return (
        <Card key={r.id}>
          <Collapsible open={isOpen} onOpenChange={() => toggleExpand(r.id)}>
            <CollapsibleTrigger asChild>
              <div className="p-4 cursor-pointer hover:bg-muted/30 flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {r.descricao}
                    <Badge variant="outline" className="text-[9px]">
                      {r.metodo === "manual_download"
                        ? "Manual"
                        : r.metodo === "sistema"
                          ? "Sistema"
                          : r.metodo}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                    <span>
                      <Calendar className="h-3 w-3 inline mr-0.5" />
                      {formatDateBR(r.enviada_em.slice(0, 10))}
                    </span>
                    <span>{r.qtd_contas} conta(s)</span>
                    <span>{r.qtd_documentos} doc(s)</span>
                    {r.destinatarios && r.destinatarios.length > 0 && (
                      <span className="truncate max-w-[300px]">
                        <Mail className="h-3 w-3 inline mr-0.5" />
                        {r.destinatarios.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                {r.metodo === "manual_download" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemessaParaDesfazer(r);
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Desfazer
                  </Button>
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <RemessaContas remessaId={r.id} onContaClick={setContaIdDrawer} />
            </CollapsibleContent>
          </Collapsible>
        </Card>
      );
    });
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
              Cobrar fornecedor, preparar remessa e enviar ao contador.
            </p>
          </div>
          <div className="flex gap-2">
            {tab !== "enviado" && (
              <Button
                variant="outline"
                onClick={() => setUploadOpen(true)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload em Massa
              </Button>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as Estado); limparSelecao(); }}>
          <TabsList>
            <TabsTrigger value="cobrar" className="gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              Cobrar fornecedor
            </TabsTrigger>
            <TabsTrigger value="pronto" className="gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pronto pra enviar
            </TabsTrigger>
            <TabsTrigger value="enviado" className="gap-2">
              <History className="h-3.5 w-3.5" />
              Enviado
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {renderKPIs()}

        <div className="flex flex-wrap gap-2 items-center">
          {tab !== "enviado" && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                className="h-8 text-xs w-36"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
          )}
          <Input
            placeholder={
              tab === "enviado" ? "Buscar remessa..." : "Buscar fornecedor..."
            }
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 text-xs flex-1 min-w-[200px] max-w-[300px]"
          />
          {tab !== "enviado" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={expandirTodos}
                className="h-8 text-xs"
              >
                Expandir todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={colapsarTodos}
                className="h-8 text-xs"
              >
                Colapsar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-2 pb-24">
        {tab === "cobrar" && renderListaAgrupada(false)}
        {tab === "pronto" && renderListaAgrupada(true)}
        {tab === "enviado" && renderRemessas()}
      </div>

      {/* BARRA FLUTUANTE — só na aba Pronto com seleção */}
      {tab === "pronto" && selecionados.size > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-30 border-t bg-background shadow-2xl px-6 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium">
              {selecionados.size} conta(s) selecionada(s)
            </p>
            <p className="text-xs text-muted-foreground">
              Total: {formatBRL(valorSelecionado)}
            </p>
          </div>
          <Button variant="outline" onClick={limparSelecao}>
            Limpar
          </Button>
          <Button
            variant="outline"
            onClick={handleExportarSelecao}
            disabled={exportando}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            {exportando ? "Exportando..." : "Exportar Pacote"}
          </Button>
          <Button
            onClick={() => setMarcarOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="h-4 w-4" />
            Marcar como enviadas
          </Button>
        </div>
      )}

      {/* DRAWER */}
      <ContaPagarDetalheDrawer
        contaId={contaIdDrawer}
        onClose={() => {
          setContaIdDrawer(null);
          qc.invalidateQueries({ queryKey: ["docs-envio-agrupados"] });
        }}
      />

      {/* UPLOAD EM MASSA */}
      <UploadEmMassaDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          qc.invalidateQueries({ queryKey: ["docs-envio-agrupados"] });
        }}
      />

      {/* MARCAR COMO ENVIADAS */}
      <MarcarEnviadasDialog
        open={marcarOpen}
        onClose={() => setMarcarOpen(false)}
        contasIds={Array.from(selecionados)}
        totalValor={valorSelecionado}
        onSuccess={() => {
          limparSelecao();
        }}
      />

      {/* CONFIRMAR DESFAZER REMESSA */}
      <AlertDialog
        open={!!remessaParaDesfazer}
        onOpenChange={(o) => !o && setRemessaParaDesfazer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer remessa?</AlertDialogTitle>
            <AlertDialogDescription>
              As {remessaParaDesfazer?.qtd_contas || 0} conta(s) desta remessa
              voltarão para a aba "Pronto pra enviar". O registro histórico será
              removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={desfazerMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (remessaParaDesfazer)
                  desfazerMutation.mutate(remessaParaDesfazer.id);
              }}
              disabled={desfazerMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {desfazerMutation.isPending ? "Desfazendo..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Subcomponente: lista de contas de uma remessa expandida
// ============================================================
function RemessaContas({
  remessaId,
  onContaClick,
}: {
  remessaId: string;
  onContaClick: (id: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["remessa-contas", remessaId],
    queryFn: async () => {
      const { data: itens, error: errI } = await supabase
        .from("remessas_contador_itens")
        .select("conta_id")
        .eq("remessa_id", remessaId);
      if (errI) throw errI;
      const ids = (itens || []).map((i: { conta_id: string }) => i.conta_id);
      if (ids.length === 0) return [];

      const { data: contas, error: errC } = await supabase
        .from("contas_pagar")
        .select("id, descricao, valor, data_vencimento, data_pagamento, status, parceiro_id")
        .in("id", ids);
      if (errC) throw errC;

      const parceiroIds = Array.from(
        new Set(
          (contas || []).map((c) => c.parceiro_id).filter(Boolean) as string[],
        ),
      );
      const parceiroMap = new Map<string, string>();
      if (parceiroIds.length > 0) {
        const { data: parceiros } = await supabase
          .from("parceiros_comerciais")
          .select("id, razao_social")
          .in("id", parceiroIds);
        (parceiros || []).forEach((p) =>
          parceiroMap.set(p.id, p.razao_social || ""),
        );
      }

      return (contas || []).map((c) => ({
        id: c.id,
        descricao: c.descricao,
        valor: Number(c.valor || 0),
        data_vencimento: c.data_vencimento,
        data_pagamento: c.data_pagamento,
        status_conta: c.status,
        parceiro_razao_social:
          (c.parceiro_id && parceiroMap.get(c.parceiro_id)) || "",
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground text-center">
        Nenhuma conta nesta remessa.
      </div>
    );
  }

  return (
    <div className="border-t divide-y">
      {data.map((c) => {
        const cancelada =
          c.status_conta === "cancelado" || c.status_conta === "cancelada";
        return (
          <div
            key={c.id}
            className={cn(
              "px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-muted/30",
              cancelada && "bg-amber-50/40",
            )}
            onClick={() => onContaClick(c.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate flex items-center gap-2">
                {c.descricao}
                {cancelada && (
                  <Badge
                    variant="outline"
                    className="text-[9px] border-amber-400 text-amber-700 bg-amber-50"
                  >
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                    Cancelada após envio
                  </Badge>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground flex gap-2 mt-0.5">
                <span>{c.parceiro_razao_social || "Sem fornecedor"}</span>
                <span>Venc: {formatDateBR(c.data_vencimento)}</span>
                {c.data_pagamento && (
                  <span>Pago: {formatDateBR(c.data_pagamento)}</span>
                )}
              </div>
            </div>
            <div className="font-mono text-xs shrink-0">{formatBRL(c.valor)}</div>
          </div>
        );
      })}
    </div>
  );
}
