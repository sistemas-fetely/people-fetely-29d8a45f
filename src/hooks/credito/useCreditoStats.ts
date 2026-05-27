import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CreditoStats {
  entrada: number;
  analise: number;
  decisao: number;
  decididasMes: number;
  aprovadasMes: number;
  reprovadasMes: number;
}

export function useCreditoStats() {
  return useQuery({
    queryKey: ["credito-stats"],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<CreditoStats> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      const inicioMesISO = inicioMes.toISOString();

      const counts = await Promise.all([
        sb.from("analises_credito").select("id", { count: "exact", head: true })
          .eq("estagio_atual", "entrada").is("status_final", null),
        sb.from("analises_credito").select("id", { count: "exact", head: true })
          .eq("estagio_atual", "analise").is("status_final", null),
        sb.from("analises_credito").select("id", { count: "exact", head: true })
          .eq("estagio_atual", "decisao").is("status_final", null),
        sb.from("analises_credito").select("id", { count: "exact", head: true })
          .not("status_final", "is", null).gte("decidido_em", inicioMesISO),
        sb.from("analises_credito").select("id", { count: "exact", head: true })
          .in("status_final", ["aprovado", "aprovado_com_ressalva"])
          .gte("decidido_em", inicioMesISO),
        sb.from("analises_credito").select("id", { count: "exact", head: true })
          .eq("status_final", "reprovado").gte("decidido_em", inicioMesISO),
      ]);

      return {
        entrada: counts[0].count || 0,
        analise: counts[1].count || 0,
        decisao: counts[2].count || 0,
        decididasMes: counts[3].count || 0,
        aprovadasMes: counts[4].count || 0,
        reprovadasMes: counts[5].count || 0,
      };
    },
  });
}
