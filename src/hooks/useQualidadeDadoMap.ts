import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  indexQualidadePorConta,
  type QualidadeDado,
} from "@/lib/financeiro/qualidade-dado-icon";

/**
 * Hook que carrega o mapa de qualidade do dado pra um conjunto de contas.
 *
 * Doutrina (29/04/2026): batch RPC, 1 query por página de tabela.
 * Frontend usa o mapa retornado pra renderizar bolinha por linha.
 *
 * Uso:
 *   const ids = useMemo(() => contas.map(c => c.id), [contas]);
 *   const { data: qualidadeMap } = useQualidadeDadoMap(ids);
 *   const q = qualidadeMap?.get(conta.id);
 *   const visual = getQualidadeDadoIcon(q?.nivel, q?.motivos);
 */
export function useQualidadeDadoMap(contaIds: string[] | undefined) {
  const ids = contaIds || [];
  return useQuery({
    queryKey: ["qualidade-dado-map", ids.join(",")],
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<Map<string, QualidadeDado>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("qualidade_dado_contas", {
        p_conta_ids: ids,
      });
      if (error) throw error;
      return indexQualidadePorConta((data || []) as QualidadeDado[]);
    },
  });
}
