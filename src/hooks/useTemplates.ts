import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CargoTemplate {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  nivel_sugerido: string | null;
  cargo_id: string | null;
  area: string | null;
  is_sistema: boolean;
  ativo: boolean;
}

export interface PreviewPerfil {
  perfil_nome: string;
  perfil_tipo: string;
  nivel: string | null;
  unidade_nome: string | null;
}

export function useTemplates() {
  return useQuery({
    queryKey: ["cargo-templates-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cargo_template")
        .select("*")
        .eq("ativo", true)
        .order("nivel_sugerido");
      if (error) throw error;
      return (data || []) as CargoTemplate[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePreviewTemplate(
  templateId: string | null,
  areaCodigo: string | null,
  unidadeId: string | null
) {
  return useQuery({
    queryKey: ["preview-template", templateId, areaCodigo, unidadeId],
    enabled: !!templateId,
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase.rpc("preview_template_cargo", {
        _template_id: templateId,
        _area_perfil_codigo: areaCodigo,
        _unidade_id: unidadeId,
      });
      if (error) throw error;
      return (data || []) as PreviewPerfil[];
    },
    staleTime: 0,
  });
}
