import { ArrowDownToLine } from "lucide-react";
import AdminPlaceholder from "./_AdminPlaceholder";

export default function ContasReceber() {
  return (
    <AdminPlaceholder
      title="Contas a Receber"
      description="Gestão de recebíveis e pedidos de venda"
      icon={ArrowDownToLine}
      status="fase2"
      detalhes="Esta tela está sendo reconstruída sobre o novo modelo de Contas. Em breve."
    />
  );
}
