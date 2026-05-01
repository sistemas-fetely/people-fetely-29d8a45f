import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

/**
 * Exporta extrato de fatura de cartão como PDF.
 *
 * Doutrina cravada por Flavio (29/04/2026):
 * - Uso interno (auditoria + arquivo)
 * - Simples: gera PDF e abre/baixa direto
 * - Sem tela de preview, sem rota nova
 *
 * Padrão Fetely (verde Fetely #1a3d2b, fonte serif compatível).
 */

type FaturaInput = {
  id: string;
  data_vencimento: string;
  data_fechamento?: string | null;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  valor_total: number;
  status: string;
  observacao?: string | null;
  conta_bancaria?: { nome_exibicao: string; banco: string | null } | null;
};

const STATUS_LANC_LABEL: Record<string, string> = {
  pendente: "Pendente",
  conciliado: "Vinculada",
  virou_despesa: "Virou despesa",
  ignorado: "Ignorada",
};

function formatBRL(v: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v ?? 0);
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const apenas = d.slice(0, 10);
  const [y, m, dd] = apenas.split("-");
  if (!y || !m || !dd) return d;
  return `${dd}/${m}/${y}`;
}

export async function exportarFaturaPDF(fatura: FaturaInput): Promise<void> {
  // 1) Carrega lançamentos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lancsRaw, error: errLancs } = await (supabase as any)
    .from("fatura_cartao_lancamentos")
    .select("id, data_compra, descricao, valor, status, estabelecimento_local, conta_pagar_id")
    .eq("fatura_id", fatura.id)
    .order("data_compra", { ascending: true });
  if (errLancs) throw errLancs;
  const lancamentos = (lancsRaw || []) as Array<{
    id: string;
    data_compra: string;
    descricao: string;
    valor: number;
    status: string;
    estabelecimento_local: string | null;
    conta_pagar_id: string | null;
  }>;

  // 2) Contas a pagar vinculadas (pra trazer categoria via plano_contas)
  const cpIds = Array.from(new Set(lancamentos.map((l) => l.conta_pagar_id).filter((id): id is string => Boolean(id))));
  const cpMap = new Map<string, { conta_id: string | null }>();
  if (cpIds.length > 0) {
    const { data: cpRows } = await supabase
      .from("contas_pagar_receber")
      .select("id, conta_id")
      .in("id", cpIds);
    (cpRows || []).forEach((r) => cpMap.set(r.id, { conta_id: r.conta_id }));
  }

  // 3) Plano de contas (categorias)
  const planoIds = Array.from(new Set(Array.from(cpMap.values()).map((c) => c.conta_id).filter((id): id is string => Boolean(id))));
  const planoMap = new Map<string, { codigo: string | null; nome: string }>();
  if (planoIds.length > 0) {
    const { data: planoRows } = await supabase
      .from("plano_contas")
      .select("id, codigo, nome")
      .in("id", planoIds);
    (planoRows || []).forEach((r) => planoMap.set(r.id, { codigo: r.codigo, nome: r.nome }));
  }

  function categoriaDoLancamento(l: { conta_pagar_id: string | null }): string {
    if (!l.conta_pagar_id) return "—";
    const cp = cpMap.get(l.conta_pagar_id);
    if (!cp || !cp.conta_id) return "—";
    const p = planoMap.get(cp.conta_id);
    if (!p) return "—";
    return `${p.codigo || ""} ${p.nome}`.trim();
  }

  // 4) Gera PDF
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Cabeçalho
  // Verde Fetely: #1a3d2b → RGB 26, 61, 43
  doc.setFontSize(18);
  doc.setTextColor(26, 61, 43);
  doc.setFont("helvetica", "bold");
  doc.text("Fetély.", 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("FETELY COMERCIO IMPORTACAO E EXPORTACAO LTDA", 14, 23);
  doc.text("CNPJ 63.591.078/0001-48", 14, 27);

  // Título do documento (canto direito)
  doc.setFontSize(14);
  doc.setTextColor(26, 61, 43);
  doc.setFont("helvetica", "bold");
  doc.text("Extrato de Fatura — Cartão", 196, 18, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${formatDate(new Date().toISOString())}`, 196, 23, { align: "right" });

  // Linha verde separadora
  doc.setDrawColor(26, 61, 43);
  doc.setLineWidth(0.5);
  doc.line(14, 31, 196, 31);

  // Identificação da fatura
  doc.setFontSize(9);
  doc.setTextColor(0);
  let y = 38;
  const linhaDado = (label: string, valor: string, x: number, yLinha: number) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(label, x, yLinha);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(valor, x + 32, yLinha);
  };

  linhaDado("Cartão:", fatura.conta_bancaria?.nome_exibicao || "—", 14, y);
  linhaDado("Status:", String(fatura.status || "—").toUpperCase(), 110, y);
  y += 6;
  linhaDado("Vencimento:", formatDate(fatura.data_vencimento), 14, y);
  linhaDado("Fechamento:", formatDate(fatura.data_fechamento), 110, y);
  y += 6;
  linhaDado(
    "Período:",
    `${formatDate(fatura.periodo_inicio)} a ${formatDate(fatura.periodo_fim)}`,
    14,
    y,
  );
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Valor total da fatura:", 14, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(formatBRL(fatura.valor_total), 14 + 40, y);
  doc.setFontSize(9);

  if (fatura.observacao) {
    y += 8;
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text(`Obs: ${fatura.observacao}`, 14, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
  }

  y += 8;

  // Tabela de lançamentos
  const head = [["Data", "Descrição", "Categoria", "Status", "Valor"]];
  const body = lancamentos.map((l) => [
    formatDate(l.data_compra),
    l.estabelecimento_local
      ? `${l.descricao}\n${l.estabelecimento_local}`
      : l.descricao,
    categoriaDoLancamento(l),
    STATUS_LANC_LABEL[l.status] || l.status,
    formatBRL(l.valor),
  ]);

  // Total efetivo (excl. ignorados)
  const somaEfetiva = lancamentos
    .filter((l) => l.status !== "ignorado")
    .reduce((s, l) => s + (Number(l.valor) || 0), 0);

  body.push([
    "",
    "",
    "",
    "TOTAL EFETIVO (excl. ignorados):",
    formatBRL(somaEfetiva),
  ]);

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: { fontSize: 7.5, cellPadding: 1.5, valign: "middle" },
    headStyles: {
      fillColor: [26, 61, 43], // Verde Fetely
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 70 },
      2: { cellWidth: 50 },
      3: { cellWidth: 24 },
      4: { cellWidth: 28, halign: "right" },
    },
    didParseCell: (data) => {
      // Última linha (totais) em negrito
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 245, 240];
      }
      // Coluna valor em alinhamento direito
      if (data.column.index === 4) {
        data.cell.styles.halign = "right";
      }
      // Estornos (valor negativo) em vermelho
      if (data.column.index === 4 && data.section === "body" && typeof data.cell.raw === "string") {
        if (data.cell.raw.includes("-R$")) {
          data.cell.styles.textColor = [200, 30, 30];
        }
      }
    },
  });

  // Resumo por categoria + status (logo após a tabela)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yAfter = (doc as any).lastAutoTable.finalY + 8;

  // Totais por categoria
  const catMap = new Map<string, { qtd: number; valor: number }>();
  for (const l of lancamentos) {
    if (l.status === "ignorado") continue;
    const cat = categoriaDoLancamento(l);
    const cur = catMap.get(cat) || { qtd: 0, valor: 0 };
    cur.qtd += 1;
    cur.valor += Number(l.valor) || 0;
    catMap.set(cat, cur);
  }
  const catRows = Array.from(catMap.entries())
    .sort((a, b) => Math.abs(b[1].valor) - Math.abs(a[1].valor))
    .map(([cat, v]) => [cat, String(v.qtd), formatBRL(v.valor)]);

  // Totais por status
  const statusMap: Record<string, { qtd: number; valor: number }> = {};
  for (const l of lancamentos) {
    const s = l.status;
    if (!statusMap[s]) statusMap[s] = { qtd: 0, valor: 0 };
    statusMap[s].qtd += 1;
    statusMap[s].valor += Number(l.valor) || 0;
  }
  const statusRows = Object.entries(statusMap).map(([s, v]) => [
    STATUS_LANC_LABEL[s] || s,
    String(v.qtd),
    formatBRL(v.valor),
  ]);

  // Tabela "Totais por categoria" (esquerda)
  autoTable(doc, {
    startY: yAfter,
    margin: { left: 14, right: 110 },
    head: [["Totais por categoria", "Qtd", "Valor"]],
    body: catRows,
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [240, 245, 240], textColor: [26, 61, 43], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 12, halign: "center" },
      2: { cellWidth: 25, halign: "right" },
    },
  });

  // Tabela "Totais por status" (direita) — alinhada no Y
  autoTable(doc, {
    startY: yAfter,
    margin: { left: 110, right: 14 },
    head: [["Totais por status", "Qtd", "Valor"]],
    body: statusRows,
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [240, 245, 240], textColor: [26, 61, 43], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 12, halign: "center" },
      2: { cellWidth: 26, halign: "right" },
    },
  });

  // Rodapé na última página
  const totalPages = doc.internal.pages.length - 1; // pages é 1-indexed
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Fetély · #celebreoqueimporta · Documento de uso interno · Pág ${i} de ${totalPages}`,
      105,
      290,
      { align: "center" },
    );
  }

  // 5) Salva PDF
  const nomeArquivo = `Fatura_${(fatura.conta_bancaria?.nome_exibicao || "Cartao").replace(/[^a-zA-Z0-9]/g, "_")}_${fatura.data_vencimento.slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}
