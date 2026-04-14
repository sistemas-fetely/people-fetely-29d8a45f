import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Cargo {
  id: string;
  nome: string;
  nivel: string;
  departamento: string | null;
  tipo_contrato: string;
  is_clevel: boolean;
  protege_salario: boolean;
  faixa_clt_f1_min: number | null;
  faixa_clt_f1_max: number | null;
  faixa_clt_f2_min: number | null;
  faixa_clt_f2_max: number | null;
  faixa_clt_f3_min: number | null;
  faixa_clt_f3_max: number | null;
  faixa_clt_f4_min: number | null;
  faixa_clt_f4_max: number | null;
  faixa_clt_f5_min: number | null;
  faixa_clt_f5_max: number | null;
  faixa_pj_f1_min: number | null;
  faixa_pj_f1_max: number | null;
  faixa_pj_f2_min: number | null;
  faixa_pj_f2_max: number | null;
  faixa_pj_f3_min: number | null;
  faixa_pj_f3_max: number | null;
  faixa_pj_f4_min: number | null;
  faixa_pj_f4_max: number | null;
  faixa_pj_f5_min: number | null;
  faixa_pj_f5_max: number | null;
  ativo: boolean;
  missao: string | null;
  responsabilidades: string[];
  skills_obrigatorias: string[];
  skills_desejadas: string[];
  ferramentas: string[];
}

export function useCargos(filtroTipo?: "clt" | "pj" | "ambos") {
  return useQuery({
    queryKey: ["cargos", filtroTipo],
    queryFn: async () => {
      let query = supabase
        .from("cargos")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (filtroTipo && filtroTipo !== "ambos") {
        query = query.in("tipo_contrato", [filtroTipo, "ambos"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Cargo[];
    },
  });
}

export function useAllCargos() {
  return useQuery({
    queryKey: ["cargos", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cargos")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as Cargo[];
    },
  });
}

export function useCargoById(id: string | null) {
  return useQuery({
    queryKey: ["cargo", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("cargos")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Cargo;
    },
    enabled: !!id,
  });
}
