import AdminPlaceholder from "./_AdminPlaceholder";
import { Upload } from "lucide-react";

export default function ImportarDados() {
  return (
    <AdminPlaceholder
      title="Importar Dados do Bling"
      description="Upload de CSV: plano de contas, lançamentos, contas a pagar e a receber."
      icon={Upload}
      status="fase2"
      detalhes="Os 4 cards de importação (parser Papa Parse + preview + deduplicação por bling_id) serão implementados na Fase 2."
    />
  );
}
