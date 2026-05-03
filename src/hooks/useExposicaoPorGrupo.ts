/**
 * useExposicaoPorGrupo — lê a view vw_exposicao_por_grupo.
 *
 * View criada na Fase 1 (SQL). Retorna agregados por grupo:
 * - qtd parceiros ativos / total
 * - qtd contas últimos 12 meses
 * - total a pagar / a receber 12m
 *
 * Usado na aba Grupos pra mostrar tabela com KPIs por grupo.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ExposicaoGrupo = {
  grupo_id: string;
  grupo_nome: string;
  tipo_controle: string | null;
  grupo_ativo: boolean;
  qtd_parceiros_ativos: number;
  qtd_parceiros_total: number;
  qtd_contas_12m: number;
  total_pagar_12m: number;
  total_receber_12m: number;
};

export function useExposicaoPorGrupo() {
  return useQuery({
    queryKey: ["exposicao-grupos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_exposicao_por_grupo")
        .select("*")
        .order("grupo_nome");
      if (error) throw error;
      return (data || []) as ExposicaoGrupo[];
    },
  });
}
