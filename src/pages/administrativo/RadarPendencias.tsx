import { Radar } from "lucide-react";
import AdminPlaceholder from "./_AdminPlaceholder";

export default function RadarPendencias() {
  return (
    <AdminPlaceholder
      title="Radar de Pendências"
      description="Pendências financeiras e operacionais"
      icon={Radar}
      status="fase2"
      detalhes="Será religado quando o novo modelo de Contas estiver consolidado."
    />
  );
}
