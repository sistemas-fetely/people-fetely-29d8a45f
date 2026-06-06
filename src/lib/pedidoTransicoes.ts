import type { EstagioPedido } from "@/types/pedido";

/**
 * Matriz de transições válidas POR INICIATIVA HUMANA.
 *
 * Fluxo novo (sem credito_aprovado):
 *   recebido → [em_analise_credito (boleto a prazo), cobranca (à vista), cancelado]
 *   em_analise_credito → cobranca (silencioso: trigger ao aprovar análise) | cancelado
 *   cobranca → aguardando_pagamento OU pre_faturado (silencioso: RPC materializar_cobranca)
 *   aguardando_pagamento → pre_faturado (silencioso: trigger ao pagar título)
 *   sync Bling → em_separacao/faturado/em_transporte/entregue (futuro)
 *
 * A liberação inteligente (à vista vs. boleto a prazo) usa a RPC rotear_pedido.
 */
export const TRANSICOES_VALIDAS: Record<EstagioPedido, EstagioPedido[]> = {
  recebido: [
    "em_analise_credito",   // SOps encaminha pra crédito (boleto a prazo)
    "cobranca",             // SOps libera direto (à vista — sem crédito a avaliar)
    "cancelado",
  ],
  em_analise_credito: [
    "cancelado",
    // cobranca é silencioso (trigger quando análise vira aprovada)
  ],
  cobranca: [
    "cancelado",
    // aguardando_pagamento ou pre_faturado = automático via RPC materializar_cobranca
  ],
  aguardando_pagamento: [
    "recuperacao_venda",    // SOps migra quando pagamento não chegou e prazo expirou
    "cancelado",
    // pre_faturado = automático quando título é marcado pago
  ],
  pre_faturado: [
    "em_separacao",         // SOps envia pro Bling
    "recuperacao_venda",    // entrada não paga → SOps migra
    "cancelado",
  ],
  em_separacao: [
    "faturado",             // sync Bling (futuro), ou SOps força
    "cancelado",
  ],
  faturado: [
    "em_transporte",        // sync Bling (futuro)
  ],
  em_transporte: [
    "entregue",             // sync Bling (futuro)
  ],
  entregue: [],
  cancelado: [],
  recuperacao_venda: [
    "pre_faturado",         // cliente quitou → reverte
    "cancelado",
  ],
};

export function isEstagioFinal(estagio: EstagioPedido): boolean {
  return estagio === "entregue" || estagio === "cancelado";
}

export function podeTransicionar(estagio: EstagioPedido): boolean {
  return TRANSICOES_VALIDAS[estagio].length > 0;
}

export function transicoesPara(estagio: EstagioPedido): EstagioPedido[] {
  return TRANSICOES_VALIDAS[estagio];
}

/**
 * PIX e cartão dispensam análise de crédito — não há crédito a avaliar.
 * Boleto sempre passa por análise (doutrina: análise universal sem exceção).
 */
export function podePularAnaliseCredito(
  perfilCredito: string | null | undefined
): boolean {
  if (!perfilCredito) return false;
  return ["premium", "recorrente_bom_pagador"].includes(perfilCredito);
}

/** @deprecated Use podePularAnaliseCredito. Mantido pra compat retroativa. */
export const podePularAnaliseParaBoleto = podePularAnaliseCredito;

/**
 * Forma à vista (PIX / cartão) — não há crédito a analisar, pula análise direto.
 */
export function ehFormaAVista(forma: string | null | undefined): boolean {
  const f = (forma ?? "").toLowerCase().trim();
  return f.includes("pix") || f.includes("cartao") || f.includes("cartão");
}
