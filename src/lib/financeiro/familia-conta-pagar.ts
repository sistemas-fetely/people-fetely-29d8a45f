/**
 * Helper: classifica conta a pagar em FAMÍLIA (3 comportamentos) e
 * derruba toda a lógica de visibilidade de campos + regra do ícone email
 * em um lugar só.
 *
 * Doutrina cravada por Flavio (02/05/2026):
 *
 * 1. A coluna `origem` aceita 9+ valores em produção (manual, xml_nfe,
 *    pdf_nfe, nf_pj_interno, csv_qive, api_bling, recorrente, csv,
 *    extrato). Tratar enum por enum não escala. Agrupamos em 3 famílias
 *    de comportamento real:
 *
 *      A_a_pagar  — vai pagar no futuro (manual + import + recorrente)
 *      B_cartao   — paga via fatura de cartão (is_cartao = true)
 *      C_ja_saiu  — nasceu paga (origem = 'extrato', vinda de OFX avulso)
 *
 * 2. A regra do ícone email é binária no fundo: vermelho SÓ quando a
 *    forma de pagamento exige "pedir dinheiro sair" (boleto, PIX,
 *    transferência) E a conta ainda está em fluxo. Cartão e OFX nunca
 *    cobram email — são cinza por natureza.
 *
 * 3. Quando módulo PJ específico chegar, refina dentro da Família A
 *    sem mexer nessa engine. Default seguro = Família A = mostra tudo.
 */

// ============================================================
// TIPOS
// ============================================================

export type FamiliaContaPagar =
  | "A_a_pagar"   // manual, NF, import, recorrente — vai pagar no futuro
  | "B_cartao"    // paga via fatura de cartão
  | "C_ja_saiu";  // OFX avulso — nasceu paga

export type VisibilidadeCampo = "editar" | "obrigatorio" | "readonly" | "oculto";

export type CampoConta =
  | "descricao"
  | "data_vencimento"
  | "categoria"
  | "centro_custo"
  | "forma_pagamento"
  | "pago_em_conta"
  | "nf_numero_serie"
  | "nf_chave"
  | "observacao";

export type MapaCamposVisiveis = Record<CampoConta, VisibilidadeCampo>;

export type RegraIconeEmail = "verde" | "vermelho" | "cinza";

// Input mínimo pra classificar família
export type ContaParaFamilia = {
  is_cartao: boolean | null;
  origem: string | null;
};

// Input pra regra do ícone email
export type ContaParaIconeEmail = {
  familia: FamiliaContaPagar;
  forma_pagamento_codigo: string | null;
  status: string;
  email_pagamento_enviado: boolean | null;
};

// ============================================================
// FAMÍLIA
// ============================================================

/**
 * Decide a família pelos sinais mais fortes (ordem importa):
 * 1. is_cartao = true   → B (cartão sempre vence outros sinais)
 * 2. origem = 'extrato' → C (OFX avulso)
 * 3. resto              → A (default seguro)
 */
export function getFamiliaContaPagar(conta: ContaParaFamilia): FamiliaContaPagar {
  if (conta.is_cartao === true) return "B_cartao";
  if (conta.origem === "extrato") return "C_ja_saiu";
  return "A_a_pagar";
}

// ============================================================
// VISIBILIDADE DOS CAMPOS NO DRAWER
// ============================================================

const STATUS_TERMINAIS = ["paga", "cancelado"];
const STATUS_PRE_PAGAMENTO = ["aprovado", "aguardando_pagamento"];

/**
 * Retorna o estado de cada campo do drawer dado família + status.
 *
 * Regras-mestras:
 * - Status terminal (paga/cancelado)  → tudo readonly (regra global existente)
 * - Família B (cartão)                → forma_pagamento e pago_em_conta READONLY
 *                                        (vem da fatura, não se decide aqui)
 * - Família C (OFX já saiu)           → forma_pagamento e pago_em_conta READONLY
 *                                        (vem da transação OFX)
 * - Família A em pré-pagamento        → pago_em_conta vira OBRIGATÓRIO
 *                                        (precisa pra lançar em movimentação)
 * - nf_chave                          → sempre OCULTO por padrão (botão revela
 *                                        ou anexar PDF preenche automático).
 *                                        Em status terminal vira readonly se
 *                                        houver chave preenchida.
 */
export function getCamposVisiveis(
  familia: FamiliaContaPagar,
  status: string,
): MapaCamposVisiveis {
  const terminal = STATUS_TERMINAIS.includes(status);
  const prePagamento = STATUS_PRE_PAGAMENTO.includes(status);

  if (terminal) {
    // Tudo readonly (chave continua oculta a menos que componente decida revelar)
    return {
      descricao: "readonly",
      data_vencimento: "readonly",
      categoria: "readonly",
      centro_custo: "readonly",
      forma_pagamento: "readonly",
      pago_em_conta: "readonly",
      nf_numero_serie: "readonly",
      nf_chave: "readonly",
      observacao: "readonly",
    };
  }

  // Não-terminal: difere por família
  if (familia === "B_cartao") {
    return {
      descricao: "editar",
      data_vencimento: "readonly",     // herdado da fatura
      categoria: "editar",
      centro_custo: "editar",
      forma_pagamento: "readonly",     // = "Cartão de Crédito"
      pago_em_conta: "readonly",       // = cartão (paga via fatura)
      nf_numero_serie: "editar",
      nf_chave: "oculto",
      observacao: "editar",
    };
  }

  if (familia === "C_ja_saiu") {
    return {
      descricao: "editar",
      data_vencimento: "readonly",     // = data da transação OFX
      categoria: "editar",
      centro_custo: "editar",
      forma_pagamento: "readonly",     // = transferência (vem do OFX)
      pago_em_conta: "readonly",       // = conta bancária do OFX
      nf_numero_serie: "editar",
      nf_chave: "oculto",
      observacao: "editar",
    };
  }

  // Família A — default
  return {
    descricao: "editar",
    data_vencimento: "editar",
    categoria: "editar",
    centro_custo: "editar",
    forma_pagamento: "editar",
    pago_em_conta: prePagamento ? "obrigatorio" : "editar",
    nf_numero_serie: "editar",
    nf_chave: "oculto",
    observacao: "editar",
  };
}

// ============================================================
// REGRA DO ÍCONE EMAIL
// ============================================================

/**
 * Códigos de forma_pagamento que disparam vermelho (cobrança útil).
 * Lista cravada com Flavio:
 * - PIX, boleto, transferência → fornecedor precisa receber dados
 * - Cartão (qualquer), débito automático, dinheiro, cheque → não cobra
 */
const FORMAS_QUE_COBRAM_EMAIL = new Set(["pix", "boleto", "transferencia"]);

/**
 * 3 estados, 1 fonte de verdade:
 *
 *   verde    → email já foi enviado
 *   vermelho → ainda em fluxo + forma cobra email + não enviou
 *   cinza    → todo o resto (família B/C, terminal, ou forma que dispensa)
 *
 * Nunca é alerta falso. Cinza = neutro, não pendência.
 */
export function getRegraIconeEmail(input: ContaParaIconeEmail): RegraIconeEmail {
  // 1. Já enviado vence tudo
  if (input.email_pagamento_enviado === true) return "verde";

  // 2. Família B (cartão) e C (OFX já saiu) nunca cobram email
  if (input.familia !== "A_a_pagar") return "cinza";

  // 3. Status fora da janela útil = cinza
  if (STATUS_TERMINAIS.includes(input.status)) return "cinza";

  // 4. Forma de pagamento define se cobra ou não
  if (
    input.forma_pagamento_codigo &&
    FORMAS_QUE_COBRAM_EMAIL.has(input.forma_pagamento_codigo)
  ) {
    return "vermelho";
  }

  return "cinza";
}
