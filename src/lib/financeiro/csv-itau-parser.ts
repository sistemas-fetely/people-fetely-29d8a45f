/**
 * Parser CSV Itaú
 * Formato típico: Data;Lançamento;Ag./Origem;Valor;Saldo
 */

import Papa from "papaparse";
import type { MovimentacaoOFX } from "./ofx-parser";

export interface CsvItauParsed {
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

export function parseCsvItau(csvText: string): CsvItauParsed {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
    delimiter: ";",
  });

  const movimentacoes: MovimentacaoOFX[] = [];
  const rows = (result.data || []) as string[][];

  // Pular header
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const dataStr = (row[0] || "").trim();
    const descricao = (row[1] || "").trim();
    // Itaú costuma ter Data | Lançamento | Valor | Saldo (4 cols) OU Data | Lançamento | Ag/Origem | Valor | Saldo (5 cols)
    const valorStr = row.length >= 5 ? row[3] : row[2];
    const saldoStr = row.length >= 5 ? row[4] : row[3];

    const data = parseData(dataStr);
    const valor = parseValor(valorStr);

    if (!data || valor === 0) continue;

    movimentacoes.push({
      data_transacao: data,
      descricao: descricao || "Sem descrição",
      valor,
      tipo: valor >= 0 ? "credito" : "debito",
      id_transacao_banco: null,
      saldo_pos_transacao: saldoStr ? parseValor(saldoStr) : null,
    });
  }

  return { movimentacoes };
}
