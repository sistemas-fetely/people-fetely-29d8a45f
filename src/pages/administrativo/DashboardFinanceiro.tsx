import { LayoutDashboard, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function DashboardFinanceiro() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão analítica em tempo real: receita, despesa, fluxo de caixa e indicadores por canal.
          </p>
        </div>
        <Button asChild className="bg-admin hover:bg-admin-accent text-admin-foreground">
          <Link to="/administrativo/importar">
            <Upload className="h-4 w-4 mr-2" />
            Importar dados
          </Link>
        </Button>
      </div>

      {/* Estado vazio — Fase 1 */}
      <Card className="border-admin/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="h-5 w-5 text-admin" />
            Sem dados importados ainda
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-admin-muted">
            <Upload className="h-8 w-8 text-admin" />
          </div>
          <div className="max-w-md">
            <p className="text-lg font-semibold">Importe seus dados do Bling para começar</p>
            <p className="text-sm text-muted-foreground mt-2">
              Os KPIs (receita, despesa, resultado), gráficos comparativos e projeção de fluxo de caixa
              aparecerão aqui automaticamente após a primeira importação.
            </p>
            <p className="text-xs text-admin mt-4 font-medium uppercase tracking-wide">
              Fase 3 — Em planejamento
            </p>
          </div>
          <Button asChild variant="outline" className="border-admin/30 text-admin hover:bg-admin-muted">
            <Link to="/administrativo/importar">Ir para importação</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
