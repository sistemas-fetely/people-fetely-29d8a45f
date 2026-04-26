import { GitMerge } from "lucide-react";
import AdminPlaceholder from "./_AdminPlaceholder";

export default function Conciliacao() {
  return (
    <AdminPlaceholder
      title="Conciliação Bancária"
      description="Conciliação de movimentações com contas pagas/recebidas"
      icon={GitMerge}
      status="fase2"
      detalhes="Aguardando o novo modelo de Contas a Pagar para ser religada."
    />
  );
}
