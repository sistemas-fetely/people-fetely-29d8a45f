import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CanalVenda = {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
};

export function useCanaisVenda(somenteAtivos = true) {
  return useQuery({
    queryKey: ["canais-venda", { somenteAtivos }],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any).from("canais_venda").select("id, codigo, nome, ativo").order("nome");
      if (somenteAtivos) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CanalVenda[];
    },
  });
}
