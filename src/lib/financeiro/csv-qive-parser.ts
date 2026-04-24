/**
 * Parser de CSV exportado do Qive (relatório avançado)
 * Suporta dois formatos: resumo (1 linha por NF) e detalhado (1 linha por item).
 */

import type { ItemNFParsed, NFParsed } from "./types";
import { limparCnpj, mapearMeioPagamentoCsv, parseDataBR, parseValorBR } from "./parsers";

type CsvRow = Record<string, string>;

export function isCsvDetalhado(rows: CsvRow[]): boolean {
  if (!rows || rows.length === 0) return false;
  const headers = Object.keys(rows[0]);
  return headers.some((h) => h.includes("[Item]"));
}

export function processarCsvResumo(rows: CsvRow[]): NFParsed[] {
  return rows
    .map((row) => mapResumoRow(row))
    .filter((n): n is NFParsed => !!n && !!n.fornecedor_nome);
}

export function processarCsvDetalhado(rows: CsvRow[]): NFParsed[] {
  const grupos = new Map<string, NFParsed>();

  rows.forEach((row) => {
    const chave = (row["Chave de Acesso"] || "").trim();
    const numero = (row["Número"] || "").trim();
    const cnpj = limparCnpj(row["CNPJ Emitente"] || "");
    // Chave de agrupamento: chave de acesso, ou fallback CNPJ+número
    const key = chave || `${cnpj}-${numero}`;
    if (!key) return;

    let nf = grupos.get(key);
    if (!nf) {
      nf = {
        nf_chave_acesso: chave || undefined,
        nf_numero: numero,
        nf_serie: (row["Série"] || "").trim(),
        nf_data_emissao: parseDataBR(row["Data Emissão"]),
        nf_natureza_operacao: (row["Natureza Operação"] || "").trim(),
        nf_cfop: (row["CFOPs da Nota"] || "").trim(),
        fornecedor_nome: (row["Nome PJ Emitente"] || "").trim(),
        fornecedor_cnpj: cnpj,
        valor: parseValorBR(row["Valor Total da Nota"]),
        nf_valor_produtos: parseValorBR(row["Valor Total Produtos"]),
        nf_valor_impostos: parseValorBR(
          row["Valor aproximado total de tributos federais, estaduais e municipais"]
        ),
        meio_pagamento: mapearMeioPagamentoCsv(row["Meio de pagamento"]),
        status_nf: (row["Status"] || "").trim(),
        itens: [],
        _source: "csv_qive",
      };
      grupos.set(key, nf);
    }

    const item: ItemNFParsed = {
      codigo_produto: (row["[Item] Código"] || "").trim(),
      descricao: (row["[Item] Descrição"] || "").trim(),
      ncm: (row["[Item] NCM"] || "").trim(),
      cfop: (row["[Item] CFOP"] || "").trim(),
      unidade: (row["[Item] Unidade"] || "").trim(),
      quantidade: parseValorBR(row["[Item] Quantidade"]),
      valor_unitario: parseValorBR(row["[Item] Valor Unitário"]),
      valor_total: parseValorBR(row["[Item] Valor Total Bruto"]),
      valor_icms: parseValorBR(row["[Item] Valor ICMS"]),
      valor_pis: parseValorBR(row["[Item] Valor PIS"]),
      valor_cofins: parseValorBR(row["[Item] Valor COFINS"]),
    };
    if (item.descricao) {
      nf.itens!.push(item);
    }
  });

  // Para cada NF, definir NCM principal (item de maior valor)
  const result: NFParsed[] = [];
  grupos.forEach((nf) => {
    if (nf.itens && nf.itens.length > 0) {
      const principal = nf.itens.reduce((a, b) =>
        (a.valor_total || 0) > (b.valor_total || 0) ? a : b
      );
      nf.nf_ncm = principal.ncm;
    }
    result.push(nf);
  });
  return result.filter((n) => !!n.fornecedor_nome);
}

function mapResumoRow(row: CsvRow): NFParsed | null {
  const fornecedor = (row["Nome PJ Emitente"] || "").trim();
  if (!fornecedor) return null;
  return {
    nf_chave_acesso: (row["Chave de Acesso"] || "").trim() || undefined,
    nf_numero: (row["Número"] || "").trim(),
    nf_serie: (row["Série"] || "").trim(),
    nf_data_emissao: parseDataBR(row["Data Emissão"]),
    nf_natureza_operacao: (row["Natureza Operação"] || "").trim(),
    nf_cfop: (row["CFOPs da Nota"] || "").trim(),
    fornecedor_nome: fornecedor,
    fornecedor_cnpj: limparCnpj(row["CNPJ Emitente"] || ""),
    valor: parseValorBR(row["Valor Total da Nota"]),
    nf_valor_produtos: parseValorBR(row["Valor Total Produtos"]),
    nf_valor_impostos: parseValorBR(
      row["Valor aproximado total de tributos federais, estaduais e municipais"]
    ),
    meio_pagamento: mapearMeioPagamentoCsv(row["Meio de pagamento"]),
    status_nf: (row["Status"] || "").trim(),
    _source: "csv_qive",
  };
}
