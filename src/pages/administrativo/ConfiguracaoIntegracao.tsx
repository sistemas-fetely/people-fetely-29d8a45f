import { Settings2 } from "lucide-react";
import AdminPlaceholder from "./_AdminPlaceholder";

export default function ConfiguracaoIntegracao() {
  return (
    <AdminPlaceholder
      title="Configuração de Integração"
      description="Conexão com Bling e outros sistemas externos"
      icon={Settings2}
      status="fase2"
      detalhes="Integração será religada após a reconstrução do módulo financeiro."
    />
  );
}
