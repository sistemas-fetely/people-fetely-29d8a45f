import { LayoutDashboard } from "lucide-react";
import AdminPlaceholder from "./_AdminPlaceholder";

export default function DashboardFinanceiro() {
  return (
    <AdminPlaceholder
      title="Dashboard Financeiro"
      description="Visão consolidada do financeiro"
      icon={LayoutDashboard}
      status="fase2"
      detalhes="KPIs serão recalculados a partir do novo modelo de Contas."
    />
  );
}
