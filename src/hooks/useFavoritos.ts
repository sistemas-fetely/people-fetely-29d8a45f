import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaginaFavorita {
  id: string;
  rota: string;
  titulo: string;
  pilar: string | null;
  ordem: number;
  criado_em: string;
}

export function useFavoritos() {
  const { user } = useAuth();
  const [favoritos, setFavoritos] = useState<PaginaFavorita[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("usuario_paginas_favoritas")
      .select("id, rota, titulo, pilar, ordem, criado_em")
      .eq("user_id", user.id)
      .order("ordem")
      .order("criado_em");
    if (data) setFavoritos(data as PaginaFavorita[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const isFavorito = useCallback(
    (rota: string) => favoritos.some((f) => f.rota === rota),
    [favoritos]
  );

  const toggleFavorito = useCallback(
    async (rota: string, titulo: string, pilar?: string) => {
      if (!user?.id) return;

      const existe = favoritos.find((f) => f.rota === rota);
      if (existe) {
        await supabase.from("usuario_paginas_favoritas").delete().eq("id", existe.id);
        setFavoritos((prev) => prev.filter((f) => f.id !== existe.id));
        toast.success("Removido dos favoritos");
      } else {
        const { data } = await supabase
          .from("usuario_paginas_favoritas")
          .insert({
            user_id: user.id,
            rota,
            titulo,
            pilar: pilar || null,
            ordem: favoritos.length,
          })
          .select()
          .single();
        if (data) {
          setFavoritos((prev) => [...prev, data as PaginaFavorita]);
          toast.success("Adicionado aos favoritos ⭐");
        }
      }
    },
    [user?.id, favoritos]
  );

  return { favoritos, loading, isFavorito, toggleFavorito, refresh: carregar };
}
