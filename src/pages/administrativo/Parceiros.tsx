import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Users, Trash2 } from "lucide-react";
import { ParceiroFormSheet, Parceiro } from "@/components/financeiro/ParceiroFormSheet";
import { CategoriaOption } from "@/components/financeiro/CategoriaCombobox";

const TIPO_BADGE: Record<string, string> = {
  fornecedor: "bg-[#8B1A2F] text-white hover:bg-[#8B1A2F]",
  cliente: "bg-[#1A4A3A] text-white hover:bg-[#1A4A3A]",
  ambos: "bg-[#2563EB] text-white hover:bg-[#2563EB]",
};

function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return "—";
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

export default function Parceiros() {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("ativos");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Parceiro | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["parceiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parceiros_comerciais")
        .select("*")
        .order("razao_social");
      if (error) throw error;
      return data as Parceiro[];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["plano-contas-flat"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_contas")
        .select("id,codigo,nome,nivel,parent_id")
        .order("codigo");
      if (error) throw error;
      return data as CategoriaOption[];
    },
  });

  const filtered = useMemo(() => {
    let list = data || [];
    if (filtroStatus === "ativos") list = list.filter((p) => p.ativo !== false);
    else if (filtroStatus === "inativos") list = list.filter((p) => p.ativo === false);

    if (filtroTipo !== "todos") {
      list = list.filter((p) => (p.tipos || []).includes(filtroTipo));
    }
    if (busca.trim()) {
      const t = busca.toLowerCase();
      list = list.filter(
        (p) =>
          p.razao_social.toLowerCase().includes(t) ||
          (p.nome_fantasia || "").toLowerCase().includes(t) ||
          (p.cnpj || "").includes(t.replace(/\D/g, "")),
      );
    }
    return list;
  }, [data, filtroTipo, filtroStatus, busca]);

  const kpis = useMemo(() => {
    const all = data || [];
    return {
      total: all.length,
      fornecedores: all.filter((p) => (p.tipos || []).includes("fornecedor")).length,
      clientes: all.filter((p) => (p.tipos || []).includes("cliente")).length,
    };
  }, [data]);

  const handleOpenNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (p: Parceiro) => {
    setEditing(p);
    setFormOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-admin" />
            Parceiros Comerciais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fornecedores, clientes e parceiros da Fetely — cadastro unificado.
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2 bg-admin hover:bg-admin/90 text-admin-foreground">
          <Plus className="h-4 w-4" />
          Novo parceiro
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Total de parceiros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#8B1A2F]">{kpis.fornecedores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A4A3A]">{kpis.clientes}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="fornecedor">Fornecedores</SelectItem>
                <SelectItem value="cliente">Clientes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum parceiro encontrado.
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const tipos = p.tipos || [];
                    const tipoLabel =
                      tipos.length === 2 ? "ambos" : tipos[0] || "fornecedor";
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => handleEdit(p)}
                      >
                        <TableCell className="font-mono text-xs">{formatCnpj(p.cnpj)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{p.razao_social}</div>
                            {p.nome_fantasia && (
                              <div className="text-xs text-muted-foreground">{p.nome_fantasia}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={TIPO_BADGE[tipoLabel] || "bg-muted"}>
                            {tipoLabel === "ambos" ? "Forn. + Cliente" : tipoLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.cidade ? `${p.cidade}/${p.uf || "—"}` : "—"}
                        </TableCell>
                        <TableCell>
                          {p.tags && p.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.tags.slice(0, 3).map((t) => (
                                <Badge key={t} variant="secondary" className="text-xs">
                                  {t}
                                </Badge>
                              ))}
                              {p.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{p.tags.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ParceiroFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        categorias={categorias || []}
      />
    </div>
  );
}
