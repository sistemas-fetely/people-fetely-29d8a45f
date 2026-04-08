import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { HoleriteComColaborador } from "@/hooks/useFolhaPagamento";

const fmt = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  holerite: HoleriteComColaborador | null;
  open: boolean;
  onClose: () => void;
}

function Linha({ label, valor, tipo }: { label: string; valor: number | null; tipo?: "provento" | "desconto" | "neutro" }) {
  const color = tipo === "desconto" ? "text-red-600" : tipo === "provento" ? "text-green-700" : "";
  const prefix = tipo === "desconto" ? "- " : tipo === "provento" ? "+ " : "";
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${color}`}>{prefix}{fmt(valor)}</span>
    </div>
  );
}

export function HoleriteDrawer({ holerite, open, onClose }: Props) {
  if (!holerite) return null;
  const h = holerite;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{h.colaborador?.nome_completo}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {h.colaborador?.cargo} — {h.colaborador?.departamento}
          </p>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Proventos */}
          <div>
            <h4 className="text-sm font-semibold text-green-700 mb-2">Proventos</h4>
            <Linha label="Salário Base" valor={h.salario_base} tipo="provento" />
            {(h.horas_extras_50 ?? 0) > 0 && (
              <Linha label={`Horas Extras 50% (${h.horas_extras_50_qtd}h)`} valor={h.horas_extras_50} tipo="provento" />
            )}
            {(h.horas_extras_100 ?? 0) > 0 && (
              <Linha label={`Horas Extras 100% (${h.horas_extras_100_qtd}h)`} valor={h.horas_extras_100} tipo="provento" />
            )}
            {(h.adicional_noturno ?? 0) > 0 && (
              <Linha label="Adicional Noturno" valor={h.adicional_noturno} tipo="provento" />
            )}
            {(h.outros_proventos ?? 0) > 0 && (
              <Linha label="Outros Proventos" valor={h.outros_proventos} tipo="provento" />
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-sm py-1">
              <span>Total Proventos</span>
              <span className="text-green-700">{fmt(h.total_proventos)}</span>
            </div>
          </div>

          {/* Descontos */}
          <div>
            <h4 className="text-sm font-semibold text-red-600 mb-2">Descontos</h4>
            <Linha label="INSS" valor={h.inss} tipo="desconto" />
            <Linha label="IRRF" valor={h.irrf} tipo="desconto" />
            {(h.vt_desconto ?? 0) > 0 && <Linha label="Vale Transporte (6%)" valor={h.vt_desconto} tipo="desconto" />}
            {(h.vr_desconto ?? 0) > 0 && <Linha label="Vale Refeição" valor={h.vr_desconto} tipo="desconto" />}
            {(h.plano_saude ?? 0) > 0 && <Linha label="Plano de Saúde" valor={h.plano_saude} tipo="desconto" />}
            {(h.faltas_desconto ?? 0) > 0 && (
              <Linha label={`Faltas (${h.faltas_dias} dias)`} valor={h.faltas_desconto} tipo="desconto" />
            )}
            {(h.outros_descontos ?? 0) > 0 && <Linha label="Outros Descontos" valor={h.outros_descontos} tipo="desconto" />}
            <Separator />
            <div className="flex justify-between font-semibold text-sm py-1">
              <span>Total Descontos</span>
              <span className="text-red-600">{fmt(h.total_descontos)}</span>
            </div>
          </div>

          {/* Líquido */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex justify-between text-base font-bold">
              <span>Salário Líquido</span>
              <span>{fmt(h.salario_liquido)}</span>
            </div>
          </div>

          {/* Encargos */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Encargos Patronais</h4>
            <Linha label="FGTS (8%)" valor={h.fgts} tipo="neutro" />
            <Linha label="INSS Patronal (20%)" valor={h.inss_patronal} tipo="neutro" />
            <Separator />
            <div className="flex justify-between font-semibold text-sm py-1">
              <span>Total Encargos</span>
              <span>{fmt(h.total_encargos)}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
