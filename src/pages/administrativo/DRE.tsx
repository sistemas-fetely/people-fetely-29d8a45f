import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { FileBarChart2, Upload } from "lucide-react";
import { formatBRL } from "@/lib/format-currency";

type LancRow = {
  valor: number;
  tipo_lancamento: string;
  data_competencia: string | null;
  conta_id: string | null;
  plano_contas?: { codigo: string | null; nome: string | null; natureza: string | null; tipo: string | null } | null;
};

type RowKind = "header" | "subtotal" | "detalhe";

export default function DRE() {
  const [periodo, setPeriodo] = useState<string>("mes_atual");

  const { data, isLoading } = useQuery({
    queryKey: ["dre-lancamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("valor, tipo_lancamento, data_competencia, conta_id, plano_contas:conta_id(codigo,nome,natureza,tipo)");
      if (error) throw error;
      return (data || []) as unknown as LancRow[];
    },
  });

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((l) => {
      if (l.data_competencia) set.add(l.data_competencia.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [data]);

  const filtered = useMemo(() => {
    const all = data || [];
    if (periodo === "ano") {
      const year = new Date().getFullYear();
      return all.filter((l) => l.data_competencia?.startsWith(String(year)));
    }
    if (periodo === "mes_atual") {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return all.filter((l) => l.data_competencia?.startsWith(ym));
    }
    return all.filter((l) => l.data_competencia?.startsWith(periodo));
  }, [data, periodo]);

  const dre = useMemo(() => {
    const sumWhere = (pred: (l: LancRow) => boolean) =>
      filtered.filter(pred).reduce((s, l) => s + Number(l.valor || 0), 0);

    const detalhes = (pred: (l: LancRow) => boolean) => {
      const map = new Map<string, { codigo: string; nome: string; valor: number }>();
      filtered.filter(pred).forEach((l) => {
        const cod = l.plano_contas?.codigo || "";
        const key = cod.split(".").slice(0, 2).join(".");
        const existing = map.get(key);
        const nome = existing?.nome || l.plano_contas?.nome || key;
        map.set(key, { codigo: key, nome, valor: (existing?.valor || 0) + Number(l.valor || 0) });
      });
      return Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
    };

    // Receita Bruta: 01.01.* (operacional, receita)
    const receitaBruta = sumWhere(
      (l) => !!l.plano_contas?.codigo?.startsWith("01.01") && l.tipo_lancamento === "credito"
    );
    const receitasDet = detalhes(
      (l) => !!l.plano_contas?.codigo?.startsWith("01.01") && l.tipo_lancamento === "credito"
    );
    // Deduções: 01.02.* (natureza='deducao')
    const deducoes = sumWhere(
      (l) => !!l.plano_contas?.codigo?.startsWith("01.02") && l.tipo_lancamento === "debito"
    );
    const receitaLiquida = receitaBruta - deducoes;

    // Custos Diretos / CPV: 06.*
    const custosDir = sumWhere(
      (l) => !!l.plano_contas?.codigo?.startsWith("06") && l.tipo_lancamento === "debito"
    );
    const lucroBruto = receitaLiquida - custosDir;

    // Despesas Operacionais: 05.01..05.06 (exclui 05.07 que é financeira)
    const despOpPrefixes = ["05.01", "05.02", "05.03", "05.04", "05.05", "05.06"];
    const despesasOp = sumWhere(
      (l) =>
        !!l.plano_contas?.codigo &&
        despOpPrefixes.some((p) => l.plano_contas!.codigo!.startsWith(p)) &&
        l.tipo_lancamento === "debito"
    );
    const despesasDet = detalhes(
      (l) =>
        !!l.plano_contas?.codigo &&
        despOpPrefixes.some((p) => l.plano_contas!.codigo!.startsWith(p)) &&
        l.tipo_lancamento === "debito"
    );
    const resultadoOp = lucroBruto - despesasOp;

    // Resultado Financeiro: tudo natureza='financeira' (receitas - despesas)
    const recFinanceiras = sumWhere(
      (l) => l.plano_contas?.natureza === "financeira" && l.tipo_lancamento === "credito"
    );
    const despFinanceiras = sumWhere(
      (l) => l.plano_contas?.natureza === "financeira" && l.tipo_lancamento === "debito"
    );
    const resultadoFin = recFinanceiras - despFinanceiras;
    const resultadoAntesImp = resultadoOp + resultadoFin;

    // Impostos: 08.*
    const impostos = sumWhere(
      (l) => !!l.plano_contas?.codigo?.startsWith("08") && l.tipo_lancamento === "debito"
    );
    const resultadoLiq = resultadoAntesImp - impostos;

    return {
      receitaBruta, receitasDet, deducoes, receitaLiquida,
      custosDir, lucroBruto, despesasOp, despesasDet,
      resultadoOp, recFinanceiras, despFinanceiras, resultadoFin,
      resultadoAntesImp, impostos, resultadoLiq,
    };
  }, [filtered]);

  const Linha = ({
    label, valor, kind, sinal, indent = 0, highlightFinal = false,
  }: {
    label: string; valor: number; kind: RowKind;
    sinal: "+" | "-" | "=" | "+/-"; indent?: number; highlightFinal?: boolean;
  }) => {
    const baseClass =
      kind === "subtotal" ? "font-bold bg-muted/60"
        : kind === "header" ? "font-medium"
        : "text-muted-foreground";
    const finalClass = highlightFinal
      ? `text-lg font-bold ${valor >= 0 ? "text-green-700" : "text-red-700"} bg-muted`
      : "";
    return (
      <div
        className={`flex items-center justify-between border-b px-4 py-2 ${baseClass} ${finalClass}`}
        style={{ paddingLeft: `${16 + indent * 20}px` }}
      >
        <span className="text-sm">({sinal}) {label}</span>
        <span className="font-mono text-sm">{formatBRL(valor)}</span>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart2 className="h-6 w-6 text-admin" />
            DRE — Demonstração do Resultado
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerado automaticamente a partir dos lançamentos financeiros.
          </p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mes_atual">Mês atual</SelectItem>
            <SelectItem value="ano">Acumulado do ano</SelectItem>
            {mesesDisponiveis.map((m) => (
              <SelectItem key={m} value={m}>
                {new Date(m + "-01T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Resultado do período</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (data || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-admin-muted">
                <Upload className="h-8 w-8 text-admin" />
              </div>
              <p className="text-lg font-semibold">Sem lançamentos para gerar o DRE</p>
              <p className="text-sm text-muted-foreground max-w-md">
                O DRE é gerado automaticamente a partir dos lançamentos. Sincronize com o Bling para começar.
              </p>
              <Button asChild className="bg-admin hover:bg-admin-accent text-admin-foreground">
                <Link to="/administrativo/importar">Ir para importação</Link>
              </Button>
            </div>
          ) : (
            <div className="border-t">
              <Linha label="Receita Operacional Bruta" valor={dre.receitaBruta} kind="header" sinal="+" />
              {dre.receitasDet.map((d) => (
                <Linha key={d.codigo} label={`${d.codigo} ${d.nome}`} valor={d.valor} kind="detalhe" sinal="+" indent={1} />
              ))}
              <Linha label="Deduções" valor={dre.deducoes} kind="header" sinal="-" />
              <Linha label="Receita Líquida" valor={dre.receitaLiquida} kind="subtotal" sinal="=" />
              <Linha label="Custos Diretos" valor={dre.custosDir} kind="header" sinal="-" />
              <Linha label="Lucro Bruto" valor={dre.lucroBruto} kind="subtotal" sinal="=" />
              <Linha label="Despesas Operacionais" valor={dre.despesasOp} kind="header" sinal="-" />
              {dre.despesasDet.map((d) => (
                <Linha key={d.codigo} label={`${d.codigo} ${d.nome}`} valor={d.valor} kind="detalhe" sinal="-" indent={1} />
              ))}
              <Linha label="Resultado Operacional" valor={dre.resultadoOp} kind="subtotal" sinal="=" />
              <Linha label="(+) Receitas Financeiras" valor={dre.recFinanceiras} kind="detalhe" sinal="+" indent={1} />
              <Linha label="(-) Despesas Financeiras" valor={dre.despFinanceiras} kind="detalhe" sinal="-" indent={1} />
              <Linha label="Resultado Financeiro" valor={dre.resultadoFin} kind="subtotal" sinal="=" />
              <Linha label="Resultado antes dos impostos" valor={dre.resultadoAntesImp} kind="subtotal" sinal="=" />
              <Linha label="Impostos" valor={dre.impostos} kind="header" sinal="-" />
              <Linha label="Resultado Líquido" valor={dre.resultadoLiq} kind="subtotal" sinal="=" highlightFinal />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
