import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HistoricoEntry {
  id: string;
  tipo: string;
  descricao: string;
  user_nome: string;
  status_anterior: string | null;
  status_novo: string | null;
  dados_extras: Record<string, unknown>;
  created_at: string;
}

/**
 * Lê a timeline de uma tarefa específica.
 * Recarrega quando o tarefaId muda.
 */
export function useTarefaHistorico(tarefaId: string | null) {
  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    if (!tarefaId) {
      setHistorico([]);
      return;
    }
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("sncf_tarefas_historico")
      .select("*")
      .eq("tarefa_id", tarefaId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Erro ao carregar histórico:", error);
      setHistorico([]);
    } else {
      setHistorico((data ?? []) as HistoricoEntry[]);
    }
    setLoading(false);
  }, [tarefaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { historico, loading, recarregar: carregar };
}

/**
 * Hook para registrar eventos no histórico de uma tarefa.
 * Use em CADA mudança de status, conclusão, delegação ou comentário.
 */
export function useRegistrarHistorico() {
  const { user, profile } = useAuth();

  const registrar = useCallback(
    async (
      tarefaId: string,
      tipo: string,
      descricao: string,
      extras?: {
        status_anterior?: string | null;
        status_novo?: string | null;
        dados_extras?: Record<string, unknown>;
      },
    ) => {
      if (!user?.id) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("sncf_tarefas_historico").insert({
        tarefa_id: tarefaId,
        user_id: user.id,
        user_nome: profile?.full_name || user.email || "Sistema",
        tipo,
        descricao,
        status_anterior: extras?.status_anterior ?? null,
        status_novo: extras?.status_novo ?? null,
        dados_extras: extras?.dados_extras ?? {},
      });
      if (error) console.error("Erro ao registrar histórico:", error);
    },
    [user, profile],
  );

  return { registrar };
}
