import AdminPlaceholder from "./_AdminPlaceholder";
import { Receipt } from "lucide-react";

export default function Lancamentos() {
  return (
    <AdminPlaceholder
      title="Lançamentos"
      description="Tabela de todos os lançamentos contábeis importados do Bling."
      icon={Receipt}
      status="fase2"
      detalhes="A listagem com filtros (período, centro de custo, canal, unidade) será implementada na Fase 2."
    />
  );
}
