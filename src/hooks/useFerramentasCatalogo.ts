import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FerramentaCatalogo {
  id: string;
  ferramenta: string;
  area: string;
  ativo: boolean;
  criado_por: string;
}

export function useFerramentasCatalogo(area?: string) {
  return useQuery({
    queryKey: ["ferramentas-catalogo", area],
    queryFn: async () => {
      let query = (supabase as any)
        .from("ferramentas_catalogo")
        .select("*")
        .eq("ativo", true)
        .order("ferramenta");

      if (area) {
        query = query.in("area", [area, "todos"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as FerramentaCatalogo[];
    },
  });
}

export async function salvarNovaFerramenta(ferramenta: string, area: string) {
  const { error } = await (supabase as any)
    .from("ferramentas_catalogo")
    .upsert(
      {
        ferramenta: ferramenta.trim(),
        area: area || "todos",
        criado_por: "usuario",
        ativo: true,
      },
      { onConflict: "ferramenta,area" }
    );
  return !error;
}
