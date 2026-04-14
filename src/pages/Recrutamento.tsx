import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Search, UserCheck, Plus } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { format } from "date-fns";
import { NovaVagaDialog } from "@/components/recrutamento/NovaVagaDialog";

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  aberta: { label: "Aberta", className: "bg-success/15 text-success border-success/30" },
  em_selecao: { label: "Em seleção", className: "bg-info/15 text-info border-info/30" },
  encerrada: { label: "Encerrada", className: "bg-muted text-muted-foreground" },
  cancelada: { label: "Cancelada", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const tipoContratoLabel: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  ambos: "CLT/PJ",
};

export default function Recrutamento() {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("recrutamento", "create");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: vagas = [], isLoading: loadingVagas } = useQuery({
    queryKey: ["vagas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: candidatos = [] } = useQuery({
    queryKey: ["candidatos-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidatos")
        .select("id, vaga_id, status, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const vagasAbertas = vagas.filter((v) => v.status === "aberta").length;
  const vagasEmSelecao = vagas.filter((v) => v.status === "em_selecao").length;
  const totalCandidatos = candidatos.length;
  const now = new Date();
  const contratacoesMes = candidatos.filter((c) => {
    if (c.status !== "contratado") return false;
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const candidatosPorVaga = candidatos.reduce<Record<string, number>>((acc, c) => {
    acc[c.vaga_id] = (acc[c.vaga_id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recrutamento e Seleção</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão de vagas e candidatos</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Vaga
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Vagas Abertas" value={vagasAbertas} icon={Briefcase} variant="success" />
        <StatCard title="Total de Candidatos" value={totalCandidatos} icon={Users} variant="info" />
        <StatCard title="Em Seleção" value={vagasEmSelecao} icon={Search} variant="warning" />
        <StatCard title="Contratações (mês)" value={contratacoesMes} icon={UserCheck} variant="default" />
      </div>

      {/* Lista de vagas */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Vagas</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingVagas ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : vagas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Briefcase className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nenhuma vaga cadastrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Candidatos</TableHead>
                  <TableHead>Abertura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vagas.map((vaga) => {
                  const cfg = statusConfig[vaga.status] || statusConfig.rascunho;
                  return (
                    <TableRow key={vaga.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{vaga.titulo}</TableCell>
                      <TableCell>{vaga.area}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {tipoContratoLabel[vaga.tipo_contrato] || vaga.tipo_contrato}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{candidatosPorVaga[vaga.id] || 0}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {vaga.vigencia_inicio
                          ? format(new Date(vaga.vigencia_inicio), "dd/MM/yyyy")
                          : format(new Date(vaga.created_at), "dd/MM/yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <NovaVagaDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
