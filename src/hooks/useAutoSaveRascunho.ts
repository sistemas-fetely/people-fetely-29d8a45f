import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { NFParsed } from "@/lib/financeiro/types";

type TipoImportacao = "csv_qive" | "pdf_danfe" | "pdf_invoice";

const DEBOUNCE_MS = 2000;

/**
 * Auto-salva o preview de NFs no banco (tabela rascunhos_importacao)
 * com debounce de 2s. Retorna helpers para limpar e setar o id manualmente
 * (usado quando se restaura um rascunho existente).
 */
export function useAutoSaveRascunho(nfs: NFParsed[], tipo: TipoImportacao) {
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const rascunhoIdRef = useRef<string | null>(null);

  useEffect(() => {
    rascunhoIdRef.current = rascunhoId;
  }, [rascunhoId]);

  useEffect(() => {
    // Sem nada a salvar -> nada a fazer
    if (!nfs || nfs.length === 0) return;

    const timeout = setTimeout(async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return;

        // Remover File (não serializa em JSON)
        const nfsSerializaveis = nfs.map(({ _arquivo, ...rest }) => rest);

        const idAtual = rascunhoIdRef.current;
        if (idAtual) {
          await supabase
            .from("rascunhos_importacao")
            .update({
              nfs_json: nfsSerializaveis as never,
              updated_at: new Date().toISOString(),
            })
            .eq("id", idAtual);
        } else {
          const { data, error } = await supabase
            .from("rascunhos_importacao")
            .insert({
              usuario_id: userId,
              tipo_importacao: tipo,
              nfs_json: nfsSerializaveis as never,
            })
            .select("id")
            .single();
          if (!error && data?.id) {
            rascunhoIdRef.current = data.id;
            setRascunhoId(data.id);
          }
        }
      } catch {
        // silencioso — não interromper o fluxo
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [nfs, tipo]);

  async function clearRascunho() {
    const id = rascunhoIdRef.current;
    if (!id) return;
    try {
      await supabase.from("rascunhos_importacao").delete().eq("id", id);
    } catch {
      // ignore
    }
    rascunhoIdRef.current = null;
    setRascunhoId(null);
  }

  return { clearRascunho, setRascunhoId, rascunhoId };
}

/**
 * Restaura o rascunho mais recente do usuário para um determinado tipo de importação.
 * Retorna null se não houver.
 */
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
    const nfs = (data.nfs_json as unknown as NFParsed[]) || [];
    if (!Array.isArray(nfs) || nfs.length === 0) return null;
    return { id: data.id, nfs };
  } catch {
    return null;
  }
}
