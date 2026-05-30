import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CriarAnalisePayload } from "@/types/credito";

/**
 * D3 (30/05 tarde): hook migrado de `criar_analise_credito` (legacy, removida)
 * para `receber_pedido_externo` (portaria única — doutrina PORTARIA-NOVA-NÃO-LEGACY).
 *
 * receber_pedido_externo retorna campos extras (estagio_inicial, area_inicial)
 * que o hook ignora. Mantém compat de UX (toast / cache invalidation).
 *
 * Removida chamada manual a `enriquecer-parceiro-cnpj` — o trigger
 * `fn_pedido_after_insert` já dispara o enriquecimento via
 * `disparar_enriquecimento_parceiro` quando o parceiro é novo
 * (cadastro_incompleto=true).
 */

interface CriarAnaliseResponse {
  pedido_id: string;
  parceiro_id: string;
  status: "criada" | "ja_existe";
  estagio_inicial: string;
  area_inicial: string;
  analise_id: string | null;
}

export function useCriarAnalise() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: CriarAnalisePayload): Promise<CriarAnaliseResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("receber_pedido_externo", {
        p_cnpj: payload.cnpj,
        p_id_externo: payload.id_externo,
        p_data_pedido: payload.data_pedido,
        p_valor_bruto: payload.valor_bruto,
        p_valor_liquido: payload.valor_liquido,
        p_condicao_solicitada: payload.condicao_solicitada,
        p_forma_solicitada: payload.forma_solicitada,
        p_desconto_pct: payload.desconto_pct ?? null,
        p_vendedor: payload.vendedor ?? null,
        p_origem: payload.origem ?? null,
        p_itens_json: payload.itens_json ?? null,
        p_recebido_via: payload.recebido_via ?? "api",
      });
      if (error) throw error;
      return data as CriarAnaliseResponse;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["analises-fila"] });

      if (data.analise_id) {
        qc.invalidateQueries({ queryKey: ["analise-detalhe", data.analise_id] });
      }

      toast({
        title: data.status === "ja_existe" ? "Análise já existente" : "Análise criada",
        description: data.analise_id
          ? `ID: ${data.analise_id.slice(0, 8)}...`
          : `Pedido: ${data.pedido_id.slice(0, 8)}...`,
      });
    },
    onError: (e: Error) => {
      toast({
        title: "Erro ao criar análise",
        description: e.message,
        variant: "destructive",
      });
    },
  });
}
