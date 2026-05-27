import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { TransicionarPayload } from "@/types/credito";

export function useTransicionarAnalise() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: TransicionarPayload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("transicionar_analise", {
        p_analise_id: payload.analise_id,
        p_acao: payload.acao,
        p_estagio_destino: payload.estagio_destino ?? null,
        p_motivo: payload.motivo ?? null,
        p_perfil_aplicado: payload.perfil_aplicado ?? null,
        p_limite_concedido: payload.limite_concedido ?? null,
        p_prazo_max_dias: payload.prazo_max_dias ?? null,
        p_formas_aceitas: payload.formas_aceitas ?? null,
        p_parecer_final: payload.parecer_final ?? null,
        p_ressalva: payload.ressalva ?? null,
        p_validade_ate: payload.validade_ate ?? null,
        p_delta_ia: payload.delta_ia ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["analise-detalhe", vars.analise_id] });
      qc.invalidateQueries({ queryKey: ["analises-fila"] });
      toast({ title: "Análise transicionada", description: `Ação: ${vars.acao}` });
    },
    onError: (e: Error) => {
      toast({
        title: "Erro ao transicionar",
        description: e.message,
        variant: "destructive",
      });
    },
  });
}
