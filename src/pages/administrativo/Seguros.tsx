import AdminPlaceholder from "./_AdminPlaceholder";
import { ShieldCheck } from "lucide-react";

export default function Seguros() {
  return (
    <AdminPlaceholder
      title="Seguros"
      description="Apólices e seguros corporativos."
      icon={ShieldCheck}
      status="futuro"
      detalhes="Cadastro de apólices, vigências, sinistros e renovações automáticas."
    />
  );
}
