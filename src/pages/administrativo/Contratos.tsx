import AdminPlaceholder from "./_AdminPlaceholder";
import { FileSignature } from "lucide-react";

export default function Contratos() {
  return (
    <AdminPlaceholder
      title="Contratos"
      description="Gestão de contratos com fornecedores, prestadores e parceiros."
      icon={FileSignature}
      status="futuro"
      detalhes="Módulo de contratos corporativos. Integração com GED e alertas de vencimento."
    />
  );
}
