import { supabase } from "@/integrations/supabase/client";

export interface ExtensaoTarefa {
  id: string;
  extensao_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  area_destino: string | null;
  sistema_origem: string | null;
  responsavel_role: string | null;
  accountable_role: string | null;
  prazo_dias: number;
  prioridade: string | null;
  bloqueante: boolean | null;
  motivo_bloqueio: string | null;
  link_acao: string | null;
}

export interface Extensao {
  id: string;
  categoria_id: string;
  dimensao: "cargo" | "departamento" | "sistema";
  referencia_id: string | null;
  referencia_label: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

export interface ExtensaoComTarefas {
  extensao: Extensao;
  tarefas: ExtensaoTarefa[];
}

/**
 * Busca todas as extensões aplicáveis a um colaborador específico para uma categoria de processo.
 * Filtra por: cargo (id), departamento (label/valor), e sistemas (ids dos parametros).
 */
export async function fetchExtensoesAplicaveis(params: {
  categoriaId: string;
  cargoId?: string | null;
  departamentoLabel?: string | null;
  sistemasIds?: string[];
  sistemasLabels?: string[];
}): Promise<ExtensaoComTarefas[]> {
  const { categoriaId, cargoId, departamentoLabel, sistemasIds, sistemasLabels } = params;

  // Build OR conditions
  const orParts: string[] = [];
  if (cargoId) {
    orParts.push(`and(dimensao.eq.cargo,referencia_id.eq.${cargoId})`);
  }
  if (departamentoLabel) {
    // Departamento can be matched by referencia_id (param uuid) OR referencia_label
    orParts.push(`and(dimensao.eq.departamento,referencia_label.eq.${departamentoLabel})`);
  }
  if (sistemasIds && sistemasIds.length > 0) {
    orParts.push(`and(dimensao.eq.sistema,referencia_id.in.(${sistemasIds.join(",")}))`);
  }
  if (sistemasLabels && sistemasLabels.length > 0) {
    const labelsCsv = sistemasLabels.map((l) => `"${l}"`).join(",");
    orParts.push(`and(dimensao.eq.sistema,referencia_label.in.(${labelsCsv}))`);
  }

  if (orParts.length === 0) return [];

  const { data: extensoes, error } = await (supabase as any)
    .from("sncf_template_extensoes")
    .select("*")
    .eq("categoria_id", categoriaId)
    .eq("ativo", true)
    .or(orParts.join(","));

  if (error) {
    console.error("Erro ao buscar extensões:", error);
    return [];
  }

  if (!extensoes || extensoes.length === 0) return [];

  const ids = extensoes.map((e: any) => e.id);
  const { data: tarefas, error: errT } = await (supabase as any)
    .from("sncf_template_extensoes_tarefas")
    .select("*")
    .in("extensao_id", ids)
    .order("ordem");

  if (errT) {
    console.error("Erro ao buscar tarefas de extensões:", errT);
  }

  return extensoes.map((ext: any) => ({
    extensao: ext as Extensao,
    tarefas: ((tarefas ?? []) as ExtensaoTarefa[]).filter((t) => t.extensao_id === ext.id),
  }));
}
