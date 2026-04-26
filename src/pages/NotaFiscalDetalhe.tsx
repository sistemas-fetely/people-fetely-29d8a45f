import { FileText } from "lucide-react";
import AdminPlaceholder from "./administrativo/_AdminPlaceholder";

export default function NotaFiscalDetalhe() {
  return (
    <AdminPlaceholder
      title="Nota Fiscal"
      description="Detalhes da nota fiscal"
      icon={FileText}
      status="fase2"
      detalhes="Tela em reconstrução sobre o novo modelo de Contas a Pagar."
    />
  );
}
