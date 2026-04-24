/**
 * Utilitários de parse para importadores financeiros
 * (CSV Qive, XML NFe, PDF DANFE)
 */

export function parseDataBR(str: string | null | undefined): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  // "31/03/2026" -> "2026-03-31"
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Já em ISO ou similar
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);
  return null;
}

export function parseValorBR(str: string | number | null | undefined): number {
  if (str === null || str === undefined || str === "") return 0;
  if (typeof str === "number") return str;
  // "1.459,00" ou "1459,00" ou "1459.00" ou "1459"
  const s = String(str).trim();
  if (!s) return 0;
  // Se tem vírgula, é formato BR. Remove pontos (milhar) e troca vírgula por ponto.
  if (s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(s) || 0;
}

export function limparCnpj(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/[^\d]/g, "");
}

export function mapearMeioPagamentoCsv(str: string | null | undefined): string | null {
  if (!str) return null;
  const s = str.toString().toLowerCase().trim();
  if (!s) return null;
  if (s.includes("pix")) return "pix";
  if (s.includes("crédito") || s.includes("credito") || s === "03") return "cartao_credito";
  if (s.includes("débito") || s.includes("debito") || s === "04") return "cartao_debito";
  if (s.includes("boleto") || s === "15") return "boleto";
  if (s.includes("dinheiro") || s === "01") return "dinheiro";
  if (s.includes("transfer") || s === "02") return "transferencia";
  if (s.includes("sem pagamento") || s === "90") return "sem_pagamento";
  if (s.includes("cheque")) return "cheque";
  return "outro";
}

// XML NFe — tabela oficial do tag <tPag>
export function mapearMeioPagamentoXml(tPag: string | null | undefined): string | null {
  if (!tPag) return null;
  const map: Record<string, string> = {
    "01": "dinheiro",
    "02": "cheque",
    "03": "cartao_credito",
    "04": "cartao_debito",
    "05": "outro", // crédito loja
    "10": "outro", // vale alimentação
    "11": "outro", // vale refeição
    "12": "outro", // vale presente
    "13": "outro", // vale combustível
    "15": "boleto",
    "16": "debito_automatico",
    "17": "transferencia",
    "18": "outro",
    "19": "sem_pagamento",
    "90": "sem_pagamento",
    "99": "outro",
  };
  return map[tPag.trim()] || "outro";
}
