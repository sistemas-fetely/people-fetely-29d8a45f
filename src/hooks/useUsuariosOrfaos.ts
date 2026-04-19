import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna Set de user_ids que estão referenciados em colaboradores/contratos
 * mas NÃO existem em profiles (e portanto não têm acesso real ao sistema).
 * Útil para detectar cadastros com vínculo de acesso quebrado/inconsistente.
 */
export function useUsuariosOrfaos(userIds: (string | null | undefined)[]) {
  const idsValidos = userIds.filter((u): u is string => !!u);
  const chaveCache = idsValidos.slice().sort().join(",");

  return useQuery({
    queryKey: ["usuarios-orfaos", chaveCache],
    enabled: idsValidos.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id")
        .in("user_id", idsValidos);

      if (error) throw error;

      const existentes = new Set((data || []).map((p: any) => p.user_id));
      return new Set(idsValidos.filter((id) => !existentes.has(id)));
    },
    staleTime: 60 * 1000,
  });
}
