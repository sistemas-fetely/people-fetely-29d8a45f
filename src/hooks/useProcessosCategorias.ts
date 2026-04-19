import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProcessoCategoria {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  modulo_origem: string;
  icone: string | null;
  cor: string | null;
  natureza: "lista_tarefas" | "workflow" | "guia";
  ativo: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Hook para listar módulos de origem de processos.
 * Lê de `parametros.categoria='modulo_origem_processo'` (regra arquitetural:
 * dimensões sempre via tabela, nunca array literal no código).
 */
export function useModulosOrigem() {
  return useQuery({
    queryKey: ["parametros", "modulo_origem_processo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametros")
        .select("valor, label, ordem")
        .eq("categoria", "modulo_origem_processo")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return (data || []).map((p) => ({ value: p.valor, label: p.label }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export const NATUREZAS = [
  {
    value: "lista_tarefas",
    label: "Lista de Tarefas",
    icon: "📋",
    description: "Várias tarefas executadas em paralelo/sequência (como onboarding)",
    enabled: true,
  },
  {
    value: "workflow",
    label: "Workflow",
    icon: "🔀",
    description: "Processo com decisões e bifurcações",
    enabled: false,
  },
  {
    value: "guia",
    label: "Guia",
    icon: "📖",
    description: "Apenas orientação, sem ações obrigatórias",
    enabled: false,
  },
];

export const ICONES_DISPONIVEIS = [
  "workflow",
  "rocket",
  "log-out",
  "arrow-left-right",
  "shopping-cart",
  "dollar-sign",
  "file-text",
  "users",
  "briefcase",
  "clipboard-list",
  "settings",
  "zap",
];

export const CORES_PALETA = [
  "#1A4A3A",
  "#2563EB",
  "#9333EA",
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0891B2",
  "#64748B",
];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function useProcessosCategorias() {
  const [categorias, setCategorias] = useState<ProcessoCategoria[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("sncf_processos_categorias")
      .select("*")
      .order("ordem")
      .order("nome");
    if (error) toast.error("Erro ao carregar categorias: " + error.message);
    else setCategorias((data ?? []) as ProcessoCategoria[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { categorias, loading, recarregar: carregar };
}
