import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ResponsabilidadeCatalogo {
  id: string;
  responsabilidade: string;
  area: string;
  nivel: string;
  ativo: boolean;
  criado_por: string;
}

export function useResponsabilidadesCatalogo(area?: string, nivel?: string) {
  return useQuery({
    queryKey: ["responsabilidades-catalogo", area, nivel],
    queryFn: async () => {
      let query = (supabase as any)
        .from("responsabilidades_catalogo")
        .select("*")
        .eq("ativo", true)
        .order("responsabilidade");

      if (area) {
        query = query.eq("area", area);
      }
      if (nivel && nivel !== "todos") {
        query = query.in("nivel", [nivel, "todos"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ResponsabilidadeCatalogo[];
    },
  });
}

export async function salvarNovaResponsabilidade(
  responsabilidade: string,
  area: string,
  nivel: string
) {
  const { error } = await (supabase as any)
    .from("responsabilidades_catalogo")
    .upsert(
      {
        responsabilidade: responsabilidade.trim(),
        area: area || "todos",
        nivel: nivel || "todos",
        criado_por: "usuario",
        ativo: true,
      },
      { onConflict: "responsabilidade,area,nivel" }
    );
  return !error;
}
