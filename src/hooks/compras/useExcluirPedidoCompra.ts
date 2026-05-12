import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useExcluirPedidoCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido_id: string) => {
      // Listar anexos pra remover do storage
      const { data: anexos } = await supabase
        .from("pedidos_compra_anexos")
        .select("storage_path")
        .eq("pedido_id", pedido_id);

      if (anexos && anexos.length) {
        const paths = anexos.map((a) => a.storage_path);
        await supabase.storage.from("pedidos-compra-anexos").remove(paths);
      }

      const { error } = await supabase.from("pedidos_compra").delete().eq("id", pedido_id);
      if (error) throw error;
      return { pedido_id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compras", "meus-pedidos"] });
      toast.success("Pedido descartado");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao descartar"),
  });
}
