import AdminPlaceholder from "./_AdminPlaceholder";
import { ArrowUpFromLine } from "lucide-react";

export default function ContasPagar() {
  return (
    <AdminPlaceholder
      title="Contas a Pagar"
      description="Vencimentos a fornecedores e parceiros — abertos, pagos e atrasados."
      icon={ArrowUpFromLine}
      status="fase3"
      detalhes="A tabela com filtros por status, vencimento e fornecedor será entregue na Fase 3."
    />
  );
}
