/**
 * Conciliação automática: cruza movimentações bancárias (extrato) com
 * contas a pagar (comprometido). Score-based matching no frontend.
 *
 * Critérios:
 *  - Valor (50pts exato, 45 ±0,50, 30 ±5,00, 15 ±50,00). Acima disso descarta.
 *  - Data (30pts exata, 20 ±3d, 10 ±7d).
 *  - CNPJ na descrição do extrato (35pts) — extraído inclusive de SISPAG/PAG TIT.
 *  - Nome do fornecedor na descrição (15pts).
 *
 * Threshold:
 *  - >= 60 = alta confiança (sugere automaticamente)
 *  - 40–59 = sugestão (mostra mas não auto-concilia)
 *  - < 40  = não sugere
 */

export interface MovimentacaoMatch {
  id: string;
  data_transacao: string;
  descricao: string;
  valor: number;
  conciliado: boolean | null;
}

export interface ContaPagarMatch {
  id: string;
  data_vencimento: string;
  valor: number;
  status: string;
  descricao: string;
  fornecedor_cliente: string | null;
  nf_numero: string | null;
  nf_cnpj_emitente: string | null;
  _jaMatcheado?: boolean;
}

export interface MatchResult {
  movimentacao_id: string;
  conta_pagar_id: string;
  score: number;
  motivo: string;
  mov: MovimentacaoMatch;
  cp: ContaPagarMatch;
}

/**
 * Extrai CNPJ (12 primeiros dígitos = raiz + filial) do memo de uma transação
 * bancária. Reconhece padrões comuns:
 *  - Itaú SISPAG: "SISPAG DIVERSOS PAG TIT 039395504000" (12 dígitos finais)
 *  - TED com CNPJ: "...LTDA 17.253.375/0001-66"
 *  - PIX/qualquer com 14 dígitos seguidos
 */
export function extrairCnpjDoMemo(memo: string | null | undefined): string | null {
  if (!memo) return null;

  // Itaú SISPAG / PAG TIT — 12 dígitos finais = CNPJ sem DV
  const matchSispag = memo.match(/PAG\s*TIT\s+(\d{12,14})/i);
  if (matchSispag) return matchSispag[1].substring(0, 12);

  // CNPJ formatado: 99.999.999/9999-99
  const matchCnpj = memo.match(/(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})/);
  if (matchCnpj) return matchCnpj[1].replace(/[^\d]/g, "").substring(0, 12);

  // 14 dígitos seguidos
  const matchDigits = memo.match(/\b(\d{14})\b/);
  if (matchDigits) return matchDigits[1].substring(0, 12);

  return null;
}

export function encontrarMatches(
  movimentacoes: MovimentacaoMatch[],
  contasPagar: ContaPagarMatch[]
): MatchResult[] {
  const matches: MatchResult[] = [];
  const cps = contasPagar.map((c) => ({ ...c }));

  for (const mov of movimentacoes) {
    if (mov.conciliado) continue;
    if (Number(mov.valor) >= 0) continue; // só débitos (pagamentos)

    const valorAbs = Math.abs(Number(mov.valor));
    const cnpjExtrato = extrairCnpjDoMemo(mov.descricao);
    let melhorMatch: MatchResult | null = null;
    let melhorScore = 0;

    for (const cp of cps) {
      if (cp.status === "conciliado" || cp.status === "cancelado") continue;
      if (cp._jaMatcheado) continue;

      let score = 0;
      const motivos: string[] = [];

      // Valor — peso aumentado, com tolerância maior pra juros/multas
      const diffValor = Math.abs(valorAbs - Number(cp.valor));
      if (diffValor === 0) {
        score += 50;
        motivos.push("valor exato");
      } else if (diffValor <= 0.5) {
        score += 45;
        motivos.push("valor aprox");
      } else if (diffValor <= 5.0) {
        score += 30;
        motivos.push("valor próximo");
      } else if (diffValor <= 50.0) {
        score += 15;
        motivos.push("valor ±R$50");
      } else {
        continue;
      }

      // Data
      if (mov.data_transacao && cp.data_vencimento) {
        const dataMov = new Date(mov.data_transacao + "T00:00:00");
        const dataVenc = new Date(cp.data_vencimento + "T00:00:00");
        const diffDias = Math.abs(
          Math.round((dataMov.getTime() - dataVenc.getTime()) / 86400000)
        );
        if (diffDias === 0) {
          score += 30;
          motivos.push("data exata");
        } else if (diffDias <= 3) {
          score += 20;
          motivos.push(`data ±${diffDias}d`);
        } else if (diffDias <= 7) {
          score += 10;
          motivos.push(`data ±${diffDias}d`);
        }
      }

      // CNPJ — usa extração + match direto na descrição
      if (cp.nf_cnpj_emitente) {
        const cnpjCP = cp.nf_cnpj_emitente.replace(/[^\d]/g, "").substring(0, 12);
        if (cnpjExtrato && cnpjCP && cnpjExtrato === cnpjCP) {
          score += 35;
          motivos.push("CNPJ");
        } else if (mov.descricao && cnpjCP.length >= 8) {
          const descLower = mov.descricao.toLowerCase();
          if (descLower.includes(cnpjCP) || descLower.includes(cnpjCP.substring(0, 8))) {
            score += 25;
            motivos.push("CNPJ parcial");
          }
        }
      }

      // Nome do fornecedor
      if (cp.fornecedor_cliente && mov.descricao) {
        const partes = cp.fornecedor_cliente.toLowerCase().split(/\s+/);
        const primeiro = partes[0] || "";
        if (primeiro.length > 3 && mov.descricao.toLowerCase().includes(primeiro)) {
          score += 15;
          motivos.push("nome");
        }
      }

      if (score > melhorScore) {
        melhorScore = score;
        melhorMatch = {
          movimentacao_id: mov.id,
          conta_pagar_id: cp.id,
          score,
          motivo: motivos.join(" + "),
          mov,
          cp,
        };
      }
    }

    if (melhorMatch && melhorScore >= 40) {
      const cpIdx = cps.findIndex((c) => c.id === melhorMatch!.conta_pagar_id);
      if (cpIdx >= 0) cps[cpIdx]._jaMatcheado = true;
      matches.push(melhorMatch);
    }
  }

  return matches;
}
