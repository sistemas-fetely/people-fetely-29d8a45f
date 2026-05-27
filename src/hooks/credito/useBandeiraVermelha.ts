import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BandeiraVermelhaArgs {
  parceiro_id: string;
  motivo: string;
}

export function useErguerBandeiraVermelha() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ parceiro_id, motivo }: BandeiraVermelhaArgs) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("erguer_bandeira_vermelha", {
        p_parceiro_id: parceiro_id,
        p_motivo: motivo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["analise-detalhe"] });
      qc.invalidateQueries({ queryKey: ["timeline-parceiro", vars.parceiro_id] });
      toast({ title: "Bandeira vermelha erguida", variant: "destructive" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}

export function useBaixarBandeiraVermelha() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ parceiro_id, motivo }: BandeiraVermelhaArgs) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("baixar_bandeira_vermelha", {
        p_parceiro_id: parceiro_id,
        p_motivo: motivo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["analise-detalhe"] });
      qc.invalidateQueries({ queryKey: ["timeline-parceiro", vars.parceiro_id] });
      toast({ title: "Bandeira vermelha baixada" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}
