import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CentroCusto = {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
};

export function useCentrosCusto(somenteAtivos = true) {
  return useQuery({
    queryKey: ["centros-custo", { somenteAtivos }],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any).from("centros_custo").select("id, codigo, nome, ativo").order("nome");
      if (somenteAtivos) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CentroCusto[];
    },
  });
}
