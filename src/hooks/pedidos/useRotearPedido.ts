import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Args {
  p_pedido_id: string;
}

export interface RotearPedidoResult {
  ok: boolean;
  destino?: string;
  motivo?: string;
  mensagem?: string;
}

export function useRotearPedido() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ p_pedido_id }: Args): Promise<RotearPedidoResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("rotear_pedido", {
        p_pedido_id,
      });
      if (error) throw error;
      return (data ?? { ok: false }) as RotearPedidoResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos-fila"] });
      qc.invalidateQueries({ queryKey: ["pedidos-pipeline"] });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao rotear pedido", description: e.message, variant: "destructive" });
    },
  });
}
