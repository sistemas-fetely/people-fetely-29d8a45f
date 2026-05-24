import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RegistrarCompraInputV2, RegistrarCompraResultV2 } from "@/lib/compras/types";

export function useRegistrarCompraPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarCompraInputV2) => {
      const { data, error } = await (supabase as any).rpc("registrar_compra_pedido", {
        p_pedido_id: input.pedido_id,
        p_status_alvo: input.status_alvo,
        p_linhas: input.linhas as unknown as never,
        p_parceiro_id: input.parceiro_id,
        p_meio_pagamento_id: input.meio_pagamento_id,
        p_data_compra: input.data_compra,
        p_parcelas_count: input.parcelas_count,
        p_primeira_parcela_data: input.primeira_parcela_data,
        p_intervalo_dias: input.intervalo_dias,
        p_periodicidade: input.periodicidade,
        p_conta_id: input.plano_contas_id ?? null,
        p_observacao: input.observacao ?? null,
        p_compra_id: input.compra_id ?? null,
        p_parceiro_id_pedido_original: input.parceiro_id_pedido_original ?? null,
      });
      if (error) throw error;
      return data as unknown as RegistrarCompraResultV2;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["compras", "a-comprar"] });
      qc.invalidateQueries({ queryKey: ["compras", "meus-pedidos"] });
      qc.invalidateQueries({ queryKey: ["compras", "rascunhos"] });
      qc.invalidateQueries({ queryKey: ["compras", "rascunhos-meus"] });
      qc.invalidateQueries({ queryKey: ["compras", "rascunho-pedido"] });
      if (res.status === "finalizada") {
        toast.success(`Compra finalizada. ${res.cprs_geradas} parcela(s) em Contas a Pagar.`);
      } else {
        toast.success("Rascunho salvo. Você pode continuar depois.");
      }
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao registrar compra"),
  });
}
