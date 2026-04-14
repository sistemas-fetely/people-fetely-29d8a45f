import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Set of cargo names that are marked as C-Level.
 * Now reads from the unified `cargos` table instead of `parametros`.
 */
export function useCLevelCargos() {
  const { data: clevelCargos = new Set<string>() } = useQuery({
    queryKey: ["clevel-cargos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cargos")
        .select("nome")
        .eq("is_clevel", true)
        .eq("ativo", true);
      if (error) throw error;
      const set = new Set<string>();
      (data || []).forEach((c) => {
        set.add(c.nome);
      });
      return set;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isCargoClevel = (cargo: string | null | undefined): boolean => {
    if (!cargo) return false;
    return clevelCargos.has(cargo);
  };

  return { clevelCargos, isCargoClevel };
}