/**
 * Conciliação automática: cruza movimentações bancárias (extrato) com
 * contas a pagar (comprometido). Score-based matching no frontend.
 *
 * Critérios:
 *  - Valor (50pts exato, 40 ±0,50, 20 ±5,00). Acima disso descarta.
 *  - Data (30pts exata, 20 ±3d, 10 ±7d).
 *  - CNPJ na descrição do extrato (20pts).
 *  - Nome do fornecedor na descrição (15pts).
 *
 * Threshold:
 *  - >= 70 = alta confiança (sugere automaticamente)
 *  - 50–69 = sugestão (mostra mas não auto-concilia)
 *  - < 50  = não sugere
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

export function encontrarMatches(
  movimentacoes: MovimentacaoMatch[],
  contasPagar: ContaPagarMatch[]
): MatchResult[] {
  const matches: MatchResult[] = [];
  // Cópia mutável para marcar _jaMatcheado sem afetar o array original
  const cps = contasPagar.map((c) => ({ ...c }));

  for (const mov of movimentacoes) {
    if (mov.conciliado) continue;
    if (Number(mov.valor) >= 0) continue; // só débitos (pagamentos)

    const valorAbs = Math.abs(Number(mov.valor));
    let melhorMatch: MatchResult | null = null;
    let melhorScore = 0;

    for (const cp of cps) {
      if (cp.status === "conciliado" || cp.status === "cancelado") continue;
      if (cp._jaMatcheado) continue;

      let score = 0;
      const motivos: string[] = [];

      // Valor
      const diffValor = Math.abs(valorAbs - Number(cp.valor));
      if (diffValor === 0) {
        score += 50;
        motivos.push("valor exato");
      } else if (diffValor <= 0.5) {
        score += 40;
        motivos.push("valor aprox");
      } else if (diffValor <= 5.0) {
        score += 20;
        motivos.push("valor próximo");
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

      // CNPJ na descrição
      if (cp.nf_cnpj_emitente && mov.descricao) {
        const descLower = mov.descricao.toLowerCase();
        const cnpjClean = cp.nf_cnpj_emitente.replace(/[^\d]/g, "");
        if (
          cnpjClean.length >= 8 &&
          (descLower.includes(cnpjClean) ||
            descLower.includes(cnpjClean.substring(0, 8)))
        ) {
          score += 20;
          motivos.push("CNPJ");
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

    if (melhorMatch && melhorScore >= 50) {
      const cpIdx = cps.findIndex((c) => c.id === melhorMatch!.conta_pagar_id);
      if (cpIdx >= 0) cps[cpIdx]._jaMatcheado = true;
      matches.push(melhorMatch);
    }
  }

  return matches;
}
