import { useState, useCallback } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Regra 7 — Salário hidden por default + log de consulta.
 *
 * - O próprio usuário sempre vê o próprio salário.
 * - Super admin sempre vê.
 * - Demais: precisam ter permissão de view em "cargos" ou "folha_pagamento".
 * - Toda revelação dispara registrar_acesso_dado (Regra 13).
 */
export function useSalarioVisivel() {
  const { user } = useAuth();
  const { canAccess, isSuperAdmin } = usePermissions();
  const [reveladoPara, setReveladoPara] = useState<Set<string>>(new Set());

  const podeVer = useCallback(
    (targetUserId: string | null | undefined) => {
      if (!targetUserId) return isSuperAdmin || canAccess("cargos", "view") || canAccess("folha_pagamento", "view");
      if (targetUserId === user?.id) return true;
      if (isSuperAdmin) return true;
      return canAccess("cargos", "view") || canAccess("folha_pagamento", "view");
    },
    [user?.id, isSuperAdmin, canAccess],
  );

  const revelar = useCallback(
    async (targetUserId: string | null | undefined, contexto: string) => {
      if (!targetUserId) {
        // Sem user_id alvo (ex.: registro avulso) — só revela visualmente.
        setReveladoPara((prev) => new Set(prev).add("__sem_user__"));
        return true;
      }
      if (!podeVer(targetUserId)) return false;

      if (targetUserId !== user?.id) {
        try {
          await supabase.rpc("registrar_acesso_dado", {
            _alvo_user_id: targetUserId,
            _tipo_dado: "salario",
            _tabela_origem: "remuneracoes",
            _contexto: contexto,
          });
        } catch {
          // Falha de log não bloqueia visualização.
        }
      }

      setReveladoPara((prev) => new Set(prev).add(targetUserId));
      return true;
    },
    [user?.id, podeVer],
  );

  const estaRevelado = useCallback(
    (targetUserId: string | null | undefined) => {
      if (!targetUserId) return reveladoPara.has("__sem_user__");
      if (targetUserId === user?.id) return true; // próprio sempre revelado
      return reveladoPara.has(targetUserId);
    },
    [reveladoPara, user?.id],
  );

  return { podeVer, revelar, estaRevelado };
}
