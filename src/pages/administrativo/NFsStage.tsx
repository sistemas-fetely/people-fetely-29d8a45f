import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Layers,
  Search,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import {
  enviarStageParaContasPagar,
  descartarStage,
} from "@/lib/financeiro/stage-handler";
import { useCategoriasPlano } from "@/hooks/useCategoriasPlano";

type NFStage = {
  id: string;
  fonte: string;
  arquivo_nome: string | null;
  arquivo_storage_path: string | null;
  fornecedor_cnpj: string | null;
  fornecedor_razao_social: string | null;
  fornecedor_cliente: string | null;
  parceiro_id: string | null;
  nf_numero: string | null;
  nf_data_emissao: string | null;
  valor: number;
  descricao: string | null;
  categoria_id: string | null;
  data_vencimento: string | null;
  status: string;
  conta_pagar_existente_id: string | null;
  match_score: number | null;
  importacao_lote_id: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  classificada: "Pronta",
  importada: "Importada",
  descartada: "Descartada",
  duplicata: "Duplicata",
};

const STATUS_STYLES: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  classificada: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  importada: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  descartada: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  duplicata: "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

export default function NFsStage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ativos");
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [paraDescartar, setParaDescartar] = useState<NFStage[]>([]);
  const [salvandoCategoria, setSalvandoCategoria] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  const { data: categorias = [] } = useCategoriasPlano();

  const { data: nfs, isLoading } = useQuery({
    queryKey: ["nfs-stage"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("nfs_stage")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as NFStage[];
    },
  });

  // Filtros
  const filtered = useMemo(() => {
    let list = nfs || [];
    if (statusFilter !== "todos") {
      if (statusFilter === "ativos") {
        list = list.filter(
          (n) => n.status === "pendente" || n.status === "classificada",
        );
      } else {
        list = list.filter((n) => n.status === statusFilter);
      }
    }
    if (busca.trim()) {
      const t = busca.toLowerCase();
      list = list.filter(
        (n) =>
          n.fornecedor_razao_social?.toLowerCase().includes(t) ||
          n.fornecedor_cliente?.toLowerCase().includes(t) ||
          n.fornecedor_cnpj?.includes(t) ||
          n.nf_numero?.toLowerCase().includes(t),
      );
    }
    return list;
  }, [nfs, statusFilter, busca]);

  // KPIs
  const totals = useMemo(() => {
    const all = nfs || [];
    return {
      pendentes: all.filter((n) => n.status === "pendente").length,
      prontas: all.filter((n) => n.status === "classificada").length,
      importadas: all.filter((n) => n.status === "importada").length,
      descartadas: all.filter((n) => n.status === "descartada").length,
    };
  }, [nfs]);

  function toggleSel(id: string) {
    const next = new Set(selecionadas);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelecionadas(next);
  }

  function toggleTodas() {
    const ativasIds = filtered
      .filter((n) => n.status === "pendente" || n.status === "classificada")
      .map((n) => n.id);
    const todasSel = ativasIds.every((id) => selecionadas.has(id));
    if (todasSel) {
      setSelecionadas(new Set());
    } else {
      setSelecionadas(new Set(ativasIds));
    }
  }

  async function alterarCategoria(id: string, categoriaId: string) {
    setSalvandoCategoria((prev) => new Set(prev).add(id));
    try {
      const novoStatus = categoriaId ? "classificada" : "pendente";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("nfs_stage")
        .update({
          categoria_id: categoriaId || null,
          status: novoStatus,
        })
        .eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["nfs-stage"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setSalvandoCategoria((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleEnviarSelecionadas() {
    const ids = Array.from(selecionadas);
    const semCategoria = filtered.filter(
      (n) => selecionadas.has(n.id) && !n.categoria_id,
    );

    if (semCategoria.length > 0) {
      const ok = confirm(
        `${semCategoria.length} NFs estão sem categoria. Enviar mesmo assim? Elas vão pra Contas a Pagar como "Sem categoria" e podem ser classificadas depois.`,
      );
      if (!ok) return;
    }

    setEnviando(true);
    try {
      const result = await enviarStageParaContasPagar(ids);
      if (result.sucesso > 0) {
        toast.success(
          `${result.sucesso} NF${result.sucesso === 1 ? "" : "s"} enviada${result.sucesso === 1 ? "" : "s"} para Contas a Pagar`,
        );
      }
      if (result.erros.length > 0) {
        toast.error(`${result.erros.length} erro(s): ${result.erros[0]}`);
      }
      setSelecionadas(new Set());
      qc.invalidateQueries({ queryKey: ["nfs-stage"] });
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setEnviando(false);
    }
  }

  async function handleDescartarConfirmado() {
    const ids = paraDescartar.map((n) => n.id);
    try {
      const count = await descartarStage(ids);
      toast.success(`${count} NF${count === 1 ? "" : "s"} descartada${count === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["nfs-stage"] });
      setParaDescartar([]);
      setSelecionadas(new Set());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    }
  }

  async function visualizarPDF(nf: NFStage) {
    if (!nf.arquivo_storage_path) {
      toast.error("Sem arquivo anexado");
      return;
    }
    const { data } = await supabase.storage
      .from("nfs-stage")
      .createSignedUrl(nf.arquivo_storage_path, 60 * 5);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Falha ao gerar link do arquivo");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Layers className="h-6 w-6 text-admin" />
          NFs em Stage
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Área de revisão antes de enviar pra Contas a Pagar. NFs ficam aqui até você classificar e mandar.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-amber-700" /> Pendentes
            </p>
            <p className="text-2xl font-bold text-amber-700">{totals.pendentes}</p>
            <p className="text-[10px] text-muted-foreground">Sem categoria definida</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-700" /> Prontas
            </p>
            <p className="text-2xl font-bold text-emerald-700">{totals.prontas}</p>
            <p className="text-[10px] text-muted-foreground">Pode enviar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Send className="h-3 w-3 text-blue-700" /> Importadas
            </p>
            <p className="text-2xl font-bold text-blue-700">{totals.importadas}</p>
            <p className="text-[10px] text-muted-foreground">Já em Contas a Pagar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Trash2 className="h-3 w-3 text-gray-500" /> Descartadas
            </p>
            <p className="text-2xl font-bold text-gray-500">{totals.descartadas}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + Ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar fornecedor, CNPJ ou NF..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativas (pend. + prontas)</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="classificada">Prontas</SelectItem>
                <SelectItem value="importada">Importadas</SelectItem>
                <SelectItem value="descartada">Descartadas</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            {selecionadas.size > 0 && (
              <>
                <Button
                  onClick={handleEnviarSelecionadas}
                  disabled={enviando}
                  className="ml-auto gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  <Send className="h-4 w-4" />
                  Enviar {selecionadas.size} pra Contas a Pagar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const lista = filtered.filter((n) => selecionadas.has(n.id));
                    setParaDescartar(lista);
                  }}
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
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
              <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              {nfs?.length === 0
                ? "Nenhuma NF no stage ainda. Importe arquivos em 'Importar Dados'."
                : "Nenhuma NF encontrada com esses filtros."}
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          filtered
                            .filter((n) => n.status === "pendente" || n.status === "classificada")
                            .length > 0 &&
                          filtered
                            .filter((n) => n.status === "pendente" || n.status === "classificada")
                            .every((n) => selecionadas.has(n.id))
                        }
                        onCheckedChange={toggleTodas}
                      />
                    </TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((nf) => {
                    const isSel = selecionadas.has(nf.id);
                    const podeSel =
                      nf.status === "pendente" || nf.status === "classificada";
                    const salvando = salvandoCategoria.has(nf.id);
                    return (
                      <TableRow key={nf.id} className={isSel ? "bg-muted/40" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={isSel}
                            disabled={!podeSel}
                            onCheckedChange={() => toggleSel(nf.id)}
                          />
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <div className="text-sm truncate" title={nf.fornecedor_razao_social || ""}>
                            {nf.fornecedor_razao_social || nf.fornecedor_cliente || "—"}
                          </div>
                          {nf.fornecedor_cnpj && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {nf.fornecedor_cnpj}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{nf.nf_numero || "—"}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDateBR(nf.nf_data_emissao)}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatBRL(nf.valor)}
                        </TableCell>
                        <TableCell>
                          {podeSel ? (
                            <Select
                              value={nf.categoria_id || ""}
                              onValueChange={(v) => alterarCategoria(nf.id, v)}
                              disabled={salvando}
                            >
                              <SelectTrigger className="h-8 text-xs w-[200px]">
                                <SelectValue placeholder="Definir categoria..." />
                              </SelectTrigger>
                              <SelectContent>
                                {categorias.map((c: { id: string; codigo: string; nome: string }) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">
                                    {c.codigo} {c.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_STYLES[nf.status]}>
                            {STATUS_LABELS[nf.status] || nf.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {nf.arquivo_storage_path && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => visualizarPDF(nf)}
                                title="Ver arquivo"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog descartar */}
      <AlertDialog
        open={paraDescartar.length > 0}
        onOpenChange={(v) => !v && setParaDescartar([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar NFs do stage?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a descartar {paraDescartar.length} NF{paraDescartar.length === 1 ? "" : "s"}.
              Os arquivos PDF/XML serão apagados do storage.
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDescartarConfirmado();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
