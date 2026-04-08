import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Parametro {
  id: string;
  categoria: string;
  valor: string;
  label: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
}

export function useParametros(categoria: string) {
  return useQuery({
    queryKey: ["parametros", categoria],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametros")
        .select("*")
        .eq("categoria", categoria)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as Parametro[];
    },
  });
}

export function useAllParametros() {
  return useQuery({
    queryKey: ["parametros", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametros")
        .select("*")
        .order("categoria")
        .order("ordem");
      if (error) throw error;
      return data as Parametro[];
    },
  });
}
