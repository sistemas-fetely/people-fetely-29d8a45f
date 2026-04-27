/**
 * Parser de fatura de cartão de crédito.
 * Atualmente suporta CSV do Itaú (formato com 25 colunas, separador ;).
 *
 * O parser PDF é feito via IA (edge function parse-fatura-cartao-pdf).
 *
 * Output: lista de lançamentos normalizados prontos pra revisão antes de salvar.
 */

export interface LancamentoFaturaParsed {
  data_compra: string;          // YYYY-MM-DD
  descricao: string;
  valor: number;                // positivo = compra, negativo = estorno
  parcela_atual: number | null;
  parcela_total: number | null;
  tipo: "compra" | "estorno" | "iof" | "encargo" | "pagamento" | "taxa" | "outro";
  natureza: "NACIONAL" | "INTERNACIONAL";
  moeda: string;                // BRL, USD, EUR
  valor_original: number | null;
  cotacao: number | null;
  estabelecimento_descricao: string | null;
  estabelecimento_local: string | null;
  ramo_estabelecimento: string | null;
  num_autorizacao: string | null;
  cnpj_estabelecimento: string | null;
  linha_original_csv: string;
  numero_cartao_mascarado: string | null; // identifica o portador
}

export interface FaturaParsed {
  formato: "csv_itau" | "pdf_itau" | "pdf_outro";
  cartao_numero_final: string | null; // últimos dígitos
  data_vencimento: string | null;
  data_emissao: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  valor_total: number | null;
  valor_pagamento_anterior: number | null;
  valor_saldo_atraso: number | null;
  numero_documento: string | null;
  lancamentos: LancamentoFaturaParsed[];
  alertas: string[]; // avisos não fatais
}

/**
 * Detecta se a string é o CSV do Itaú pelo cabeçalho.
 */
export function isCsvItau(conteudo: string): boolean {
  const primeiraLinha = conteudo.split("\n")[0]?.toUpperCase() || "";
  return (
    primeiraLinha.includes("DATA;") &&
    primeiraLinha.includes("NOME DO PORTADOR") &&
    primeiraLinha.includes("NUMERO DO CARTAO") &&
    primeiraLinha.includes("VALOR EM REAIS")
  );
}

/**
 * Parser CSV Itaú.
 * Formato: 25 colunas separadas por ; UTF-8.
 */
export function parseCsvItau(conteudo: string): FaturaParsed {
  const linhas = conteudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (linhas.length < 2) {
    throw new Error("CSV vazio ou sem dados");
  }

  const cabecalho = linhas[0].split(";").map((c) => c.trim().toUpperCase());

  // Mapa de índices das colunas
  const idx = (nome: string) => cabecalho.findIndex((c) => c === nome);
  const colData = idx("DATA");
  const colDescricao = idx("DESCRICAO");
  const colCredDeb = idx("CRED/DEB");
  const colTipo = idx("TIPO DA TRANSACAO");
  const colMoeda = idx("COD MOEDA");
  const colValorTransacao = idx("VALOR DA TRANSACAO");
  const colValorReais = idx("VALOR EM REAIS");
  const colNumCartao = idx("NUMERO DO CARTAO");
  const colRamo = idx("RAMO DO ESTAB");
  const colLocal = idx("LOCAL");
  const colAutorizacao = idx("NUMERO DA AUTORIZACAO");
  const colCnpj = idx("CNPJ");
  const colCotacao = idx("COTACAO DO DOLAR EM REAL");

  if (colData < 0 || colDescricao < 0 || colValorReais < 0) {
    throw new Error("CSV sem colunas esperadas (DATA, DESCRICAO, VALOR EM REAIS)");
  }

  const lancamentos: LancamentoFaturaParsed[] = [];
  let cartaoFinal: string | null = null;
  let dataMin: string | null = null;
  let dataMax: string | null = null;

  for (let i = 1; i < linhas.length; i++) {
    const colunas = linhas[i].split(";");
    if (colunas.length < cabecalho.length - 5) continue; // linha quebrada

    const dataBR = (colunas[colData] || "").trim();
    const data = converterDataBR(dataBR);
    if (!data) continue;

    const descricaoRaw = (colunas[colDescricao] || "").trim();
    if (!descricaoRaw) continue;

    const credDeb = (colunas[colCredDeb] || "").trim().toUpperCase();
    const valorRaw = (colunas[colValorReais] || "0").trim();
    let valor = parseFloat(valorRaw.replace(",", "."));
    if (isNaN(valor)) valor = 0;

    // CRED/DEB: D = débito (compra/positivo), C = crédito (estorno/negativo)
    // O valor já vem com sinal correto no CSV: positivo pra D, negativo pra C
    // Mas vou padronizar: estornos viram negativos.

    const tipoTransacaoCsv = (colunas[colTipo] || "").trim().toUpperCase();
    const natureza: "NACIONAL" | "INTERNACIONAL" =
      tipoTransacaoCsv === "INTERNACIONAL" ? "INTERNACIONAL" : "NACIONAL";

    const moeda = (colunas[colMoeda] || "BRL").trim() || "BRL";

    // Detectar parcela "Nespresso 02/10"
    const { descricaoLimpa, parcela_atual, parcela_total } = extrairParcela(descricaoRaw);

    // Tipo
    let tipo: LancamentoFaturaParsed["tipo"] = "compra";
    if (credDeb === "C" || valor < 0) tipo = "estorno";
    if (descricaoRaw.toUpperCase().includes("IOF")) tipo = "iof";
    if (descricaoRaw.toUpperCase().includes("PAGAMENTO EFETUADO")) tipo = "pagamento";
    if (descricaoRaw.toUpperCase().includes("JUROS") || descricaoRaw.toUpperCase().includes("MULTA"))
      tipo = "encargo";

    // Internacional: valor original e cotação
    let valor_original: number | null = null;
    let cotacao: number | null = null;
    if (natureza === "INTERNACIONAL") {
      const valorTransacaoRaw = (colunas[colValorTransacao] || "0").trim();
      const v = parseFloat(valorTransacaoRaw.replace(",", "."));
      if (!isNaN(v) && v !== 0) valor_original = v;
      const cotRaw = (colunas[colCotacao] || "0").trim();
      const c = parseFloat(cotRaw.replace(",", "."));
      if (!isNaN(c) && c > 0) cotacao = c;
    }

    // Cartão (final)
    const numCartaoRaw = (colunas[colNumCartao] || "").trim();
    const finalCartao = numCartaoRaw.match(/(\d{4})$/)?.[1] || null;
    if (finalCartao && !cartaoFinal) cartaoFinal = finalCartao;

    // Atualizar período
    if (!dataMin || data < dataMin) dataMin = data;
    if (!dataMax || data > dataMax) dataMax = data;

    lancamentos.push({
      data_compra: data,
      descricao: descricaoLimpa,
      valor: credDeb === "C" ? -Math.abs(valor) : Math.abs(valor),
      parcela_atual,
      parcela_total,
      tipo,
      natureza,
      moeda,
      valor_original,
      cotacao,
      estabelecimento_descricao: descricaoLimpa,
      estabelecimento_local: (colunas[colLocal] || "").trim() || null,
      ramo_estabelecimento: (colunas[colRamo] || "").trim() || null,
      num_autorizacao: (colunas[colAutorizacao] || "").trim() || null,
      cnpj_estabelecimento: (colunas[colCnpj] || "").trim() || null,
      linha_original_csv: linhas[i],
      numero_cartao_mascarado: numCartaoRaw || null,
    });
  }

  // Soma do total
  const valorTotalCalculado = lancamentos
    .filter((l) => l.tipo !== "pagamento") // pagamentos não somam pra fatura nova
    .reduce((s, l) => s + l.valor, 0);

  const alertas: string[] = [];
  if (lancamentos.length === 0) {
    alertas.push("Nenhum lançamento foi extraído do CSV");
  }

  return {
    formato: "csv_itau",
    cartao_numero_final: cartaoFinal,
    data_vencimento: null, // CSV não traz, usuário escolhe
    data_emissao: null,
    periodo_inicio: dataMin,
    periodo_fim: dataMax,
    valor_total: valorTotalCalculado, // calculado a partir dos lançamentos
    valor_pagamento_anterior: null,
    valor_saldo_atraso: null,
    numero_documento: null,
    lancamentos,
    alertas,
  };
}

/**
 * "Nespresso 02/10" → { descricaoLimpa: "Nespresso", parcela_atual: 2, parcela_total: 10 }
 * "ANTHROPIC: CLAUDE TEAM" → { descricaoLimpa: "ANTHROPIC: CLAUDE TEAM", parcela_atual: null, parcela_total: null }
 */
function extrairParcela(desc: string): {
  descricaoLimpa: string;
  parcela_atual: number | null;
  parcela_total: number | null;
} {
  const m = desc.match(/^(.+?)\s+(\d{1,2})\/(\d{1,2})\s*$/);
  if (m) {
    return {
      descricaoLimpa: m[1].trim(),
      parcela_atual: parseInt(m[2]),
      parcela_total: parseInt(m[3]),
    };
  }
  return { descricaoLimpa: desc.trim(), parcela_atual: null, parcela_total: null };
}

/**
 * "12/02/2026" → "2026-02-12"
 */
function converterDataBR(dataBR: string): string | null {
  const m = dataBR.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  let [, dd, mm, yy] = m;
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}
