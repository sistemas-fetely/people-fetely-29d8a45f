import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FormaPagamento = {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
};

export function useFormasPagamento(somenteAtivos = true) {
  return useQuery({
    queryKey: ["formas-pagamento-fin", { somenteAtivos }],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any).from("formas_pagamento").select("id, codigo, nome, ativo").order("ordem");
      if (somenteAtivos) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as FormaPagamento[];
    },
  });
}
