import AdminPlaceholder from "./_AdminPlaceholder";
import { ListTree } from "lucide-react";

export default function PlanoDeContas() {
  return (
    <AdminPlaceholder
      title="Plano de Contas"
      description="Estrutura hierárquica espelhada do Bling. Visualização e busca."
      icon={ListTree}
      status="fase2"
      detalhes="A árvore interativa do plano de contas (importado do Bling) será construída na Fase 2, junto com a tela de importação CSV."
    />
  );
}
