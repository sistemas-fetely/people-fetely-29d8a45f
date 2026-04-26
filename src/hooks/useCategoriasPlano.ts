import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CategoriaOption } from "@/components/financeiro/CategoriaCombobox";

export function useCategoriasPlano() {
  return useQuery({
    queryKey: ["plano-contas-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_contas")
        .select("id, codigo, nome, nivel, parent_id")
        .order("codigo");
      if (error) throw error;
      return (data || []) as CategoriaOption[];
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
}
