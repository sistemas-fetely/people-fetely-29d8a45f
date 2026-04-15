import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SkillCatalogo {
  id: string;
  skill: string;
  area: string;
  nivel: string;
  tipo: string;
  ativo: boolean;
  criado_por: string;
}

export function useSkillsCatalogo(area?: string, nivel?: string) {
  return useQuery({
    queryKey: ["skills-catalogo", area, nivel],
    queryFn: async () => {
      let query = (supabase as any)
        .from("skills_catalogo")
        .select("*")
        .eq("ativo", true)
        .order("skill");

      if (area) {
        query = query.eq("area", area);
      }

      if (nivel && nivel !== "todos") {
        query = query.in("nivel", [nivel, "todos"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SkillCatalogo[];
    },
    enabled: true,
  });
}

export async function salvarNovaSkill(
  skill: string,
  area: string,
  nivel: string,
  tipo: "obrigatoria" | "desejada" | "ambos"
) {
  const { error } = await (supabase as any)
    .from("skills_catalogo")
    .upsert(
      {
        skill: skill.trim(),
        area,
        nivel: nivel || "todos",
        tipo,
        criado_por: "usuario",
        ativo: true,
      },
      { onConflict: "skill,area,nivel" }
    );
  return !error;
}
