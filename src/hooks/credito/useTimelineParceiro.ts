import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ParceiroMarco } from "@/types/credito";

export function useTimelineParceiro(parceiroId: string | undefined) {
  return useQuery({
    queryKey: ["timeline-parceiro", parceiroId],
    enabled: !!parceiroId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ParceiroMarco[]> => {
      if (!parceiroId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("v_parceiro_timeline")
        .select("*")
        .eq("parceiro_id", parceiroId)
        .order("criado_em", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as ParceiroMarco[];
    },
  });
}
