/**
 * Utils compartilhados entre as abas A pagar / Realizado de Movimentações.
 * Extraídos de CaixaBanco.tsx pra evitar duplicação no split.
 *
 * Doutrina: helpers puros, sem deps de UI. Tipos vivem aqui também.
 */

export type Lancamento = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  pago_em: string | null;
  pago_em_conta_id: string | null;
  conciliado_em: string | null;
  movimentacao_bancaria_id: string | null;
  status_conta_pagar: string;
  status_caixa: "em_aberto" | "pago" | "conciliado";
  fornecedor_cliente: string | null;
  parceiro_id: string | null;
  forma_pagamento_id: string | null;
  categoria_id: string | null;
  unidade: string | null;
  nf_numero: string | null;
  origem_view: "conta_pagar" | "cartao_lancamento";
  origem?: string | null;
  fatura_id: string | null;
  vinculada_cartao?: boolean | null;
  fatura_vencimento?: string | null;
  categoria_inconsistente?: boolean | null;
  inconsistencia_motivo?: string | null;
  categoria_sugerida_ia?: boolean | null;
};

export type ContaBancariaLite = {
  id: string;
  nome_exibicao: string;
  cor: string | null;
};

/**
 * Status visual = espelho do status decisório de Contas a Pagar.
 * Lançamentos de cartão usam derivação simples.
 */
export function statusVisual(l: Lancamento): string {
  if (l.origem_view === "cartao_lancamento") {
    if (l.movimentacao_bancaria_id || l.status_caixa === "conciliado") return "paga";
    if (l.status_caixa === "pago") return "paga";
    return "aguardando_pagamento";
  }
  return l.status_conta_pagar || "aberto";
}

/**
 * Conta a pagar é "atrasada" quando vencimento passou e não foi paga/cancelada.
 */
export function isAtrasada(l: Lancamento): boolean {
  if (!l.data_vencimento) return false;
  const status = statusVisual(l);
  if (status === "paga" || status === "cancelado") return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(l.data_vencimento + "T00:00:00");
  return venc < hoje;
}

/**
 * Dias de atraso (positivo). 0 ou null se não atrasada.
 */
export function diasAtraso(l: Lancamento): number {
  if (!isAtrasada(l) || !l.data_vencimento) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(l.data_vencimento + "T00:00:00");
  const diff = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function getQualidadeNF(
  m: { id: string },
  nfMap?: Map<string, string | null>,
): { cor: "verde" | "vermelho"; motivo: string } {
  const temNF = nfMap?.has(m.id) === true;
  return temNF
    ? { cor: "verde", motivo: "NF vinculada" }
    : { cor: "vermelho", motivo: "Sem NF anexada" };
}

export function getQualidadeCategoria(
  m: {
    id: string;
    categoria_id: string | null;
    categoria_sugerida_ia?: boolean | null;
  },
  nfMap?: Map<string, string | null>,
): {
  cor: "verde" | "amarelo" | "vermelho";
  motivo: string;
  temSugestaoIA?: boolean;
} {
  if (!m.categoria_id) {
    if (m.categoria_sugerida_ia === true) {
      return {
        cor: "amarelo",
        motivo: "Sugestão IA pendente — clique pra revisar",
        temSugestaoIA: true,
      };
    }
    return { cor: "vermelho", motivo: "Sem categoria" };
  }
  const categoriaDaNF = nfMap?.get(m.id);
  if (categoriaDaNF === undefined) {
    return { cor: "amarelo", motivo: "Tem categoria mas não validada por NF" };
  }
  if (categoriaDaNF === null) {
    return { cor: "verde", motivo: "Categoria OK (NF sem categoria pra comparar)" };
  }
  if (m.categoria_id !== categoriaDaNF) {
    return {
      cor: "vermelho",
      motivo: "Categoria diverge da NF — edite na NF pra resolver",
    };
  }
  return { cor: "verde", motivo: "Categoria validada por NF" };
}

export function getQualidadeVinculado(m: {
  origem_view?: string | null;
  vinculada_cartao?: boolean | null;
  movimentacao_bancaria_id?: string | null;
}): { cor: "verde" | "vermelho"; motivo: string } {
  if (m.vinculada_cartao || m.origem_view === "cartao_lancamento") {
    return { cor: "verde", motivo: "Vinculado a lançamento de cartão" };
  }
  if (m.movimentacao_bancaria_id) {
    return { cor: "verde", motivo: "Vinculado a movimentação bancária" };
  }
  return { cor: "vermelho", motivo: "Sem vínculo de origem" };
}

export function getQualidadeConciliado(m: {
  conciliado_em?: string | null;
  status_caixa?: string;
}): { cor: "verde" | "vermelho"; motivo: string } {
  if (m.conciliado_em || m.status_caixa === "conciliado") {
    return { cor: "verde", motivo: "Conciliado — bateu com extrato bancário" };
  }
  return { cor: "vermelho", motivo: "Não conciliado bancariamente" };
}

export function corClass(cor: "verde" | "amarelo" | "vermelho"): string {
  if (cor === "verde") return "text-emerald-600";
  if (cor === "amarelo") return "text-amber-500";
  return "text-red-500";
}
