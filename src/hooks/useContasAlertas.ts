import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContaAlerta {
  id: string;
  conta_id: string;
  tipo: string;
  mensagem: string;
  ativo: boolean;
  created_at: string;
  resolvido_em: string | null;
}

export function useContasAlertas() {
  return useQuery({
    queryKey: ["contas-alertas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_alertas")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ContaAlerta[];
    },
  });
}

export function useAlertasConta(contaId: string | null) {
  return useQuery({
    queryKey: ["conta-alertas", contaId],
    enabled: !!contaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_alertas")
        .select("*")
        .eq("conta_id", contaId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ContaAlerta[];
    },
  });
}
