import AdminPlaceholder from "./_AdminPlaceholder";
import { FileBarChart2 } from "lucide-react";

export default function DRE() {
  return (
    <AdminPlaceholder
      title="DRE — Demonstração do Resultado"
      description="Gerada automaticamente a partir dos lançamentos importados."
      icon={FileBarChart2}
      status="fase3"
      detalhes="O DRE estruturado (receita bruta, líquida, lucro bruto, resultado operacional, líquido) com comparativos será entregue na Fase 3."
    />
  );
}
