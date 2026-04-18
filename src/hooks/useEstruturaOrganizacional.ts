import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Departamento {
  id: string;
  valor: string;
  label: string;
  pai_valor: string;
  perfil_area_codigo: string | null;
  ativo: boolean;
  ordem: number;
}

export interface AreaNegocio {
  id: string;
  valor: string;
  label: string;
  ordem: number;
  ativo: boolean;
  departamentos: Departamento[];
}

/**
 * Retorna a estrutura organizacional completa: áreas com seus departamentos aninhados.
 * Hook central para todos os formulários consumirem (V3-C+).
 */
export function useEstruturaOrganizacional() {
  return useQuery({
    queryKey: ["estrutura-organizacional"],
    queryFn: async (): Promise<AreaNegocio[]> => {
      const { data, error } = await supabase
        .from("parametros")
        .select("id, categoria, valor, label, pai_valor, perfil_area_codigo, ativo, ordem")
        .in("categoria", ["area_negocio", "departamento"])
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;

      const rows = (data || []) as Array<{
        id: string;
        categoria: string;
        valor: string;
        label: string;
        pai_valor: string | null;
        perfil_area_codigo: string | null;
        ativo: boolean;
        ordem: number;
      }>;

      const areas = rows
        .filter((p) => p.categoria === "area_negocio")
        .map((a): AreaNegocio => ({
          id: a.id,
          valor: a.valor,
          label: a.label,
          ordem: a.ordem,
          ativo: a.ativo,
          departamentos: rows
            .filter((p) => p.categoria === "departamento" && p.pai_valor === a.valor)
            .sort((x, y) => x.ordem - y.ordem)
            .map((d): Departamento => ({
              id: d.id,
              valor: d.valor,
              label: d.label,
              pai_valor: d.pai_valor as string,
              perfil_area_codigo: d.perfil_area_codigo,
              ativo: d.ativo,
              ordem: d.ordem,
            })),
        }));

      return areas;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Retorna a área dona de um departamento + o perfil que deve ser aplicado */
export function useDepartamentoInfo(departamentoId: string | null) {
  return useQuery({
    queryKey: ["departamento-info", departamentoId],
    enabled: !!departamentoId,
    queryFn: async () => {
      if (!departamentoId) return null;
      const { data, error } = await supabase.rpc("perfil_area_do_departamento", {
        _departamento_id: departamentoId,
      });
      if (error) throw error;
      return (data && data[0]) || null;
    },
  });
}
