import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BeneficioCatalogo {
  id: string;
  beneficio: string;
  tipo: string;
  ativo: boolean;
  criado_por: string;
}

export function useBeneficiosCatalogo(tipoContrato?: string) {
  return useQuery({
    queryKey: ["beneficios-catalogo", tipoContrato],
    queryFn: async () => {
      let query = (supabase as any)
        .from("beneficios_catalogo")
        .select("*")
        .eq("ativo", true)
        .order("beneficio");

      if (tipoContrato) {
        query = query.in("tipo", [tipoContrato, "todos"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as BeneficioCatalogo[];
    },
  });
}

export async function salvarNovoBeneficio(beneficio: string, tipo: string) {
  const { error } = await (supabase as any)
    .from("beneficios_catalogo")
    .upsert(
      {
        beneficio: beneficio.trim(),
        tipo: tipo || "todos",
        criado_por: "usuario",
        ativo: true,
      },
      { onConflict: "beneficio,tipo" }
    );
  return !error;
}
