/**
 * Parser CSV Safra
 * Tenta detectar colunas comuns por nome (header).
 */

import Papa from "papaparse";
import type { MovimentacaoOFX } from "./ofx-parser";

export interface CsvSafraParsed {
  movimentacoes: MovimentacaoOFX[];
}

function parseValor(s: string | null | undefined): number {
  if (!s) return 0;
  const clean = String(s).trim().replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

function parseData(s: string | null | undefined): string | null {
  if (!s) return null;
  const partes = String(s).trim().split("/");
  if (partes.length !== 3) return null;
  return `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
}

function pick(row: Record<string, string>, names: string[]): string {
  for (const n of names) {
    if (row[n] != null && row[n] !== "") return row[n];
  }
  return "";
}

export function parseCsvSafra(csvText: string): CsvSafraParsed {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: ";",
  });

  const movimentacoes: MovimentacaoOFX[] = [];
  const rows = (result.data || []) as Record<string, string>[];

  for (const row of rows) {
    const dataStr = pick(row, ["Data", "Data Lançamento", "Data Movimento", "Data lançamento"]);
    const descricao = pick(row, ["Descrição", "Lançamento", "Histórico", "Descricao"]);
    const valorStr = pick(row, ["Valor", "Valor (R$)", "Valor R$"]);
    const saldoStr = pick(row, ["Saldo", "Saldo (R$)", "Saldo R$"]);

    const data = parseData(dataStr);
    const valor = parseValor(valorStr);

    if (!data || valor === 0) continue;

    movimentacoes.push({
      data_transacao: data,
      descricao: (descricao || "Sem descrição").trim(),
      valor,
      tipo: valor >= 0 ? "credito" : "debito",
      id_transacao_banco: null,
      saldo_pos_transacao: saldoStr ? parseValor(saldoStr) : null,
    });
  }

  return { movimentacoes };
}
