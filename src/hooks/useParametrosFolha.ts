import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PARAMETROS_PADRAO, type ParametrosFolha, type FaixaINSS, type FaixaIRRF } from "@/lib/calculo-folha";

export function useParametrosFolha() {
  return useQuery({
    queryKey: ["parametros_folha"],
    queryFn: async (): Promise<ParametrosFolha> => {
      const { data, error } = await supabase
        .from("parametros")
        .select("categoria, valor, label, ordem")
        .in("categoria", ["encargo_folha", "inss_faixa", "irrf_faixa"])
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error || !data?.length) {
        console.warn("Parâmetros de folha não encontrados, usando valores padrão");
        return PARAMETROS_PADRAO;
      }

      const encargos = data.filter((p) => p.categoria === "encargo_folha");
      const inssFaixas = data.filter((p) => p.categoria === "inss_faixa");
      const irrfFaixas = data.filter((p) => p.categoria === "irrf_faixa");

      const getEncargo = (label: string, fallback: number): number => {
        const param = encargos.find((p) => p.label === label);
        return param ? parseFloat(param.valor) : fallback;
      };

      const faixasINSS: FaixaINSS[] = inssFaixas.length > 0
        ? inssFaixas.map((p) => {
            const parsed = JSON.parse(p.valor);
            return { ate: parsed.ate, aliquota: parsed.aliquota };
          })
        : PARAMETROS_PADRAO.faixasINSS;

      const faixasIRRF: FaixaIRRF[] = irrfFaixas.length > 0
        ? irrfFaixas.map((p) => {
            const parsed = JSON.parse(p.valor);
            return {
              ate: parsed.ate >= 999999999 ? Infinity : parsed.ate,
              aliquota: parsed.aliquota,
              deduzir: parsed.deduzir,
            };
          })
        : PARAMETROS_PADRAO.faixasIRRF;

      return {
        faixasINSS,
        faixasIRRF,
        aliquotaFGTS: getEncargo("Alíquota FGTS", PARAMETROS_PADRAO.aliquotaFGTS),
        aliquotaINSSPatronal: getEncargo("Alíquota INSS Patronal", PARAMETROS_PADRAO.aliquotaINSSPatronal),
        percentualVTDesconto: getEncargo("Percentual Desconto VT", PARAMETROS_PADRAO.percentualVTDesconto),
        deducaoDependenteIRRF: getEncargo("Dedução Dependente IRRF", PARAMETROS_PADRAO.deducaoDependenteIRRF),
      };
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
}
