/**
 * SHA-256 hex de um arquivo (client-side, via WebCrypto).
 * Usado pelo Stage Universal de Documentos pra dedup silenciosa.
 */
export async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const TIPO_DOC_LABEL: Record<string, string> = {
  contrato: "Contrato",
  aditivo: "Aditivo",
  orcamento: "Orçamento",
  proposta: "Proposta",
  nf: "NF",
  boleto: "Boleto",
  recibo: "Recibo",
  comprovante: "Comprovante",
  invoice: "Invoice",
  certidao: "Certidão",
  outro: "Outro",
};

export function tipoBadgeClass(tipo: string): string {
  const map: Record<string, string> = {
    contrato: "bg-green-100 text-green-800 border-green-300",
    aditivo: "bg-emerald-100 text-emerald-800 border-emerald-300",
    orcamento: "bg-blue-100 text-blue-800 border-blue-300",
    proposta: "bg-sky-100 text-sky-800 border-sky-300",
    nf: "bg-purple-100 text-purple-800 border-purple-300",
    boleto: "bg-orange-100 text-orange-800 border-orange-300",
    recibo: "bg-teal-100 text-teal-800 border-teal-300",
    comprovante: "bg-cyan-100 text-cyan-800 border-cyan-300",
    invoice: "bg-indigo-100 text-indigo-800 border-indigo-300",
    certidao: "bg-amber-100 text-amber-800 border-amber-300",
    outro: "bg-gray-100 text-gray-700 border-gray-300",
  };
  return map[tipo?.toLowerCase()] ?? map.outro;
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    aguardando: "bg-yellow-100 text-yellow-800 border-yellow-300",
    classificada: "bg-blue-100 text-blue-800 border-blue-300",
    roteada: "bg-[#1A4A3A]/10 text-[#1A4A3A] border-[#1A4A3A]/40",
    descartada: "bg-gray-100 text-gray-500 border-gray-300",
    erro: "bg-red-100 text-red-800 border-red-300",
  };
  return map[status] ?? "bg-gray-100 text-gray-700 border-gray-300";
}

export const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando",
  classificada: "Classificada",
  roteada: "Roteada",
  descartada: "Descartada",
  erro: "Erro",
};
