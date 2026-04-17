import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, UserCheck, Wrench } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TI_COLOR = "#3A7D6B";

interface KPI {
  total: number;
  disponivel: number;
  atribuido: number;
  manutencao: number;
}

interface AtivoRecente {
  id: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  status: string;
  colaborador_nome: string | null;
  updated_at: string;
}

const statusVariant: Record<string, { label: string; className: string }> = {
  disponivel: { label: "Disponível", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  atribuido: { label: "Atribuído", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  manutencao: { label: "Manutenção", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  descartado: { label: "Descartado", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
};

export default function TIDashboard() {
  const [kpi, setKpi] = useState<KPI>({ total: 0, disponivel: 0, atribuido: 0, manutencao: 0 });
  const [recentes, setRecentes] = useState<AtivoRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: ativos }, { data: ultimos }] = await Promise.all([
        supabase.from("ti_ativos").select("status, em_manutencao" as any),
        supabase
          .from("ti_ativos")
          .select("id, tipo, marca, modelo, status, colaborador_nome, updated_at, em_manutencao" as any)
          .order("updated_at", { ascending: false })
          .limit(8),
      ]);

      if (ativos) {
        setKpi({
          total: ativos.length,
          disponivel: ativos.filter((a: any) => a.status === "disponivel").length,
          atribuido: ativos.filter((a: any) => a.status === "atribuido").length,
          manutencao: ativos.filter((a: any) => a.em_manutencao === true).length,
        });
      }
      if (ultimos) setRecentes(ultimos as unknown as AtivoRecente[]);
      setLoading(false);
    };
    void load();
  }, []);

  const cards = [
    { label: "Total de Ativos", value: kpi.total, icon: Package, color: TI_COLOR },
    { label: "Disponíveis", value: kpi.disponivel, icon: CheckCircle2, color: "#16A34A" },
    { label: "Atribuídos", value: kpi.atribuido, icon: UserCheck, color: TI_COLOR },
    { label: "Em Manutenção", value: kpi.manutencao, icon: Wrench, color: "#CA8A04" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: TI_COLOR }}>
          TI Fetély — Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do inventário de TI</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-l-4" style={{ borderLeftColor: c.color }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{c.label}</p>
                  <p className="text-3xl font-bold mt-1">{loading ? "—" : c.value}</p>
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${c.color}15` }}
                >
                  <c.icon className="h-6 w-6" style={{ color: c.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos ativos movimentados</CardTitle>
        </CardHeader>
        <CardContent>
          {recentes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum ativo cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentes.map((a) => {
                  const v = statusVariant[a.status] || statusVariant.disponivel;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="capitalize">{a.tipo}</TableCell>
                      <TableCell>
                        {[a.marca, a.modelo].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={v.className}>{v.label}</Badge>
                      </TableCell>
                      <TableCell>{a.colaborador_nome || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(a.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
