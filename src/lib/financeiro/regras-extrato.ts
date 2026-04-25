/**
 * Regras fixas de auto-categorização para transações puramente bancárias.
 * Essas transações nunca vão conciliar com contas a pagar — são geradas pelo
 * próprio banco (rendimentos, tarifas, IOF, etc) e devem ser categorizadas
 * automaticamente como lançamentos no plano de contas.
 */

export interface RegraExtrato {
  padrao: RegExp;
  categoria_codigo: string;
  descricao_limpa: string;
  tipo: "receita" | "despesa";
  auto_criar: boolean;
}

export const REGRAS_EXTRATO_BANCO: RegraExtrato[] = [
  {
    padrao: /^RENDIMENTOS?\s+REND/i,
    categoria_codigo: "04.02",
    descricao_limpa: "Rendimento aplicação automática",
    tipo: "receita",
    auto_criar: true,
  },
  {
    padrao: /^TAR\s+MANUT\s+CONTA/i,
    categoria_codigo: "05.07.02",
    descricao_limpa: "Tarifa manutenção conta",
    tipo: "despesa",
    auto_criar: true,
  },
  {
    padrao: /^TAR\s+BLOQUETO/i,
    categoria_codigo: "05.07.02",
    descricao_limpa: "Tarifa boleto",
    tipo: "despesa",
    auto_criar: true,
  },
  {
    padrao: /^TAR\s+PIX/i,
    categoria_codigo: "05.07.02",
    descricao_limpa: "Tarifa PIX",
    tipo: "despesa",
    auto_criar: true,
  },
  {
    padrao: /^TAR\s+SISPAG/i,
    categoria_codigo: "05.07.02",
    descricao_limpa: "Tarifa SISPAG",
    tipo: "despesa",
    auto_criar: true,
  },
  {
    padrao: /^EST\s+TAR\s+MANUTENCAO/i,
    categoria_codigo: "05.07.02",
    descricao_limpa: "Estorno tarifa manutenção",
    tipo: "receita",
    auto_criar: true,
  },
  {
    padrao: /^SISPAG\s+TRIBUTOS\s+PM/i,
    categoria_codigo: "08.03.01",
    descricao_limpa: "Taxa de funcionamento municipal",
    tipo: "despesa",
    auto_criar: true,
  },
  {
    padrao: /^TED\s+RECEBIDA.*LMJPAR/i,
    categoria_codigo: "02.01",
    descricao_limpa: "Aporte do sócio (LMJPAR)",
    tipo: "receita",
    auto_criar: true,
  },
  {
    padrao: /^IOF/i,
    categoria_codigo: "05.07.03",
    descricao_limpa: "IOF",
    tipo: "despesa",
    auto_criar: true,
  },
];

export function identificarTransacaoBancaria(
  descricao: string | null | undefined
): RegraExtrato | null {
  if (!descricao) return null;
  for (const regra of REGRAS_EXTRATO_BANCO) {
    if (regra.padrao.test(descricao)) return regra;
  }
  return null;
}
