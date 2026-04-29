/**
 * Helper: enriquece contas a pagar com flags derivadas
 * (tem_doc_pendente, atrasada) que vivem em vw_contas_pagar_consolidado
 * mas não estão expostas em outras views (ex: vw_lancamentos_caixa_banco).
 *
 * Uma query, todas as flags. Padrão idêntico ao getFaturaInfoMap e
 * getCompromissoInfoMap — Map<conta_pagar_id, FlagsContaPagar>.
 *
 * Reusável em qualquer tela que precise mostrar Doc Pendente / Atrasada
 * fora da view consolidada.
 *
 * Doutrina: dado já existe no banco — apenas trazido à superfície.
 * Sem alterar view crítica, sem materializar nada.
 */

import { supabase } from "@/integrations/supabase/client";

export type FlagsContaPagar = {
  tem_doc_pendente: boolean;
  atrasada: boolean;
};

export async function getStatusFlagsMap(
  contaPagarIds: string[],
): Promise<Map<string, FlagsContaPagar>> {
  const map = new Map<string, FlagsContaPagar>();
  if (!contaPagarIds.length) return map;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("vw_contas_pagar_consolidado")
    .select("id, tem_doc_pendente, atrasada")
    .in("id", contaPagarIds);

  if (error) {
    console.warn("[getStatusFlagsMap] falha:", error);
    return map;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data || []) as any[]) {
    if (!row.id) continue;
    map.set(row.id, {
      tem_doc_pendente: !!row.tem_doc_pendente,
      atrasada: !!row.atrasada,
    });
  }

  return map;
}
