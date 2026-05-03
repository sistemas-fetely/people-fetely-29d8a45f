/**
 * Helper TS compartilhado pra disparar a geração do Resumo NF-e (Fase B).
 * Usado pelo botão em NFsStage e DocumentosPendentes.
 *
 * Doutrina #11 — botão e trigger reusam mesma lógica (a edge worker
 * `processar-resumos-nfe-pendentes` é o ponto único de entrada).
 */

import { supabase } from "@/integrations/supabase/client";

export interface ResultadoResumoNFe {
  ok: boolean;
  erro?: string;
  storage_path?: string;
  documentos_inseridos?: number;
}

export async function gerarResumoNFe(
  nfsStageId: string,
): Promise<ResultadoResumoNFe> {
  const { data, error } = await supabase.functions.invoke(
    "processar-resumos-nfe-pendentes",
    { body: { nfs_stage_id: nfsStageId } },
  );
  if (error) {
    return { ok: false, erro: error.message };
  }
  const r = data?.resultados?.[0];
  if (!r) return { ok: false, erro: "Sem retorno do worker" };
  return r as ResultadoResumoNFe;
}

export async function regerarResumoNFe(
  nfsStageId: string,
): Promise<ResultadoResumoNFe> {
  // 1. Marca pra regerar (apaga doc anterior, zera flag)
  const { error: rpcErr } = await supabase.rpc(
    "marcar_resumo_nfe_para_regerar" as never,
    { _nfs_stage_id: nfsStageId } as never,
  );
  if (rpcErr) return { ok: false, erro: rpcErr.message };

  // 2. Dispara geração imediata
  return gerarResumoNFe(nfsStageId);
}
