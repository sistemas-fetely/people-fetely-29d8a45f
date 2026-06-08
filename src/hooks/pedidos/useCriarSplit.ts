import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SplitParams {
  pedido_id: string;
  itens_01: { descricao: string; sku: string; quantidade: number; valor_unitario: number }[];
  itens_02: { descricao: string; sku: string; quantidade: number; valor_unitario: number }[];
  valor_01: number;
  valor_02: number;
  data_entrega_prevista_02?: string | null;
  observacao?: string | null;
}

export function useCriarSplit() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (p: SplitParams) => {
      const { data, error } = await (supabase as any).rpc("criar_split_pedido", {
        p_pedido_id: p.pedido_id,
        p_itens_01: p.itens_01,
        p_itens_02: p.itens_02,
        p_valor_01: p.valor_01,
        p_valor_02: p.valor_02,
        p_data_entrega_prevista_02: p.data_entrega_prevista_02 ?? null,
        p_observacao: p.observacao ?? null,
      });
      if (error) throw error;
      return data as {
        remessa_01_id: string;
        remessa_01_codigo: string;
        remessa_02_id: string;
        remessa_02_codigo: string;
        delta_financeiro: number;
      };
    },
    onSuccess: (data, vars) => {
      toast({
        title: "Split criado com sucesso",
        description: `${data.remessa_01_codigo} (pronta) + ${data.remessa_02_codigo} (aguardando estoque)${data.delta_financeiro > 0 ? ` · ⚠️ Delta R$ ${data.delta_financeiro.toFixed(2)}` : ""}`,
      });
      qc.invalidateQueries({ queryKey: ["remessas", vars.pedido_id] });
      qc.invalidateQueries({ queryKey: ["pedido", vars.pedido_id] });
      qc.invalidateQueries({ queryKey: ["pedidos-fila"] });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao criar split", description: e.message, variant: "destructive" });
    },
  });
}
