import AdminPlaceholder from "./_AdminPlaceholder";
import { TrendingUp } from "lucide-react";

export default function FluxoCaixa() {
  return (
    <AdminPlaceholder
      title="Fluxo de Caixa"
      description="Projeção de recebimentos e pagamentos para os próximos 30/60/90 dias."
      icon={TrendingUp}
      status="fase3"
      detalhes="A projeção visual com alertas de saldo negativo virá na Fase 3, alimentada por contas a pagar e receber."
    />
  );
}
