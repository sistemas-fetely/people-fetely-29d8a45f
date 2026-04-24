import AdminPlaceholder from "./_AdminPlaceholder";
import { FolderArchive } from "lucide-react";

export default function GED() {
  return (
    <AdminPlaceholder
      title="GED — Gestão Eletrônica de Documentos"
      description="Repositório central: contratos, certidões e documentos contábeis."
      icon={FolderArchive}
      status="futuro"
      detalhes="Indexação por tipo, busca textual, versionamento e controle de acesso por área."
    />
  );
}
