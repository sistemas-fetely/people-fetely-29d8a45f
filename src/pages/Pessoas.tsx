import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Users, Search, MoreHorizontal, Eye, Edit, Mail, Phone, Shield,
  UserCheck, Briefcase, Building2, Plus, ChevronDown, CheckCircle2, AlertCircle, Trash2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { useCLevelCargos } from "@/hooks/useCLevelCargos";
import { DrawerUsuario } from "@/components/DrawerUsuario";
import { useUsuariosOrfaos } from "@/hooks/useUsuariosOrfaos";
import { humanizeError } from "@/lib/errorMessages";

interface PessoaUnificada {
  id: string;
  nome: string;                    // nome da PESSOA (contato_nome no PJ, nome_completo no CLT)
  subtitulo: string | null;        // empresa/fantasia no PJ, null no CLT
  tipo: "CLT" | "PJ";
  cargo_servico: string;
  departamento: string;
  status: string;
  data_inicio: string;
  valor: number | null;
  foto_url: string | null;
  user_id: string | null;
  email_corporativo: string | null;
  telefone_corporativo: string | null;
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
  const { canSeeSalary } = usePermissions();
  const { isCargoClevel } = useCLevelCargos();
  const [searchParams] = useSearchParams();
  const tipoFromQuery = searchParams.get("tipo");
  const [pessoas, setPessoas] = useState<PessoaUnificada[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>(
    tipoFromQuery === "CLT" || tipoFromQuery === "PJ" ? tipoFromQuery : "todos"
  );
  const [filterStatus, setFilterStatus] = useState("todos");
  const [drawerUsuarioId, setDrawerUsuarioId] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const [{ data: clts }, { data: pjs }] = await Promise.all([
        supabase.from("colaboradores_clt").select(
          "id, nome_completo, cargo, departamento, status, data_admissao, " +
          "salario_base, foto_url, user_id, email_corporativo, telefone_corporativo"
        ).order("nome_completo"),
        supabase.from("contratos_pj").select(
          "id, contato_nome, razao_social, nome_fantasia, tipo_servico, departamento, " +
          "status, data_inicio, valor_mensal, foto_url, user_id, " +
          "email_corporativo, telefone_corporativo"
        ).order("contato_nome"),
      ]);

      const unified: PessoaUnificada[] = [
        ...(clts || []).map((c: any) => ({
          id: c.id,
          nome: c.nome_completo,
          subtitulo: null,
          tipo: "CLT" as const,
          cargo_servico: c.cargo,
          departamento: c.departamento,
          status: c.status,
          data_inicio: c.data_admissao,
          valor: c.salario_base,
          foto_url: c.foto_url,
          user_id: c.user_id || null,
          email_corporativo: c.email_corporativo || null,
          telefone_corporativo: c.telefone_corporativo || null,
        })),
        ...(pjs || []).map((p: any) => ({
          id: p.id,
          nome: p.contato_nome,                              // pessoa física em destaque
          subtitulo: p.nome_fantasia || p.razao_social,      // empresa vira subtítulo
          tipo: "PJ" as const,
          cargo_servico: p.tipo_servico,
          departamento: p.departamento,
          status: p.status,
          data_inicio: p.data_inicio,
          valor: p.valor_mensal,
          foto_url: p.foto_url,
          user_id: p.user_id || null,
          email_corporativo: p.email_corporativo || null,
          telefone_corporativo: p.telefone_corporativo || null,
        })),
      ].sort((a, b) => a.nome.localeCompare(b.nome));

      setPessoas(unified);
      setLoading(false);
    }
    fetch();
  }, []);

  const { data: orfaosSet } = useUsuariosOrfaos(pessoas.map((p) => p.user_id));

  const totalCLT = pessoas.filter((p) => p.tipo === "CLT").length;
  const totalPJ = pessoas.filter((p) => p.tipo === "PJ").length;
  const totalAtivos = pessoas.filter((p) => p.status === "ativo").length;
  const totalSemAcesso = pessoas.filter((p) => {
    if (p.status === "desligado" || p.status === "encerrado") return false;
    if (!p.user_id) return true;
    if (orfaosSet?.has(p.user_id)) return true;
    return false;
  }).length;

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
    const state = { from: "/pessoas" };
    if (p.tipo === "CLT") navigate(`/colaboradores/${p.id}`, { state });
    else navigate(`/contratos-pj/${p.id}`, { state });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão unificada de colaboradores CLT e prestadores PJ
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Novo Cadastro <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate("/colaboradores/novo")}>
              <Building2 className="mr-2 h-4 w-4" /> Colaborador CLT
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/contratos-pj?novo=true")}>
              <Briefcase className="mr-2 h-4 w-4" /> Contrato PJ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={`grid gap-4 grid-cols-1 ${totalSemAcesso > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
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
        {totalSemAcesso > 0 && (
          <Card className="card-shadow border-warning/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{totalSemAcesso}</p>
                <p className="text-xs text-muted-foreground">Sem acesso</p>
              </div>
            </CardContent>
          </Card>
        )}
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
                  <TableHead className="font-semibold text-center">Acesso</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Início</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={`${p.tipo}-${p.id}`} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(p);
                            }}
                            className="flex items-center gap-3 text-left hover:text-primary transition-colors"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={p.foto_url || undefined} alt={p.nome} className="object-cover" />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {initials(p.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-sm hover:underline truncate">{p.nome}</span>
                              {p.subtitulo && (
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {p.subtitulo}
                                </span>
                              )}
                            </div>
                          </button>

                          <div className="flex items-center gap-0.5 ml-auto">
                            {p.email_corporativo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                title={`Enviar email para ${p.email_corporativo}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `mailto:${p.email_corporativo}`;
                                }}
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {p.user_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                title="Ver acessos e perfil de usuário"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDrawerUsuarioId(p.user_id);
                                }}
                              >
                                <Shield className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {p.telefone_corporativo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                title={`Telefone: ${p.telefone_corporativo}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                                    window.location.href = `tel:${p.telefone_corporativo}`;
                                  } else {
                                    navigator.clipboard.writeText(p.telefone_corporativo!);
                                    toast.success(`Telefone copiado: ${p.telefone_corporativo}`);
                                  }
                                }}
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            p.tipo === "CLT"
                              ? "bg-info text-info-foreground hover:bg-info/90 font-bold border-0"
                              : "bg-warning text-warning-foreground hover:bg-warning/90 font-bold border-0"
                          }
                        >
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
                      <TableCell className="text-center">
                        {p.user_id && orfaosSet?.has(p.user_id) ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-0 gap-1 cursor-help">
                                  <AlertCircle className="h-3 w-3" />
                                  Acesso inconsistente
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Há um vínculo de usuário, mas o acesso real não foi criado. Reabra o cadastro para corrigir.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : p.user_id ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-0 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-warning/10 text-warning border-0 gap-1 cursor-help">
                                  <AlertCircle className="h-3 w-3" />
                                  Sem acesso
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Colaborador não possui usuário de acesso ao sistema. Acesse o detalhe para criar.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
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
                            <DropdownMenuItem
                              onClick={() => {
                                const rota = p.tipo === "CLT"
                                  ? `/colaboradores/${p.id}?edit=true`
                                  : `/contratos-pj/${p.id}?edit=true`;
                                navigate(rota, { state: { from: "/pessoas" } });
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
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

      <DrawerUsuario
        userId={drawerUsuarioId}
        open={!!drawerUsuarioId}
        onOpenChange={(open) => !open && setDrawerUsuarioId(null)}
      />
    </div>
  );
}
