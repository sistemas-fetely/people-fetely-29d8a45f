import { TrendingUp } from "lucide-react";
import AdminPlaceholder from "./_AdminPlaceholder";

export default function FluxoCaixa() {
  return (
    <AdminPlaceholder
      title="Fluxo de Caixa"
      description="Projeção de entradas e saídas"
      icon={TrendingUp}
      status="fase2"
      detalhes="Será reconstruída sobre o novo modelo de Contas a Pagar/Receber."
    />
  );
}
