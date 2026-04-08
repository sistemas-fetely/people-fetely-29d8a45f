import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { HoleriteComColaborador } from "@/hooks/useFolhaPagamento";

const fmt = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  holerites: HoleriteComColaborador[];
  onSelect?: (h: HoleriteComColaborador) => void;
}

export function HoleriteTable({ holerites, onSelect }: Props) {
  const [busca, setBusca] = useState("");

  const filtered = holerites.filter((h) =>
    (h.colaborador?.nome_completo ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (h.colaborador?.departamento ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  const totais = {
    bruto: filtered.reduce((s, h) => s + (h.total_proventos ?? 0), 0),
    inss: filtered.reduce((s, h) => s + (h.inss ?? 0), 0),
    irrf: filtered.reduce((s, h) => s + (h.irrf ?? 0), 0),
    descontos: filtered.reduce((s, h) => s + (h.total_descontos ?? 0), 0),
    liquido: filtered.reduce((s, h) => s + (h.salario_liquido ?? 0), 0),
    fgts: filtered.reduce((s, h) => s + (h.fgts ?? 0), 0),
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar colaborador..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead className="text-right">Sal. Base</TableHead>
              <TableHead className="text-right">Proventos</TableHead>
              <TableHead className="text-right">INSS</TableHead>
              <TableHead className="text-right">IRRF</TableHead>
              <TableHead className="text-right">Descontos</TableHead>
              <TableHead className="text-right">Líquido</TableHead>
              <TableHead className="text-right">FGTS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {holerites.length === 0
                    ? "Nenhum holerite calculado para esta competência"
                    : "Nenhum resultado encontrado"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((h) => (
                <TableRow
                  key={h.id}
                  className="cursor-pointer"
                  onClick={() => onSelect?.(h)}
                >
                  <TableCell className="font-medium">{h.colaborador?.nome_completo}</TableCell>
                  <TableCell>{h.colaborador?.departamento}</TableCell>
                  <TableCell className="text-right">{fmt(h.salario_base)}</TableCell>
                  <TableCell className="text-right">{fmt(h.total_proventos)}</TableCell>
                  <TableCell className="text-right text-red-600">{fmt(h.inss)}</TableCell>
                  <TableCell className="text-right text-red-600">{fmt(h.irrf)}</TableCell>
                  <TableCell className="text-right text-red-600">{fmt(h.total_descontos)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(h.salario_liquido)}</TableCell>
                  <TableCell className="text-right">{fmt(h.fgts)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="font-semibold">Totais ({filtered.length})</TableCell>
                <TableCell className="text-right font-semibold">{fmt(totais.bruto)}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">{fmt(totais.inss)}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">{fmt(totais.irrf)}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">{fmt(totais.descontos)}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(totais.liquido)}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(totais.fgts)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
