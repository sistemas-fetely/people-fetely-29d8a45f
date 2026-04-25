import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, Building2, CheckCircle2, Upload, Wallet, X } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { useFiltrosPersistentes } from "@/hooks/useFiltrosPersistentes";
import { FilterSelectTrigger } from "@/components/ui/filter-select-trigger";
import { ImportarExtratoDialog } from "@/components/financeiro/ImportarExtratoDialog";

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

export default function CaixaBanco() {
  const [contaSelecionada, setContaSelecionada] = useFiltrosPersistentes<string>(
    "caixabanco_conta", "todas"
  );
  const [filtroTipo, setFiltroTipo] = useFiltrosPersistentes<"todos" | "credito" | "debito">(
    "caixabanco_tipo", "todos"
  );
  const [filtroConciliado, setFiltroConciliado] = useFiltrosPersistentes<"todos" | "sim" | "nao">(
    "caixabanco_conciliado", "todos"
  );

  const [showImport, setShowImport] = useState(false);

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
          <FilterSelectTrigger active={filtroTipo !== "todos"} className="w-[160px]">
            <SelectValue />
          </FilterSelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="credito">Apenas créditos</SelectItem>
            <SelectItem value="debito">Apenas débitos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroConciliado} onValueChange={(v) => setFiltroConciliado(v as typeof filtroConciliado)}>
          <FilterSelectTrigger active={filtroConciliado !== "todos"} className="w-[200px]">
            <SelectValue />
          </FilterSelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Conciliação: todos</SelectItem>
            <SelectItem value="sim">Conciliadas</SelectItem>
            <SelectItem value="nao">Não conciliadas</SelectItem>
          </SelectContent>
        </Select>
        {(filtroTipo !== "todos" || filtroConciliado !== "todos") && (
          <Button
            variant="ghost"
            size="sm"
            className="text-admin hover:text-admin/80 gap-1 text-xs h-7"
            onClick={() => {
              setFiltroTipo("todos");
              setFiltroConciliado("todos");
            }}
          >
            <X className="h-3 w-3" /> Limpar filtros
          </Button>
        )}
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

      <ImportarExtratoDialog
        open={showImport}
        onOpenChange={setShowImport}
        contaPreSelecionada={contaSelecionada !== "todas" ? contaSelecionada : undefined}
      />
    </div>
  );
}
