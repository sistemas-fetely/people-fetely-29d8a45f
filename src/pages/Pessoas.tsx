import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, MoreHorizontal, Eye, Edit,
  UserCheck, Briefcase, Building2, Plus, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

interface PessoaUnificada {
  id: string;
  nome: string;
  tipo: "CLT" | "PJ";
  cargo_servico: string;
  departamento: string;
  status: string;
  data_inicio: string;
  valor: number | null;
}

const statusMap: Record<string, string> = {
  ativo: "Ativo",
  ferias: "Férias",
  afastado: "Afastado",
  experiencia: "Experiência",
  desligado: "Desligado",
  rascunho: "Rascunho",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  renovado: "Renovado",
};

const statusStyles: Record<string, string> = {
  ativo: "bg-success/10 text-success border-0",
  ferias: "bg-info/10 text-info border-0",
  afastado: "bg-warning/10 text-warning border-0",
  experiencia: "bg-primary/10 text-primary border-0",
  desligado: "bg-destructive/10 text-destructive border-0",
  rascunho: "bg-muted text-muted-foreground border-0",
  suspenso: "bg-warning/10 text-warning border-0",
  encerrado: "bg-destructive/10 text-destructive border-0",
  renovado: "bg-info/10 text-info border-0",
};

export default function Pessoas() {
  const navigate = useNavigate();
  const [pessoas, setPessoas] = useState<PessoaUnificada[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  useEffect(() => {
    async function fetch() {
      const [{ data: clts }, { data: pjs }] = await Promise.all([
        supabase.from("colaboradores_clt").select("id, nome_completo, cargo, departamento, status, data_admissao, salario_base").order("nome_completo"),
        supabase.from("contratos_pj").select("id, razao_social, nome_fantasia, tipo_servico, departamento, status, data_inicio, valor_mensal").order("razao_social"),
      ]);

      const unified: PessoaUnificada[] = [
        ...(clts || []).map((c) => ({
          id: c.id,
          nome: c.nome_completo,
          tipo: "CLT" as const,
          cargo_servico: c.cargo,
          departamento: c.departamento,
          status: c.status,
          data_inicio: c.data_admissao,
          valor: c.salario_base,
        })),
        ...(pjs || []).map((p) => ({
          id: p.id,
          nome: p.nome_fantasia || p.razao_social,
          tipo: "PJ" as const,
          cargo_servico: p.tipo_servico,
          departamento: p.departamento,
          status: p.status,
          data_inicio: p.data_inicio,
          valor: p.valor_mensal,
        })),
      ].sort((a, b) => a.nome.localeCompare(b.nome));

      setPessoas(unified);
      setLoading(false);
    }
    fetch();
  }, []);

  const totalCLT = pessoas.filter((p) => p.tipo === "CLT").length;
  const totalPJ = pessoas.filter((p) => p.tipo === "PJ").length;
  const totalAtivos = pessoas.filter((p) => p.status === "ativo").length;

  const filtered = pessoas.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.cargo_servico.toLowerCase().includes(search.toLowerCase()) ||
      p.departamento.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || p.tipo === filterTipo;
    const matchStatus = filterStatus === "todos" || p.status === filterStatus;
    return matchSearch && matchTipo && matchStatus;
  });

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleView = (p: PessoaUnificada) => {
    if (p.tipo === "CLT") navigate(`/colaboradores/${p.id}`);
    else navigate(`/contratos-pj`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão unificada de colaboradores CLT e prestadores PJ
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pessoas.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAtivos}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCLT}</p>
              <p className="text-xs text-muted-foreground">CLT</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPJ}</p>
              <p className="text-xs text-muted-foreground">PJ</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cargo/serviço ou departamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="CLT">CLT</SelectItem>
                <SelectItem value="PJ">PJ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="desligado">Desligado/Encerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead className="font-semibold">Tipo</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Cargo / Serviço</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Departamento</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Início</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={`${p.tipo}-${p.id}`} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleView(p)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {initials(p.nome)}
                          </div>
                          <span className="font-medium text-sm">{p.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={p.tipo === "CLT" ? "bg-info/10 text-info border-0" : "bg-warning/10 text-warning border-0"}>
                          {p.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{p.cargo_servico}</TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">{p.departamento}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[p.status] || ""}>
                          {statusMap[p.status] || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                        {format(parseISO(p.data_inicio), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(p)}>
                              <Eye className="mr-2 h-4 w-4" /> Visualizar
                            </DropdownMenuItem>
                            {p.tipo === "CLT" && (
                              <DropdownMenuItem onClick={() => navigate(`/colaboradores/${p.id}?edit=true`)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Mostrando {filtered.length} de {pessoas.length} registros
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
