import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { HoleriteComColaborador } from "@/hooks/useFolhaPagamento";
import type { Tables } from "@/integrations/supabase/types";

type Competencia = Tables<"folha_competencias">;

const fmtNum = (v: number | null) => (v ?? 0);
const fmtBRL = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatCompLabel(comp: string) {
  const [y, m] = comp.split("-");
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${meses[Number(m) - 1]} ${y}`;
}

export function exportarExcel(holerites: HoleriteComColaborador[], competencia: Competencia) {
  const label = formatCompLabel(competencia.competencia);

  const rows = holerites.map((h) => ({
    "Colaborador": h.colaborador?.nome_completo ?? "",
    "Departamento": h.colaborador?.departamento ?? "",
    "Cargo": h.colaborador?.cargo ?? "",
    "Sal. Base": fmtNum(h.salario_base),
    "HE 50%": fmtNum(h.horas_extras_50),
    "HE 100%": fmtNum(h.horas_extras_100),
    "Outros Prov.": fmtNum(h.outros_proventos),
    "Total Proventos": fmtNum(h.total_proventos),
    "INSS": fmtNum(h.inss),
    "IRRF": fmtNum(h.irrf),
    "VT": fmtNum(h.vt_desconto),
    "VR": fmtNum(h.vr_desconto),
    "Plano Saúde": fmtNum(h.plano_saude),
    "Faltas": fmtNum(h.faltas_desconto),
    "Outros Desc.": fmtNum(h.outros_descontos),
    "Total Descontos": fmtNum(h.total_descontos),
    "Sal. Líquido": fmtNum(h.salario_liquido),
    "FGTS": fmtNum(h.fgts),
    "INSS Patronal": fmtNum(h.inss_patronal),
    "Total Encargos": fmtNum(h.total_encargos),
  }));

  // Totals row
  const totals: Record<string, string | number> = { "Colaborador": "TOTAIS", "Departamento": "", "Cargo": "" };
  const numCols = ["Sal. Base","HE 50%","HE 100%","Outros Prov.","Total Proventos","INSS","IRRF","VT","VR","Plano Saúde","Faltas","Outros Desc.","Total Descontos","Sal. Líquido","FGTS","INSS Patronal","Total Encargos"];
  numCols.forEach((col) => {
    totals[col] = rows.reduce((s, r) => s + (r[col as keyof typeof r] as number), 0);
  });
  rows.push(totals as any);

  const ws = XLSX.utils.json_to_sheet(rows);
  
  // Column widths
  ws["!cols"] = [
    { wch: 30 }, { wch: 18 }, { wch: 18 },
    ...Array(17).fill({ wch: 14 }),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Folha");
  XLSX.writeFile(wb, `Folha_${competencia.competencia}.xlsx`);
}

export function exportarPDF(holerites: HoleriteComColaborador[], competencia: Competencia) {
  const label = formatCompLabel(competencia.competencia);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header
  doc.setFontSize(16);
  doc.text("Folha de Pagamento", 14, 15);
  doc.setFontSize(11);
  doc.text(`Competência: ${label}`, 14, 22);
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 27);

  // KPIs
  doc.setFontSize(9);
  const kpis = [
    `Total Bruto: ${fmtBRL(competencia.total_bruto)}`,
    `Total Líquido: ${fmtBRL(competencia.total_liquido)}`,
    `Encargos: ${fmtBRL(competencia.total_encargos)}`,
    `Colaboradores: ${competencia.total_colaboradores}`,
  ];
  doc.text(kpis.join("   |   "), 14, 33);

  const head = [["Colaborador","Depto","Sal.Base","Proventos","INSS","IRRF","Descontos","Líquido","FGTS","Encargos"]];
  const body = holerites.map((h) => [
    h.colaborador?.nome_completo ?? "",
    h.colaborador?.departamento ?? "",
    fmtBRL(h.salario_base),
    fmtBRL(h.total_proventos),
    fmtBRL(h.inss),
    fmtBRL(h.irrf),
    fmtBRL(h.total_descontos),
    fmtBRL(h.salario_liquido),
    fmtBRL(h.fgts),
    fmtBRL(h.total_encargos),
  ]);

  // Totals
  const sum = (key: keyof HoleriteComColaborador) => holerites.reduce((s, h) => s + (Number(h[key]) || 0), 0);
  body.push([
    "TOTAIS", "",
    fmtBRL(sum("salario_base")),
    fmtBRL(sum("total_proventos")),
    fmtBRL(sum("inss")),
    fmtBRL(sum("irrf")),
    fmtBRL(sum("total_descontos")),
    fmtBRL(sum("salario_liquido")),
    fmtBRL(sum("fgts")),
    fmtBRL(sum("total_encargos")),
  ]);

  autoTable(doc, {
    startY: 37,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [243, 244, 246], textColor: 0, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 25 },
    },
    didParseCell: (data) => {
      // Bold last row (totals)
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [243, 244, 246];
      }
    },
  });

  doc.save(`Folha_${competencia.competencia}.pdf`);
}
