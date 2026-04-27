/**
 * Engine de matching para conciliação bancária.
 *
 * Cada movimentação do extrato (OFX) é comparada com contas a pagar/receber
 * que ainda não foram conciliadas. Retorna um score 0-100 indicando quão
 * provável é o match.
 *
 * Critérios:
 * - Valor exato (peso ALTO)
 * - Data próxima (peso médio - tolerância ±7 dias)
 * - Match textual no descritivo (peso médio)
 * - CNPJ no descritivo (peso ALTO quando aparece)
 */

export interface MovimentacaoOFX {
  id: string;
  data_transacao: string; // YYYY-MM-DD
  valor: number; // negativo = saída
  descricao: string;
}

export interface ContaPagarParaMatch {
  id: string;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  fornecedor_cliente: string | null;
  parceiro_razao_social?: string | null;
  parceiro_cnpj?: string | null;
  nf_numero?: string | null;
}

export interface SugestaoMatch {
  movimentacao_id: string;
  conta_pagar_id: string;
  score: number;
  motivos: string[]; // explicações pra UI
}

/**
 * Normaliza texto pra matching: lowercase, remove acentos, remove pontuação.
 */
function normalizar(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9 ]/g, " ") // só letras, números e espaço
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrai dígitos de uma string (útil pra achar CNPJ no descritivo).
 */
function apenasDigitos(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/**
 * Calcula score de match entre uma movimentação e uma conta a pagar.
 * Retorna { score, motivos }
 */
export function calcularScore(
  mov: MovimentacaoOFX,
  conta: ContaPagarParaMatch,
): { score: number; motivos: string[] } {
  const motivos: string[] = [];
  let score = 0;

  // 1. VALOR (peso 50)
  // Movimentação OFX vem com valor negativo pra saída; conta a pagar é valor positivo
  const valorMov = Math.abs(mov.valor);
  const valorConta = Math.abs(conta.valor);
  const diffValor = Math.abs(valorMov - valorConta);
  if (diffValor < 0.01) {
    score += 50;
    motivos.push("Valor exato");
  } else if (diffValor <= 1.0) {
    score += 35;
    motivos.push(`Valor próximo (diferença R$ ${diffValor.toFixed(2)})`);
  } else if (diffValor <= 10.0 && diffValor / valorConta < 0.05) {
    score += 15;
    motivos.push("Valor aproximado");
  } else {
    // Sem match de valor - improvável match razoável
    return { score: 0, motivos: [] };
  }

  // 2. DATA (peso 25)
  const dataReferencia = conta.data_pagamento || conta.data_vencimento;
  if (dataReferencia) {
    const d1 = new Date(mov.data_transacao).getTime();
    const d2 = new Date(dataReferencia).getTime();
    if (!isNaN(d1) && !isNaN(d2)) {
      const diffDias = Math.abs(Math.ceil((d1 - d2) / 86400000));
      if (diffDias === 0) {
        score += 25;
        motivos.push("Data exata");
      } else if (diffDias <= 1) {
        score += 22;
        motivos.push("Data ±1 dia");
      } else if (diffDias <= 3) {
        score += 18;
        motivos.push(`Data ±${diffDias} dias`);
      } else if (diffDias <= 7) {
        score += 10;
        motivos.push(`Data ±${diffDias} dias`);
      } else if (diffDias <= 15) {
        score += 3;
        motivos.push(`Data ±${diffDias} dias (distante)`);
      }
    }
  }

  // 3. CNPJ NO DESCRITIVO (peso 20)
  if (conta.parceiro_cnpj) {
    const cnpjLimpo = apenasDigitos(conta.parceiro_cnpj);
    const descDigitos = apenasDigitos(mov.descricao);
    if (cnpjLimpo.length >= 11 && descDigitos.includes(cnpjLimpo)) {
      score += 20;
      motivos.push("CNPJ no descritivo");
    }
  }

  // 4. NOME DO PARCEIRO/FORNECEDOR (peso 20)
  const nomeParceiro =
    conta.parceiro_razao_social || conta.fornecedor_cliente || "";
  if (nomeParceiro) {
    const descNorm = normalizar(mov.descricao);
    const nomeNorm = normalizar(nomeParceiro);

    // Pega palavras significativas (>3 chars) do nome do parceiro
    const palavrasNome = nomeNorm
      .split(" ")
      .filter((p) => p.length >= 4 && !["ltda", "sociedade", "comercio", "comercial"].includes(p));

    if (palavrasNome.length > 0) {
      const matchesEncontrados = palavrasNome.filter((p) => descNorm.includes(p));
      if (matchesEncontrados.length === palavrasNome.length) {
        score += 20;
        motivos.push("Nome completo no descritivo");
      } else if (matchesEncontrados.length >= 1) {
        const peso = Math.round((matchesEncontrados.length / palavrasNome.length) * 15);
        score += peso;
        motivos.push(`Parte do nome no descritivo (${matchesEncontrados.join(", ")})`);
      }
    }
  }

  // 5. NÚMERO DA NF NO DESCRITIVO (peso 15 - bonus)
  if (conta.nf_numero) {
    const nfDigitos = apenasDigitos(conta.nf_numero);
    if (nfDigitos.length >= 4) {
      const descDigitos = apenasDigitos(mov.descricao);
      if (descDigitos.includes(nfDigitos)) {
        score += 15;
        motivos.push(`NF ${conta.nf_numero} no descritivo`);
      }
    }
  }

  // Cap em 100
  score = Math.min(score, 100);

  return { score, motivos };
}

/**
 * Para cada movimentação, retorna a melhor sugestão de match (se score >= threshold).
 * Cada conta só pode ser usada por UMA movimentação (greedy: maior score primeiro).
 */
export function calcularSugestoes(
  movimentacoes: MovimentacaoOFX[],
  contas: ContaPagarParaMatch[],
  threshold = 50,
): SugestaoMatch[] {
  // Calcula todos os pares possíveis
  const pares: Array<{
    mov_id: string;
    conta_id: string;
    score: number;
    motivos: string[];
  }> = [];

  for (const mov of movimentacoes) {
    // Só processa SAÍDAS (valor negativo) - contas a pagar
    if (mov.valor >= 0) continue;

    for (const conta of contas) {
      const { score, motivos } = calcularScore(mov, conta);
      if (score >= threshold) {
        pares.push({
          mov_id: mov.id,
          conta_id: conta.id,
          score,
          motivos,
        });
      }
    }
  }

  // Ordena por score desc
  pares.sort((a, b) => b.score - a.score);

  // Greedy: escolhe melhores matches sem repetir
  const movsUsadas = new Set<string>();
  const contasUsadas = new Set<string>();
  const sugestoes: SugestaoMatch[] = [];

  for (const p of pares) {
    if (movsUsadas.has(p.mov_id) || contasUsadas.has(p.conta_id)) continue;
    movsUsadas.add(p.mov_id);
    contasUsadas.add(p.conta_id);
    sugestoes.push({
      movimentacao_id: p.mov_id,
      conta_pagar_id: p.conta_id,
      score: p.score,
      motivos: p.motivos,
    });
  }

  return sugestoes;
}

/**
 * Classifica score em níveis pra UI:
 * - exato (95+): match perfeito, pode auto-confirmar
 * - alto (80-94): match forte, sugerir
 * - razoavel (65-79): match razoável, mostrar
 * - fraco (50-64): match fraco, mostrar com aviso
 */
export function classificarScore(score: number): "exato" | "alto" | "razoavel" | "fraco" {
  if (score >= 95) return "exato";
  if (score >= 80) return "alto";
  if (score >= 65) return "razoavel";
  return "fraco";
}
