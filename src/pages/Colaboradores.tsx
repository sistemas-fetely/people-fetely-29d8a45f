import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2,
  Download, Upload, UserCheck, Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  departamento: string;
  vinculo: "CLT" | "PJ";
  status: "Ativo" | "Férias" | "Afastado" | "Experiência" | "Desligado";
  admissao: string;
  email: string;
}

const mockColaboradores: Colaborador[] = [
  { id: "001", nome: "Ana Silva", cargo: "Dev. Senior", departamento: "TI", vinculo: "CLT", status: "Ativo", admissao: "15/01/2022", email: "ana@empresa.com" },
  { id: "002", nome: "Carlos Souza", cargo: "Analista Comercial", departamento: "Comercial", vinculo: "CLT", status: "Ativo", admissao: "03/03/2021", email: "carlos@empresa.com" },
  { id: "003", nome: "Maria Oliveira", cargo: "Coord. RH", departamento: "RH", vinculo: "CLT", status: "Férias", admissao: "10/06/2020", email: "maria@empresa.com" },
  { id: "004", nome: "Pedro Santos", cargo: "Consultor", departamento: "TI", vinculo: "PJ", status: "Ativo", admissao: "01/08/2023", email: "pedro@pjconsulting.com" },
  { id: "005", nome: "Julia Costa", cargo: "Designer UX", departamento: "Marketing", vinculo: "PJ", status: "Ativo", admissao: "15/11/2023", email: "julia@design.com" },
  { id: "006", nome: "Roberto Lima", cargo: "Analista Financeiro", departamento: "Financeiro", vinculo: "CLT", status: "Experiência", admissao: "01/03/2024", email: "roberto@empresa.com" },
  { id: "007", nome: "Fernanda Dias", cargo: "Dev. Pleno", departamento: "TI", vinculo: "CLT", status: "Ativo", admissao: "20/05/2022", email: "fernanda@empresa.com" },
  { id: "008", nome: "Lucas Pereira", cargo: "Gerente Operações", departamento: "Operações", vinculo: "CLT", status: "Ativo", admissao: "12/02/2019", email: "lucas@empresa.com" },
  { id: "009", nome: "Beatriz Almeida", cargo: "Desenvolvedora", departamento: "TI", vinculo: "CLT", status: "Afastado", admissao: "08/09/2021", email: "beatriz@empresa.com" },
  { id: "010", nome: "Thiago Martins", cargo: "Arquiteto Cloud", departamento: "TI", vinculo: "PJ", status: "Ativo", admissao: "01/01/2024", email: "thiago@cloudarch.com" },
];

const statusStyles: Record<string, string> = {
  "Ativo": "bg-success/10 text-success border-0",
  "Férias": "bg-info/10 text-info border-0",
  "Afastado": "bg-warning/10 text-warning border-0",
  "Experiência": "bg-primary/10 text-primary border-0",
  "Desligado": "bg-destructive/10 text-destructive border-0",
};

export default function Colaboradores() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterVinculo, setFilterVinculo] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [dbColaboradores, setDbColaboradores] = useState<Tables<"colaboradores_clt">[]>([]);

  useEffect(() => {
    supabase.from("colaboradores_clt").select("*").order("nome_completo").then(({ data }) => {
      if (data) setDbColaboradores(data);
    });
  }, []);
  const [filterStatus, setFilterStatus] = useState("todos");

  const filtered = mockColaboradores.filter((c) => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cargo.toLowerCase().includes(search.toLowerCase()) ||
      c.departamento.toLowerCase().includes(search.toLowerCase());
    const matchVinculo = filterVinculo === "todos" || c.vinculo === filterVinculo;
    const matchStatus = filterStatus === "todos" || c.status === filterStatus;
    return matchSearch && matchVinculo && matchStatus;
  });

  const totalCLT = mockColaboradores.filter(c => c.vinculo === "CLT").length;
  const totalPJ = mockColaboradores.filter(c => c.vinculo === "PJ").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerenciamento de colaboradores CLT e PJ</p>
        </div>
        <Button className="gap-2">
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
              <p className="text-2xl font-bold">{mockColaboradores.length}</p>
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
              <p className="text-2xl font-bold">{totalCLT}</p>
              <p className="text-xs text-muted-foreground">CLT</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
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
                placeholder="Buscar por nome, cargo ou departamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterVinculo} onValueChange={setFilterVinculo}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Vínculo" />
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
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Férias">Férias</SelectItem>
                <SelectItem value="Afastado">Afastado</SelectItem>
                <SelectItem value="Experiência">Experiência</SelectItem>
                <SelectItem value="Desligado">Desligado</SelectItem>
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
                  <TableHead className="font-semibold">Vínculo</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Admissão</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {c.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{c.nome}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{c.departamento}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.cargo}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{c.departamento}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={c.vinculo === "CLT" ? "bg-primary/10 text-primary border-0" : "bg-info/10 text-info border-0"}>
                        {c.vinculo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyles[c.status]}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{c.admissao}</TableCell>
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
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum colaborador encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Mostrando {filtered.length} de {mockColaboradores.length} colaboradores
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
