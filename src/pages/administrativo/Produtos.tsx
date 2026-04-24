import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Loader2 } from "lucide-react";

const fmtBRL = (v?: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Produtos() {
  const [busca, setBusca] = useState("");

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("nome", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter((p: any) =>
      [p.codigo, p.nome, p.linha, p.gtin].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [produtos, busca]);

  // KPI CANDIDATO: Total de SKUs ativos
  // KPI CANDIDATO: Margem média (preço_venda - preço_custo) / preço_venda
  // KPI CANDIDATO: Produtos com estoque abaixo do mínimo
  // KPI CANDIDATO: Top produtos por valor de estoque

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6 text-admin" />
          Produtos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Catálogo sincronizado do Bling.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo</CardTitle>
          <Input
            placeholder="Buscar por código, nome, linha ou GTIN..."
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
              Nenhum produto encontrado. Sincronize o Bling em Importar Dados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Linha</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead>Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.imagem_url ? (
                        <img
                          src={p.imagem_url}
                          alt={p.nome}
                          className="h-8 w-8 rounded object-cover border"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.codigo || "—"}</TableCell>
                    <TableCell className="max-w-[320px] truncate">{p.nome}</TableCell>
                    <TableCell className="text-xs">{p.linha || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(p.preco_venda)}</TableCell>
                    <TableCell className="text-right text-xs">{p.estoque_atual ?? 0}</TableCell>
                    <TableCell>
                      {p.ativo ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </TableCell>
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
