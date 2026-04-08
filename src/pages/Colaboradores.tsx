import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Plus, Search, MoreHorizontal, Eye, Edit, Trash2,
  UserCheck, Briefcase,
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
import type { Tables } from "@/integrations/supabase/types";

type ColaboradorWithDepts = Tables<"colaboradores_clt"> & {
  departamentos_rateio?: { departamento: string; percentual_rateio: number }[];
};
import { format, parseISO } from "date-fns";

const statusMap: Record<string, string> = {
  ativo: "Ativo",
  ferias: "Férias",
  afastado: "Afastado",
  experiencia: "Experiência",
  desligado: "Desligado",
};

const statusStyles: Record<string, string> = {
  ativo: "bg-success/10 text-success border-0",
  ferias: "bg-info/10 text-info border-0",
  afastado: "bg-warning/10 text-warning border-0",
  experiencia: "bg-primary/10 text-primary border-0",
  desligado: "bg-destructive/10 text-destructive border-0",
};

export default function Colaboradores() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [colaboradores, setColaboradores] = useState<ColaboradorWithDepts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [{ data: cols }, { data: depts }] = await Promise.all([
        supabase.from("colaboradores_clt").select("*").order("nome_completo"),
        supabase.from("colaborador_departamentos").select("colaborador_id, departamento, percentual_rateio"),
      ]);
      if (cols) {
        const deptsMap = new Map<string, { departamento: string; percentual_rateio: number }[]>();
        (depts || []).forEach((d) => {
          const arr = deptsMap.get(d.colaborador_id) || [];
          arr.push({ departamento: d.departamento, percentual_rateio: d.percentual_rateio });
          deptsMap.set(d.colaborador_id, arr);
        });
        setColaboradores(cols.map((c) => ({ ...c, departamentos_rateio: deptsMap.get(c.id) || [] })));
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = colaboradores.filter((c) => {
    const matchSearch =
      c.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
      c.cargo.toLowerCase().includes(search.toLowerCase()) ||
      c.departamento.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalAtivos = colaboradores.filter((c) => c.status === "ativo").length;

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerenciamento de colaboradores CLT e PJ
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/colaboradores/novo")}>
          <Plus className="h-4 w-4" />
          Novo Colaborador
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{colaboradores.length}</p>
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
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{colaboradores.length - totalAtivos}</p>
              <p className="text-xs text-muted-foreground">Outros</p>
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
                placeholder="Buscar por nome, cargo ou departamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="ferias">Férias</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
                <SelectItem value="experiencia">Experiência</SelectItem>
                <SelectItem value="desligado">Desligado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead className="font-semibold">Cargo</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Departamento</TableHead>
                  <TableHead className="font-semibold">Contrato</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Admissão</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum colaborador encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {initials(c.nome_completo)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{c.nome_completo}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{c.departamento}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.cargo}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">
                        {c.departamentos_rateio && c.departamentos_rateio.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.departamentos_rateio.map((d, i) => (
                              <Badge key={i} variant="outline" className="bg-muted text-xs font-normal">
                                {d.departamento} ({d.percentual_rateio}%)
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          c.departamento
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-0 capitalize">
                          {c.tipo_contrato}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[c.status] || ""}>
                          {statusMap[c.status] || c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                        {format(parseISO(c.data_admissao), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> Visualizar</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
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
              Mostrando {filtered.length} de {colaboradores.length} colaboradores
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
