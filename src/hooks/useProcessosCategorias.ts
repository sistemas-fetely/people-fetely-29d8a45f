import { useCallback, useEffect, useState } from "react";
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

export const MODULOS_ORIGEM = [
  { value: "rh", label: "RH" },
  { value: "people", label: "People" },
  { value: "ti", label: "TI" },
  { value: "compras", label: "Compras" },
  { value: "financeiro", label: "Financeiro" },
  { value: "comercial", label: "Comercial" },
  { value: "operacional", label: "Operacional" },
  { value: "estrategico", label: "Estratégico" },
  { value: "outros", label: "Outros" },
];

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
