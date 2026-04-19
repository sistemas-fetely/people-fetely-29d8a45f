import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type ContextoSalario =
  | "proprio"
  | "folha"
  | "holerite"
  | "admissao"
  | "convite"
  | "revisao_salarial"
  | "recrutamento"
  | "dashboard_custos"
  | "organograma"
  | "relatorio_pj"
  | "auditoria";

type Modo = "direto" | "revelar_com_log" | "oculto";

const TTL_MS = 15 * 60 * 1000; // sessão de 15min (Beatriz)

interface RevelacaoSessao {
  userId: string;
  expiraEm: number;
}

/**
 * Regra 7 — Visibilidade de Salário (S1+S2).
 * Consulta a função `decisao_salario` no banco e cacheia em React Query (5min).
 * Suporta revelação individual (com log) e em lote (com justificativa LGPD).
 */
export function useSalarioVisivel(contexto: ContextoSalario) {
  const { user } = useAuth();
  const viewerId = user?.id;
  const queryClient = useQueryClient();
  const [revelados, setRevelados] = useState<RevelacaoSessao[]>([]);

  // Limpeza periódica de entradas expiradas
  useEffect(() => {
    const interval = setInterval(() => {
      setRevelados((prev) => prev.filter((r) => r.expiraEm > Date.now()));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Consulta o modo aplicável para um alvo. Cacheia globalmente via React Query
   * por (viewer, alvo, contexto) com staleTime de 5min — evita N RPCs em listas grandes.
   */
  const consultarModo = useCallback(
    async (alvoUserId: string | null): Promise<Modo> => {
      if (!viewerId) return "oculto";
      if (alvoUserId && alvoUserId === viewerId) return "direto";

      const cacheKey = ["decisao-salario", viewerId, alvoUserId ?? "__null__", contexto];
      const cached = queryClient.getQueryData<Modo>(cacheKey);
      if (cached) return cached;

      const data = await queryClient.fetchQuery({
        queryKey: cacheKey,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
          const { data, error } = await supabase.rpc("decisao_salario", {
            _viewer_id: viewerId,
            _alvo_user_id: alvoUserId,
            _contexto: contexto,
          });
          if (error) return "oculto" as Modo;
          return ((data as Modo) || "oculto") as Modo;
        },
      });
      return data;
    },
    [viewerId, contexto, queryClient],
  );

  /** Revela um único alvo. Se modo=revelar_com_log, registra log. */
  const revelar = useCallback(
    async (alvoUserId: string): Promise<boolean> => {
      if (!viewerId) return false;
      if (alvoUserId === viewerId) return true;

      const modo = await consultarModo(alvoUserId);
      if (modo === "oculto") return false;

      if (modo === "revelar_com_log") {
        try {
          await supabase.rpc("registrar_acesso_dado", {
            _alvo_user_id: alvoUserId,
            _tipo_dado: "salario",
            _tabela_origem: "politica",
            _contexto: contexto,
          });
        } catch {
          /* log não bloqueia */
        }
      }

      setRevelados((prev) => {
        const semEste = prev.filter((r) => r.userId !== alvoUserId);
        return [...semEste, { userId: alvoUserId, expiraEm: Date.now() + TTL_MS }];
      });
      return true;
    },
    [viewerId, contexto, consultarModo],
  );

  /** Revela em lote com justificativa LGPD. Retorna nº de alvos efetivamente revelados. */
  const revelarLote = useCallback(
    async (alvoUserIds: string[], justificativa: string): Promise<number> => {
      if (!viewerId || alvoUserIds.length === 0) return 0;
      if (!justificativa || justificativa.trim().length < 5) return 0;

      const permitidos: string[] = [];
      for (const alvoId of alvoUserIds) {
        if (!alvoId || alvoId === viewerId) continue;
        const modo = await consultarModo(alvoId);
        if (modo !== "oculto") permitidos.push(alvoId);
      }
      if (permitidos.length === 0) return 0;

      try {
        await supabase.rpc("registrar_acesso_salario_lote", {
          _alvo_user_ids: permitidos,
          _contexto: contexto,
          _justificativa: justificativa.trim(),
        });
      } catch {
        /* log não bloqueia */
      }

      const expiraEm = Date.now() + TTL_MS;
      setRevelados((prev) => {
        const existentes = new Set(prev.map((r) => r.userId));
        const novos = permitidos
          .filter((id) => !existentes.has(id))
          .map((userId) => ({ userId, expiraEm }));
        return [...prev, ...novos];
      });
      return permitidos.length;
    },
    [viewerId, contexto, consultarModo],
  );

  const estaRevelado = useCallback(
    (alvoUserId: string | null | undefined): boolean => {
      if (!alvoUserId) return false;
      if (alvoUserId === viewerId) return true;
      const entry = revelados.find((r) => r.userId === alvoUserId);
      if (!entry) return false;
      return entry.expiraEm > Date.now();
    },
    [revelados, viewerId],
  );

  // ── Compatibilidade com a API antiga (V1) ──────────────────────────────
  // Algumas telas usam `useSalarioVisivel()` sem contexto + métodos `podeVer`.
  // Mantemos esses métodos como wrappers síncronos baseados em cache existente.
  const podeVer = useCallback(
    (alvoUserId: string | null | undefined) => {
      if (!viewerId) return false;
      if (alvoUserId && alvoUserId === viewerId) return true;
      const cacheKey = ["decisao-salario", viewerId, alvoUserId ?? "__null__", contexto];
      const cached = queryClient.getQueryData<Modo>(cacheKey);
      if (cached === "direto" || cached === "revelar_com_log") return true;
      if (cached === "oculto") return false;
      // Sem cache: dispara consulta async em background; retorna false otimisticamente.
      void consultarModo(alvoUserId ?? null);
      return false;
    },
    [viewerId, contexto, queryClient, consultarModo],
  );

  return { consultarModo, estaRevelado, revelar, revelarLote, podeVer };
}
