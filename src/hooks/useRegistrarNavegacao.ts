import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ROTAS_IGNORADAS = ["/", "/login", "/logout", "/sncf"];

/**
 * Registra navegação do usuário autenticado nas rotas visitadas.
 * Usar 1x no AppLayout — aplica globalmente. Debounce de 3s por rota.
 */
export function useRegistrarNavegacao() {
  const { user } = useAuth();
  const location = useLocation();
  const ultimaRotaRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    const rota = location.pathname;
    if (ROTAS_IGNORADAS.includes(rota)) return;
    if (rota === ultimaRotaRef.current) return;

    ultimaRotaRef.current = rota;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void supabase.from("navegacao_log" as any).insert({
        user_id: user.id,
        rota,
        titulo: document.title || rota,
      } as any);
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, location.pathname]);
}

export interface AtalhoPersonalizado {
  rota: string;
  titulo: string;
  acessos: number;
  ultimo_acesso: string;
}

export function useMeusAtalhos(limite: number = 4) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["meus-atalhos", user?.id, limite],
    enabled: !!user,
    queryFn: async (): Promise<AtalhoPersonalizado[]> => {
      const { data, error } = await supabase.rpc("meus_atalhos_personalizados" as any, {
        _limite: limite,
      });
      if (error) throw error;
      return (data || []) as AtalhoPersonalizado[];
    },
    staleTime: 2 * 60 * 1000,
  });
}
