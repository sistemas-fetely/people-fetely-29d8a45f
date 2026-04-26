import { Link2 } from "lucide-react";
import AdminPlaceholder from "./_AdminPlaceholder";

export default function BlingCallback() {
  return (
    <AdminPlaceholder
      title="Callback Bling"
      description="Retorno da autenticação OAuth"
      icon={Link2}
      status="fase2"
      detalhes="Integração Bling em reconstrução."
    />
  );
}
