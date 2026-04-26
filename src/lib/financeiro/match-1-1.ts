/**
 * Match 1:1 (data + valor 100%) para movimentações que NÃO são fatura de cartão.
 * Retorna APENAS matches exatos (diferença ≤ R$ 0.01).
 */

export interface Mov1to1 {
  id: string;
  data_transacao: string;
  descricao: string;
  valor: number;
  tipo_pagamento: string | null;
  conciliado: boolean | null;
}

export interface Conta1to1 {
  id: string;
  data_vencimento: string;
  valor: number;
  status: string;
  descricao: string;
  fornecedor_cliente: string | null;
  forma_pagamento: string | null;
  data_pagamento?: string | null;
}

export interface Match1to1 {
  movimentacao_id: string;
  conta_id: string;
  score: 100;
  motivo: "Match exato (data + valor)";
}

function ehFaturaCartao(mov: Mov1to1): boolean {
  const desc = (mov.descricao || "").toUpperCase();
  const tipo = (mov.tipo_pagamento || "").toUpperCase();
  if (tipo.includes("FATURA") || tipo.includes("CARTAO")) return true;
  if (desc.includes("SISPAG")) return true;
  if (/FAT.*CART|FATURA.*CART/.test(desc)) return true;
  return false;
}

export function encontrarMatches1to1(
  movimentacoes: Mov1to1[],
  contasPagar: Conta1to1[],
): Match1to1[] {
  const matches: Match1to1[] = [];

  // Contas elegíveis: NÃO cartão e NÃO conciliadas
  const contasNaoCartao = contasPagar.filter((c) => {
    const forma = (c.forma_pagamento || "").toUpperCase();
    if (forma.includes("CARTAO") || forma.includes("CARTÃO") || forma.includes("CREDITO") || forma.includes("CRÉDITO")) {
      return false;
    }
    return c.status !== "conciliado" && c.status !== "cancelado";
  });

  // Movs elegíveis: NÃO conciliadas e NÃO fatura de cartão
  const movsNaoCartao = movimentacoes.filter(
    (m) => !m.conciliado && !ehFaturaCartao(m),
  );

  // Índice por (data + valor)
  const contasPorDataValor = new Map<string, Conta1to1[]>();
  for (const conta of contasNaoCartao) {
    const valorAbs = Math.abs(Number(conta.valor));
    const data = conta.data_pagamento || conta.data_vencimento;
    if (!data) continue;
    const chave = `${data}|${valorAbs.toFixed(2)}`;
    if (!contasPorDataValor.has(chave)) contasPorDataValor.set(chave, []);
    contasPorDataValor.get(chave)!.push(conta);
  }

  // Reserva contas já matcheadas para evitar duplicidade
  const contasUsadas = new Set<string>();

  for (const mov of movsNaoCartao) {
    const valorAbs = Math.abs(Number(mov.valor));
    const data = mov.data_transacao;
    if (!data) continue;

    const chave = `${data}|${valorAbs.toFixed(2)}`;
    const candidatas = (contasPorDataValor.get(chave) || []).filter(
      (c) => !contasUsadas.has(c.id),
    );

    // Match perfeito: exatamente 1 candidata
    if (candidatas.length === 1) {
      const conta = candidatas[0];
      const dif = Math.abs(valorAbs - Math.abs(Number(conta.valor)));
      if (dif <= 0.01) {
        matches.push({
          movimentacao_id: mov.id,
          conta_id: conta.id,
          score: 100,
          motivo: "Match exato (data + valor)",
        });
        contasUsadas.add(conta.id);
      }
    }
  }

  return matches;
}
