import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { NFParsed } from "@/lib/financeiro/types";

type TipoImportacao = "csv_qive" | "pdf_danfe" | "pdf_invoice";

export function useAutoSaveRascunho(nfs: NFParsed[], tipo: TipoImportacao) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rascunhoIdRef = useRef<string | null>(null);
  const lastToastRef = useRef<number>(0);

  useEffect(() => {
    // Sem NFs: limpa rascunho existente
    if (nfs.length === 0) {
      if (rascunhoIdRef.current) {
        const id = rascunhoIdRef.current;
        rascunhoIdRef.current = null;
        supabase.from("rascunhos_importacao").delete().eq("id", id);
      }
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return;

        if (rascunhoIdRef.current) {
          await supabase
            .from("rascunhos_importacao")
            .update({
              nfs_json: nfs as never,
              updated_at: new Date().toISOString(),
            })
            .eq("id", rascunhoIdRef.current);
        } else {
          // Antes de criar novo, tenta reaproveitar rascunho existente desse tipo
          const { data: existente } = await supabase
            .from("rascunhos_importacao")
            .select("id")
            .eq("usuario_id", userId)
            .eq("tipo_importacao", tipo)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existente?.id) {
            rascunhoIdRef.current = existente.id;
            await supabase
              .from("rascunhos_importacao")
              .update({
                nfs_json: nfs as never,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existente.id);
          } else {
            const { data, error } = await supabase
              .from("rascunhos_importacao")
              .insert({
                usuario_id: userId,
                tipo_importacao: tipo,
                nfs_json: nfs as never,
              })
              .select("id")
              .single();
            if (!error && data) rascunhoIdRef.current = data.id;
          }
        }

        // Toast discreto, no máximo a cada 10s
        const now = Date.now();
        if (now - lastToastRef.current > 10_000) {
          lastToastRef.current = now;
          toast.success(`💾 ${nfs.length} NFs salvas automaticamente`, {
            duration: 1800,
            position: "bottom-right",
          });
        }
      } catch (err) {
        console.error("Erro ao salvar rascunho:", err);
      }
    }, 2000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [nfs, tipo]);

  const clearRascunho = async () => {
    if (rascunhoIdRef.current) {
      const id = rascunhoIdRef.current;
      rascunhoIdRef.current = null;
      await supabase.from("rascunhos_importacao").delete().eq("id", id);
    }
  };

  const setRascunhoId = (id: string | null) => {
    rascunhoIdRef.current = id;
  };

  return { clearRascunho, setRascunhoId };
}

/** Restaura o rascunho mais recente do usuário para um tipo. */
export async function restaurarRascunho(
  tipo: TipoImportacao,
): Promise<{ id: string; nfs: NFParsed[] } | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("rascunhos_importacao")
      .select("id, nfs_json")
      .eq("usuario_id", userId)
      .eq("tipo_importacao", tipo)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    const nfs = data.nfs_json as unknown as NFParsed[];
    if (!Array.isArray(nfs) || nfs.length === 0) return null;
    return { id: data.id, nfs };
  } catch {
    return null;
  }
}
