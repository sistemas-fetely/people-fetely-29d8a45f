/**
 * Score OFX → Conta a Pagar (29/04/2026).
 *
 * Doutrina cravada por Flavio: score 95%+ = match óbvio,
 * permite "1 clique conciliar". Score 70-94% = sugestão pra hint.
 * Score < 70% = não destaca.
 *
 * Composição (max 100):
 * - Valor (50pts): exato 50, próximo (≤R$0,50) 30, próximo (≤R$5) 15
 * - Fornecedor (30pts): match de palavra-chave significativa
 * - Data (20pts): vencimento próximo da transação
 *   - ≤3 dias: 20
 *   - ≤7 dias: 12
 *   - ≤15 dias: 6
 *
 * NÃO usa cartão (forma_pagamento) porque OFX é transferência/débito direto.
 */

export interface OfxLite {
  id: string;
  valor: number;
  data_transacao: string;
  descricao: string;
}

export interface ContaPagarLite {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string | null;
  fornecedor_cliente?: string | null;
}

export interface ScoreResult {
  score: number; // 0-100
  motivos: string[]; // legíveis humanos pra tooltip
}

/**
 * Extrai palavra-chave significativa da descrição.
 * Pula stop-words e palavras curtas (igual lógica do cartão).
 */
function extrairPalavraChave(descricao: string): string {
  const STOP = new Set([
    "PG", "PAGO", "TED", "DOC", "PIX", "DEB", "DEBITO", "CRED", "CREDITO",
    "TRANSF", "PAGTO", "SISPAG", "DIVERSOS", "REND", "APLIC", "AUT", "TAR",
    "BLOQUETO", "MANUT", "CONTA", "RECEBIDA",
  ]);

  const palavras = descricao
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length >= 4 && !STOP.has(p));

  return palavras[0] || "";
}

export function calcularScoreOfxConta(
  ofx: OfxLite,
  conta: ContaPagarLite,
): ScoreResult {
  const motivos: string[] = [];
  let score = 0;

  // 1) Score de valor (até 50pts)
  const valorOfx = Math.abs(ofx.valor);
  const valorConta = Math.abs(conta.valor);
  const diff = Math.abs(valorOfx - valorConta);

  if (diff <= 0.01) {
    score += 50;
    motivos.push("valor exato");
  } else if (diff <= 0.5) {
    score += 30;
    motivos.push("valor muito próximo");
  } else if (diff <= 5) {
    score += 15;
    motivos.push("valor aproximado");
  }

  // 2) Score de fornecedor (até 30pts)
  const palavraOfx = extrairPalavraChave(ofx.descricao);
  const palavraConta = extrairPalavraChave(conta.descricao);
  const fornecedorAlvo = (conta.fornecedor_cliente || "").toUpperCase();

  if (palavraOfx && palavraOfx.length >= 4) {
    if (
      conta.descricao.toUpperCase().includes(palavraOfx) ||
      fornecedorAlvo.includes(palavraOfx)
    ) {
      score += 30;
      motivos.push(`fornecedor "${palavraOfx}"`);
    } else if (palavraConta && ofx.descricao.toUpperCase().includes(palavraConta)) {
      score += 25;
      motivos.push(`palavra-chave "${palavraConta}"`);
    }
  }

  // 3) Score de data (até 20pts)
  if (conta.data_vencimento && ofx.data_transacao) {
    const dOfx = new Date(ofx.data_transacao);
    const dConta = new Date(conta.data_vencimento);
    const diasDiff = Math.abs(
      Math.round((dOfx.getTime() - dConta.getTime()) / (1000 * 60 * 60 * 24)),
    );

    if (diasDiff <= 3) {
      score += 20;
      motivos.push("data próxima (≤3d)");
    } else if (diasDiff <= 7) {
      score += 12;
      motivos.push("data próxima (≤7d)");
    } else if (diasDiff <= 15) {
      score += 6;
      motivos.push("data próxima (≤15d)");
    }
  }

  return { score, motivos };
}

/**
 * Encontra a melhor conta candidata pra um OFX, com score.
 * Retorna null se nenhum candidato passou de 50pts.
 */
export function melhorMatch(
  ofx: OfxLite,
  contas: ContaPagarLite[],
): { conta: ContaPagarLite; score: number; motivos: string[] } | null {
  if (contas.length === 0) return null;

  let melhor: { conta: ContaPagarLite; score: number; motivos: string[] } | null = null;

  for (const conta of contas) {
    const { score, motivos } = calcularScoreOfxConta(ofx, conta);
    if (score >= 50 && (!melhor || score > melhor.score)) {
      melhor = { conta, score, motivos };
    }
  }

  return melhor;
}
