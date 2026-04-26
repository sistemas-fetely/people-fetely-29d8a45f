import { ListTree } from "lucide-react";
import AdminPlaceholder from "./_AdminPlaceholder";

export default function PlanoDeContas() {
  return (
    <AdminPlaceholder
      title="Plano de Contas"
      description="Estrutura contábil e categorias"
      icon={ListTree}
      status="fase2"
      detalhes="Categorias seguem disponíveis pelo cadastro de contas. UI dedicada em breve."
    />
  );
}
