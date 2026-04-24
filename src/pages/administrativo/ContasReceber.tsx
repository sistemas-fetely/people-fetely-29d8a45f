import AdminPlaceholder from "./_AdminPlaceholder";
import { ArrowDownToLine } from "lucide-react";

export default function ContasReceber() {
  return (
    <AdminPlaceholder
      title="Contas a Receber"
      description="Faturas e recebimentos previstos — por canal e cliente."
      icon={ArrowDownToLine}
      status="fase3"
      detalhes="A tabela com filtros por status, vencimento e canal será entregue na Fase 3."
    />
  );
}
