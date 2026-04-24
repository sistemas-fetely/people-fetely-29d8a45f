import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function situacaoBadge(s?: string | null) {
  if (!s) return <Badge variant="outline">—</Badge>;
  const lower = s.toLowerCase();
  if (lower.includes("cancel")) return <Badge variant="destructive">{s}</Badge>;
  if (lower.includes("atendido") || lower.includes("conclu"))
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">{s}</Badge>;
  if (lower.includes("aberto") || lower.includes("andamento"))
    return <Badge className="bg-amber-500 hover:bg-amber-500">{s}</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

export default function PedidosVenda() {
  const [busca, setBusca] = useState("");

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos-venda"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_venda")
        .select("*")
        .order("data_pedido", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pedidos;
    return pedidos.filter((p: any) =>
      [p.numero, p.cliente_nome, p.canal, p.situacao]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [pedidos, busca]);

  // KPI CANDIDATO: Total de pedidos no período
  // KPI CANDIDATO: Ticket médio (valor_total / qtd pedidos)
  // KPI CANDIDATO: Concentração de clientes (top 5 = X% do total)
  // KPI CANDIDATO: Conversão por canal (b2b vs b2c vs marketplace)
  const totais = useMemo(() => {
    const valor = filtrados.reduce((s: number, p: any) => s + Number(p.valor_total || 0), 0);
    return {
      qtd: filtrados.length,
      valor,
      ticket: filtrados.length > 0 ? valor / filtrados.length : 0,
    };
  }, [filtrados]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-admin" />
          Pedidos de Venda
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pedidos sincronizados do Bling.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total de pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totais.qtd}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Valor total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtBRL(totais.valor)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ticket médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtBRL(totais.ticket)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
          <Input
            placeholder="Buscar por nº, cliente, canal, situação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-md mt-2"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-admin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Nenhum pedido encontrado. Sincronize o Bling em Importar Dados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.numero || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {p.data_pedido
                        ? format(new Date(p.data_pedido), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate">{p.cliente_nome || "—"}</TableCell>
                    <TableCell className="text-xs">{p.canal || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(p.valor_total)}</TableCell>
                    <TableCell>{situacaoBadge(p.situacao)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
