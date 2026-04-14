import { useState, useMemo } from "react";
import { useAllCargos } from "@/hooks/useCargos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lock, Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const nivelLabels: Record<string, string> = {
  jr: "Júnior",
  pl: "Pleno",
  sr: "Sênior",
  coordenacao: "Coordenação",
  especialista: "Especialista",
  c_level: "C-Level",
};

const tipoLabels: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  ambos: "CLT + PJ",
};

function formatCurrency(val: number | null) {
  if (val == null) return "—";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

export default function Cargos() {
  const { data: cargos, isLoading } = useAllCargos();
  const [search, setSearch] = useState("");
  const [filtroDepartamento, setFiltroDepartamento] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const departamentos = useMemo(() => {
    if (!cargos) return [];
    const set = new Set(cargos.map((c) => c.departamento).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [cargos]);

  const filtered = useMemo(() => {
    if (!cargos) return [];
    return cargos.filter((c) => {
      if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false;
      if (filtroDepartamento !== "todos" && c.departamento !== filtroDepartamento) return false;
      if (filtroTipo !== "todos" && c.tipo_contrato !== filtroTipo) return false;
      return true;
    });
  }, [cargos, search, filtroDepartamento, filtroTipo]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cargos e Salários</h1>
          <p className="text-sm text-muted-foreground">Plano de Posições e Remuneração</p>
        </div>
        <Button disabled className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cargo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroDepartamento} onValueChange={setFiltroDepartamento}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {departamentos.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="clt">CLT</SelectItem>
            <SelectItem value="pj">PJ</SelectItem>
            <SelectItem value="ambos">Ambos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Faixa F1 (CLT)</TableHead>
              <TableHead className="text-right">Faixa F1 (PJ)</TableHead>
              <TableHead className="text-center">C-Level</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum cargo encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((cargo) => (
                <TableRow key={cargo.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {cargo.nome}
                      {cargo.protege_salario && (
                        <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0">
                          <Lock className="h-3 w-3" />
                          Protegido
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {nivelLabels[cargo.nivel] || cargo.nivel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {cargo.departamento || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {tipoLabels[cargo.tipo_contrato] || cargo.tipo_contrato}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {cargo.faixa_clt_f1_min != null
                      ? `${formatCurrency(cargo.faixa_clt_f1_min)} – ${formatCurrency(cargo.faixa_clt_f1_max)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {cargo.faixa_pj_f1_min != null
                      ? `${formatCurrency(cargo.faixa_pj_f1_min)} – ${formatCurrency(cargo.faixa_pj_f1_max)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {cargo.is_clevel ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">C-Level</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={cargo.ativo ? "default" : "secondary"} className="text-[10px]">
                      {cargo.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} cargo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
