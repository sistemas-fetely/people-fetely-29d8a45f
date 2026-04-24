import AdminPlaceholder from "./_AdminPlaceholder";
import { Building2 } from "lucide-react";

export default function Imoveis() {
  return (
    <AdminPlaceholder
      title="Imóveis"
      description="Gestão de imóveis da empresa: sede SP, filial Joinville."
      icon={Building2}
      status="futuro"
      detalhes="Cadastro de imóveis, contratos de locação, IPTU, manutenções e responsáveis."
    />
  );
}
