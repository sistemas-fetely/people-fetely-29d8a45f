/**
 * Detecta agrupamentos N:1 entre contas a pagar e movimentações bancárias.
 * Caso clássico: fatura de cartão de crédito (1 débito no extrato) que cobre
 * várias compras (N contas a pagar) — também serve para SISPAG, lotes de boletos etc.
 */

export type MovInput = {
  id: string;
  data_transacao: string;
  descricao: string;
  valor: number | string;
  conciliado?: boolean | null;
  tipo_pagamento?: string | null;
};

/**
 * Detecta se uma movimentação é fatura de cartão de crédito ou lote de pagamentos.
 * Usa tipo_pagamento (preenchido pelo banco) e padrões na descrição.
 */
function ehFaturaOuLote(mov: MovInput): boolean {
  const tipo = (mov.tipo_pagamento || "").toUpperCase();
  if (tipo.includes("FATURA") || tipo.includes("CARTAO") || tipo.includes("CARTÃO")) {
    return true;
  }
  const desc = (mov.descricao || "").toUpperCase();
  const padroes = [
    /SISPAG/,
    /FAT.*CART/,
    /FATURA.*CART/,
    /PAG.*TIT.*\d{11}/,
    /\b(VISA|MASTER|MASTERCARD|ELO|HIPERCARD|AMEX)\b/,
    /LOTE|REMESSA/,
  ];
  return padroes.some((p) => p.test(desc));
}

export type ContaInput = {
  id: string;
  data_vencimento: string;
  valor: number | string;
  descricao: string;
  fornecedor_cliente: string | null;
  status?: string;
};

export type AgrupamentoSugerido = {
  id: string;
  movimentacao: MovInput;
  contas: ContaInput[];
  valor_movimentacao: number;
  soma_contas: number;
  diferenca_percentual: number;
  score: number;
  motivo: string;
};

export type ValidacaoAgrupamento = {
  valido: boolean;
  soma: number;
  diferenca: number;
  percentual: number;
};

const TOLERANCIA_PCT = 1.0; // 1%
const JANELA_DIAS = 45;

function num(v: number | string): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

function diasEntre(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.abs((da - db) / 86400000);
}

function difPercent(esperado: number, real: number): number {
  if (real === 0) return 100;
  return Math.abs((esperado - real) / real) * 100;
}

/**
 * Subset-sum greedy para encontrar combinação de contas que somam ~ valor alvo
 * dentro da tolerância. Não é ótimo, mas é rápido e bom o suficiente.
 */
function buscarCombinacao(
  candidatas: ContaInput[],
  alvo: number
): ContaInput[] | null {
  const ordenadas = [...candidatas].sort((a, b) => num(b.valor) - num(a.valor));
  const escolhidas: ContaInput[] = [];
  let soma = 0;
  for (const c of ordenadas) {
    const v = num(c.valor);
    if (soma + v <= alvo * (1 + TOLERANCIA_PCT / 100)) {
      escolhidas.push(c);
      soma += v;
    }
    if (difPercent(soma, alvo) <= TOLERANCIA_PCT && escolhidas.length >= 2) {
      return escolhidas;
    }
  }
  return difPercent(soma, alvo) <= TOLERANCIA_PCT && escolhidas.length >= 2
    ? escolhidas
    : null;
}

/**
 * Heurísticas:
 * 1. Movimentação de débito (negativo) que pode ser fatura/lote
 * 2. Procura combinação de contas a pagar com vencimento próximo (±45d) que somam ~ valor
 * 3. Score baseado em: precisão da soma, descrição reconhecida, número de contas
 */
export function encontrarAgrupamentosCartao(
  movs: MovInput[],
  contas: ContaInput[]
): AgrupamentoSugerido[] {
  const sugestoes: AgrupamentoSugerido[] = [];
  const contasUsadas = new Set<string>();

  // Só considerar débitos com valor relevante
  const debitos = movs
    .filter((m) => num(m.valor) < 0 && Math.abs(num(m.valor)) >= 100)
    .sort((a, b) => Math.abs(num(b.valor)) - Math.abs(num(a.valor)));

  for (const mov of debitos) {
    const valorAlvo = Math.abs(num(mov.valor));
    const desc = (mov.descricao || "").toUpperCase();

    // Candidatas: contas não usadas, dentro da janela de datas
    const candidatas = contas.filter((c) => {
      if (contasUsadas.has(c.id)) return false;
      if (c.status === "conciliado" || c.status === "cancelado") return false;
      return diasEntre(mov.data_transacao, c.data_vencimento) <= JANELA_DIAS;
    });

    if (candidatas.length < 2) continue;

    const combinacao = buscarCombinacao(candidatas, valorAlvo);
    if (!combinacao) continue;

    const soma = combinacao.reduce((s, c) => s + num(c.valor), 0);
    const dif = difPercent(valorAlvo, soma);

    // Calcular score
    let score = 60;
    if (dif === 0) score += 20;
    else if (dif <= 0.1) score += 15;
    else if (dif <= 0.5) score += 10;

    let motivo = "soma compatível";
    if (/CARTAO|CARTÃO|FATURA|VISA|MASTER|ELO/.test(desc)) {
      score += 15;
      motivo = "fatura de cartão";
    } else if (/SISPAG|LOTE|REMESSA/.test(desc)) {
      score += 10;
      motivo = "lote de pagamentos";
    }

    if (combinacao.length >= 3) score += 5;

    sugestoes.push({
      id: `agrup_${mov.id}`,
      movimentacao: mov,
      contas: combinacao,
      valor_movimentacao: valorAlvo,
      soma_contas: soma,
      diferenca_percentual: dif,
      score: Math.min(score, 99),
      motivo,
    });

    combinacao.forEach((c) => contasUsadas.add(c.id));
  }

  return sugestoes.sort((a, b) => b.score - a.score);
}

/**
 * Valida em tempo real se uma seleção manual de contas bate com a movimentação.
 */
export function validarAgrupamento(
  contaIds: string[],
  todasContas: ContaInput[],
  valorMovimentacao: number
): ValidacaoAgrupamento {
  const selecionadas = todasContas.filter((c) => contaIds.includes(c.id));
  const soma = selecionadas.reduce((s, c) => s + num(c.valor), 0);
  const valorAbs = Math.abs(valorMovimentacao);
  const diferenca = Math.abs(soma - valorAbs);
  const percentual = valorAbs > 0 ? (diferenca / valorAbs) * 100 : 100;
  return {
    valido: percentual <= TOLERANCIA_PCT,
    soma,
    diferenca,
    percentual,
  };
}
