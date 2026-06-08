import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRemessas(pedido_id: string) {
  return useQuery({
    queryKey: ["remessas", pedido_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pedido_remessa")
        .select("*")
        .eq("pedido_id", pedido_id)
        .order("sequencia");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!pedido_id,
  });
}
