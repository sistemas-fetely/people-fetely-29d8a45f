import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Publicacao {
  id: string;
  tipo: string;
  subtipo: string | null;
  titulo: string;
  mensagem: string | null;
  emoji: string | null;
  foto_url: string | null;
  pessoa_alvo_nome: string | null;
  pessoa_alvo_tipo: string | null;
  cor_tema: string;
  data_evento: string | null;
  publicado_em: string;
  fixado: boolean;
}

/**
 * Busca publicações ativas do Mural Fetely.
 * Retorna em ordem: fixadas primeiro, depois mais recentes.
 */
export function usePublicacoesAtivas(limit = 20) {
  return useQuery({
    queryKey: ["mural-ativas", limit],
    queryFn: async (): Promise<Publicacao[]> => {
      const { data, error } = await supabase
        .from("mural_publicacoes")
        .select(
          "id, tipo, subtipo, titulo, mensagem, emoji, foto_url, pessoa_alvo_nome, pessoa_alvo_tipo, cor_tema, data_evento, publicado_em, fixado"
        )
        .eq("status", "publicada")
        .order("fixado", { ascending: false })
        .order("publicado_em", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as Publicacao[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Preferência pessoal: aparecer ou não no mural.
 */
export function useMinhaPreferenciaMural() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mural-pref", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from("mural_preferencias_usuario")
        .select("aparecer_no_mural")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.aparecer_no_mural ?? true;
    },
  });
}

export function useAtualizarPreferenciaMural() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aparecer: boolean) => {
      if (!user) throw new Error("Sem usuário");
      const { error } = await supabase
        .from("mural_preferencias_usuario")
        .upsert({
          user_id: user.id,
          aparecer_no_mural: aparecer,
          atualizado_em: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: (_, aparecer) => {
      toast.success(
        aparecer
          ? "Você vai aparecer no Mural Fetely 🌸"
          : "Preferência salva — não vai aparecer no mural."
      );
      queryClient.invalidateQueries({ queryKey: ["mural-pref"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar preferência"),
  });
}
