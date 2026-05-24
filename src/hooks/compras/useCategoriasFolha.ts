import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CategoriaFolhaTipo = "despesa" | "receita" | "investimento" | "imposto";

export interface CategoriaFolha {
  id: string;
  nome: string;
  codigo: string;
  paiNome: string | null;
  paiCodigo: string | null;
}

export function useCategoriasFolha(tipo: CategoriaFolhaTipo = "despesa") {
  return useQuery({
    queryKey: ["plano-contas-folhas", tipo],
    queryFn: async (): Promise<CategoriaFolha[]> => {
      const { data, error } = await supabase
        .from("plano_contas")
        .select("id, codigo, nome, parent_id, nivel, tipo, ativo")
        .eq("ativo", true)
        .eq("tipo", tipo)
        .order("codigo");
      if (error) throw error;
      const rows = data || [];
      const map = new Map(rows.map((c) => [c.id, c]));
      const idsComFilho = new Set(rows.map((c) => c.parent_id).filter(Boolean));
      const folhas = rows.filter((c) => !idsComFilho.has(c.id));
      return folhas.map((folha) => {
        const pai = folha.parent_id ? map.get(folha.parent_id) : null;
        return {
          id: folha.id,
          nome: folha.nome,
          codigo: folha.codigo,
          paiNome: pai?.nome ?? null,
          paiCodigo: pai?.codigo ?? null,
        };
      });
    },
  });
}
