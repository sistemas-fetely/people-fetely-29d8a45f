export const FORMAS_PAGAMENTO = [
  "Cartão Crédito",
  "PIX",
  "Boleto",
  "TED",
  "Dinheiro",
  "Débito Automático",
  "Outros",
] as const;

export type FormaPagamento = typeof FORMAS_PAGAMENTO[number];
