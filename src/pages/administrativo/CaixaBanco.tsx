import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowDownLeft, ArrowUpRight, Building2, CheckCircle2, Loader2, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { parseOFX } from "@/lib/financeiro/ofx-parser";
import { parseCsvItau } from "@/lib/financeiro/csv-itau-parser";
import { parseCsvSafra } from "@/lib/financeiro/csv-safra-parser";
import { gerarHashMov } from "@/lib/financeiro/hash-mov";

// KPI CANDIDATO: Saldo por conta bancária (snapshot diário)
// KPI CANDIDATO: % de movimentações conciliadas no mês
// KPI CANDIDATO: Tempo médio para conciliação (dias)
// KPI CANDIDATO: Volume de movimentações por conta por mês
// KPI CANDIDATO: Divergência extrato vs lançamentos (valor absoluto)

type ContaBancaria = {
  id: string;
  banco: string;
  banco_codigo: string | null;
  agencia: string | null;
  numero_conta: string | null;
  tipo: string;
  nome_exibicao: string;
  saldo_atual: number | null;
  saldo_atualizado_em: string | null;
  ativo: boolean | null;
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
  saldo_pos_transacao: number | null;
  origem: string | null;
};

type Formato = "ofx" | "csv_itau" | "csv_safra";

export default function CaixaBanco() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [contaSelecionada, setContaSelecionada] = useState<string | "todas">("todas");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "credito" | "debito">("todos");
  const [filtroConciliado, setFiltroConciliado] = useState<"todos" | "sim" | "nao">("todos");

  // Importação
  const [showImport, setShowImport] = useState(false);
  const [impConta, setImpConta] = useState<string>("");
  const [impFormato, setImpFormato] = useState<Formato>("ofx");
  const [impArquivo, setImpArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);

  const { data: contas = [] } = useQuery({
    queryKey: ["contas-bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("ativo", true)
        .order("nome_exibicao");
      if (error) throw error;
      return (data || []) as ContaBancaria[];
    },
  });

  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ["movimentacoes-bancarias", contaSelecionada, filtroTipo, filtroConciliado],
    queryFn: async () => {
      let q = supabase
        .from("movimentacoes_bancarias")
        .select("*")
        .order("data_transacao", { ascending: false })
        .limit(500);
      if (contaSelecionada !== "todas") q = q.eq("conta_bancaria_id", contaSelecionada);
      if (filtroTipo !== "todos") q = q.eq("tipo", filtroTipo);
      if (filtroConciliado === "sim") q = q.eq("conciliado", true);
      if (filtroConciliado === "nao") q = q.eq("conciliado", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Movimentacao[];
    },
  });

  // KPIs
  const kpis = useMemo(() => {
    const saldoTotal = contas.reduce((s, c) => s + Number(c.saldo_atual || 0), 0);
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    let entradas = 0;
    let saidas = 0;
    let naoConciliadas = 0;
    for (const m of movimentacoes) {
      const d = new Date(m.data_transacao + "T00:00:00");
      if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        if (Number(m.valor) >= 0) entradas += Number(m.valor);
        else saidas += Math.abs(Number(m.valor));
      }
      if (!m.conciliado) naoConciliadas++;
    }
    return { saldoTotal, entradas, saidas, naoConciliadas };
  }, [contas, movimentacoes]);

  async function handleImportar() {
    if (!impArquivo || !impConta || !user) {
      toast.error("Preencha conta e selecione o arquivo");
      return;
    }
    setImportando(true);
    try {
      const text = await impArquivo.text();
      let parsed;
      if (impFormato === "ofx") parsed = parseOFX(text);
      else if (impFormato === "csv_itau") parsed = parseCsvItau(text);
      else parsed = parseCsvSafra(text);

      if (!parsed.movimentacoes.length) {
        toast.error("Nenhuma movimentação encontrada no arquivo");
        setImportando(false);
        return;
      }

      // Gerar hash único
      const movsComHash = await Promise.all(
        parsed.movimentacoes.map(async (mov) => ({
          ...mov,
          hash_unico: await gerarHashMov(impConta, mov.data_transacao || "", mov.valor, mov.descricao),
        }))
      );

      // Verificar duplicatas
      const hashes = movsComHash.map((m) => m.hash_unico);
      const { data: existentes } = await supabase
        .from("movimentacoes_bancarias")
        .select("hash_unico")
        .in("hash_unico", hashes);
      const setExist = new Set((existentes || []).map((e: { hash_unico: string | null }) => e.hash_unico));
      const novas = movsComHash.filter((m) => !setExist.has(m.hash_unico));
      const duplicadas = movsComHash.length - novas.length;

      // Registrar importação
      const datasOrdenadas = novas.map((m) => m.data_transacao).filter(Boolean).sort();
      const { data: importacao } = await supabase
        .from("importacoes_extrato")
        .insert({
          conta_bancaria_id: impConta,
          arquivo_nome: impArquivo.name,
          formato: impFormato,
          periodo_inicio: datasOrdenadas[0] || null,
          periodo_fim: datasOrdenadas[datasOrdenadas.length - 1] || null,
          registros_importados: novas.length,
          registros_duplicados: duplicadas,
          importado_por: user.id,
        })
        .select("id")
        .maybeSingle();

      // Inserir em lotes de 50
      if (novas.length > 0) {
        const inserts = novas
          .filter((m) => m.data_transacao)
          .map((m) => ({
            conta_bancaria_id: impConta,
            data_transacao: m.data_transacao!,
            descricao: m.descricao,
            valor: m.valor,
            tipo: m.tipo,
            id_transacao_banco: m.id_transacao_banco,
            hash_unico: m.hash_unico,
            saldo_pos_transacao: m.saldo_pos_transacao ?? null,
            origem: impFormato,
            importacao_id: importacao?.id || null,
          }));
        for (let i = 0; i < inserts.length; i += 50) {
          const lote = inserts.slice(i, i + 50);
          const { error } = await supabase.from("movimentacoes_bancarias").insert(lote);
          if (error) throw error;
        }

        // Atualizar saldo (última movimentação por data)
        const ordenadasPorData = [...novas].sort((a, b) =>
          (a.data_transacao || "").localeCompare(b.data_transacao || "")
        );
        const ultima = ordenadasPorData[ordenadasPorData.length - 1];
        const saldoFinal =
          ultima.saldo_pos_transacao ??
          (impFormato === "ofx" ? (parsed as ReturnType<typeof parseOFX>).saldo : null);
        if (saldoFinal != null) {
          await supabase
            .from("contas_bancarias")
            .update({
              saldo_atual: saldoFinal,
              saldo_atualizado_em: new Date().toISOString(),
            })
            .eq("id", impConta);
        }
      }

      toast.success(
        `${novas.length} movimentações importadas` +
          (duplicadas > 0 ? ` (${duplicadas} duplicadas ignoradas)` : "")
      );
      setShowImport(false);
      setImpArquivo(null);
      qc.invalidateQueries({ queryKey: ["movimentacoes-bancarias"] });
      qc.invalidateQueries({ queryKey: ["contas-bancarias"] });
    } catch (e) {
      toast.error("Erro ao importar: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caixa e Banco</h1>
          <p className="text-sm text-muted-foreground">
            Movimentações realizadas — extratos bancários e cartões.
          </p>
        </div>
        <Button onClick={() => setShowImport(true)} className="bg-admin hover:bg-admin/90 text-admin-foreground gap-2">
          <Upload className="h-4 w-4" />
          Importar extrato
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(kpis.saldoTotal)}</div>
            <p className="text-xs text-muted-foreground">{contas.length} conta{contas.length !== 1 ? "s" : ""} ativa{contas.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entradas do mês</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatBRL(kpis.entradas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saídas do mês</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatBRL(kpis.saidas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Não conciliadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.naoConciliadas}</div>
            <p className="text-xs text-muted-foreground">Aguardando conciliação</p>
          </CardContent>
        </Card>
      </div>

      {/* Seletor de conta */}
      <Tabs value={contaSelecionada} onValueChange={(v) => setContaSelecionada(v as string)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="todas" className="gap-2">
            <Building2 className="h-3.5 w-3.5" />
            Todas as contas
          </TabsTrigger>
          {contas.map((c) => (
            <TabsTrigger key={c.id} value={c.id} className="gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: c.cor || "hsl(var(--muted-foreground))" }}
              />
              <span>{c.nome_exibicao}</span>
              <span className="text-xs text-muted-foreground">{formatBRL(Number(c.saldo_atual || 0))}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="credito">Apenas créditos</SelectItem>
            <SelectItem value="debito">Apenas débitos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroConciliado} onValueChange={(v) => setFiltroConciliado(v as typeof filtroConciliado)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Conciliação: todos</SelectItem>
            <SelectItem value="sim">Conciliadas</SelectItem>
            <SelectItem value="nao">Não conciliadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right w-[140px]">Valor</TableHead>
                <TableHead className="text-right w-[140px]">Saldo</TableHead>
                <TableHead className="w-[120px]">Conciliado</TableHead>
                <TableHead className="w-[100px]">Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && movimentacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação. Clique em "Importar extrato" para começar.
                  </TableCell>
                </TableRow>
              )}
              {movimentacoes.map((m) => {
                const positivo = Number(m.valor) >= 0;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{formatDateBR(m.data_transacao)}</TableCell>
                    <TableCell className="text-sm">{m.descricao}</TableCell>
                    <TableCell className={`text-right font-medium ${positivo ? "text-success" : "text-destructive"}`}>
                      {positivo ? "+" : ""}{formatBRL(Number(m.valor))}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {m.saldo_pos_transacao != null ? formatBRL(Number(m.saldo_pos_transacao)) : "—"}
                    </TableCell>
                    <TableCell>
                      {m.conciliado ? (
                        <Badge variant="outline" className="border-success text-success text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">{m.origem || "manual"}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog importar */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar extrato</DialogTitle>
            <DialogDescription>
              Importe arquivos OFX (padrão bancário) ou CSV. Movimentações duplicadas são detectadas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Conta bancária</Label>
              <Select value={impConta} onValueChange={setImpConta}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_exibicao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={impFormato} onValueChange={(v) => setImpFormato(v as Formato)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ofx">OFX (Itaú / Safra / qualquer banco)</SelectItem>
                  <SelectItem value="csv_itau">CSV Itaú</SelectItem>
                  <SelectItem value="csv_safra">CSV Safra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arquivo</Label>
              <Input
                type="file"
                accept=".ofx,.csv,.txt"
                onChange={(e) => setImpArquivo(e.target.files?.[0] || null)}
              />
              {impArquivo && (
                <p className="text-xs text-muted-foreground mt-1">{impArquivo.name}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)} disabled={importando}>Cancelar</Button>
            <Button
              onClick={handleImportar}
              disabled={importando || !impArquivo || !impConta}
              className="bg-admin hover:bg-admin/90 text-admin-foreground gap-2"
            >
              {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
