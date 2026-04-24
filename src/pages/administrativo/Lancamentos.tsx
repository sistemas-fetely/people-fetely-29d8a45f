import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, Search } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";

type Lancamento = {
  id: string;
  conta_id: string | null;
  descricao: string;
  valor: number;
  tipo_lancamento: string;
  data_competencia: string | null;
  data_pagamento: string | null;
  centro_custo: string | null;
  canal: string | null;
  fornecedor: string | null;
  plano_contas?: { nome: string } | null;
};

const PAGE_SIZE = 30;

export default function Lancamentos() {
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [centroCustoFilter, setCentroCustoFilter] = useState("");
  const [canalFilter, setCanalFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["lancamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("*, plano_contas:conta_id(nome)")
        .order("data_competencia", { ascending: false });
      if (error) throw error;
      return data as unknown as Lancamento[];
    },
  });

  const filtered = useMemo(() => {
    let list = data || [];
    if (tipoFilter !== "todos") list = list.filter((l) => l.tipo_lancamento === tipoFilter);
    if (busca.trim()) {
      const t = busca.toLowerCase();
      list = list.filter(
        (l) =>
          l.descricao?.toLowerCase().includes(t) ||
          l.fornecedor?.toLowerCase().includes(t)
      );
    }
    if (dataDe) list = list.filter((l) => (l.data_competencia || "") >= dataDe);
    if (dataAte) list = list.filter((l) => (l.data_competencia || "") <= dataAte);
    if (centroCustoFilter.trim()) {
      const t = centroCustoFilter.toLowerCase();
      list = list.filter((l) => (l.centro_custo || "").toLowerCase().includes(t));
    }
    if (canalFilter.trim()) {
      const t = canalFilter.toLowerCase();
      list = list.filter((l) => (l.canal || "").toLowerCase().includes(t));
    }
    return list;
  }, [data, tipoFilter, busca, dataDe, dataAte, centroCustoFilter, canalFilter]);

  const totals = useMemo(() => {
    const cred = filtered
      .filter((l) => l.tipo_lancamento === "credito")
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const deb = filtered
      .filter((l) => l.tipo_lancamento === "debito")
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    return { cred, deb, saldo: cred - deb };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-6 w-6 text-admin" />
          Lançamentos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tabela de todos os lançamentos contábeis importados do Bling.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar descrição ou fornecedor..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Input type="date" value={dataDe} onChange={(e) => { setDataDe(e.target.value); setPage(1); }} />
            <Input type="date" value={dataAte} onChange={(e) => { setDataAte(e.target.value); setPage(1); }} />
            <Input
              placeholder="Centro de custo"
              value={centroCustoFilter}
              onChange={(e) => { setCentroCustoFilter(e.target.value); setPage(1); }}
            />
            <Input
              placeholder="Canal"
              value={canalFilter}
              onChange={(e) => { setCanalFilter(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex gap-1 mt-3">
            {(["todos", "credito", "debito"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tipoFilter === t ? "default" : "outline"}
                onClick={() => { setTipoFilter(t); setPage(1); }}
                className="capitalize"
              >
                {t === "todos" ? "Todos" : t === "credito" ? "Créditos" : "Débitos"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (data || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-admin-muted">
                <Receipt className="h-8 w-8 text-admin" />
              </div>
              <p className="text-lg font-semibold">Nenhum lançamento ainda</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Lançamentos são gerados automaticamente quando contas são pagas no Bling.
              </p>
            </div>
          ) : pageData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado para os filtros aplicados.
            </div>
          ) : (
            <>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Centro custo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap">{formatDateBR(l.data_competencia)}</TableCell>
                        <TableCell className="max-w-xs truncate" title={l.descricao}>{l.descricao}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {l.plano_contas?.nome || "—"}
                        </TableCell>
                        <TableCell>{l.centro_custo || "—"}</TableCell>
                        <TableCell
                          className={`text-right font-mono whitespace-nowrap ${
                            l.tipo_lancamento === "credito" ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {formatBRL(l.valor)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              l.tipo_lancamento === "credito"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-red-100 text-red-800 hover:bg-red-100"
                            }
                          >
                            {l.tipo_lancamento === "credito" ? "Crédito" : "Débito"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">Total créditos</div>
                  <div className="text-lg font-bold text-green-700">{formatBRL(totals.cred)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total débitos</div>
                  <div className="text-lg font-bold text-red-700">{formatBRL(totals.deb)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Saldo</div>
                  <div className={`text-lg font-bold ${totals.saldo >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatBRL(totals.saldo)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {filtered.length} registro{filtered.length === 1 ? "" : "s"} • Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
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
    </div>
  );
}
