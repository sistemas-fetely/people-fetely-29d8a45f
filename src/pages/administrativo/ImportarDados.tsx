import { Upload } from "lucide-react";
import AdminPlaceholder from "./_AdminPlaceholder";

export default function ImportarDados() {
  return (
    <AdminPlaceholder
      title="Importar Dados"
      description="Importação de notas fiscais e sincronização com sistemas externos"
      icon={Upload}
      status="fase2"
      detalhes="Importadores serão reconstruídos sobre o novo modelo de Contas a Pagar."
    />
  );
}
