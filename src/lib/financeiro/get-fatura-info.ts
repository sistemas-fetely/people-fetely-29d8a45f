/**
 * Helper: enriquece contas a pagar com info de fatura de cartão.
 *
 * Dado um array de IDs de contas_pagar_receber, retorna um Map onde:
 *   key   = conta_pagar_id
 *   value = { banco_nome, fatura_vencimento }
 *
 * Faz UMA query em fatura_cartao_lancamentos com embed PostgREST nas relações.
 * Se uma conta não estiver vinculada a fatura, simplesmente não aparece no Map.
 *
 * Reusável em: OFX Stage, Modal Múltiplos, ContasPagar, e qualquer tela
 * que precise mostrar "qual fatura essa despesa de cartão pertence".
 *
 * Doutrina: dado já existe no banco — apenas trazido à superfície.
 */

import { supabase } from "@/integrations/supabase/client";

export type FaturaInfo = {
  banco_nome: string | null;
  fatura_vencimento: string | null;
};

export async function getFaturaInfoMap(
  contaPagarIds: string[],
): Promise<Map<string, FaturaInfo>> {
  const map = new Map<string, FaturaInfo>();
  if (!contaPagarIds.length) return map;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("fatura_cartao_lancamentos")
    .select(
      `
        conta_pagar_id,
        fatura:faturas_cartao!inner (
          data_vencimento,
          conta_bancaria:contas_bancarias ( nome_exibicao )
        )
      `,
    )
    .in("conta_pagar_id", contaPagarIds);

  if (error) {
    // Falha silenciosa: tela continua funcionando sem a info enriquecida.
    console.warn("[getFaturaInfoMap] falha ao buscar info de fatura:", error);
    return map;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data || []) as any[]) {
    if (!row.conta_pagar_id) continue;
    map.set(row.conta_pagar_id, {
      banco_nome: row.fatura?.conta_bancaria?.nome_exibicao ?? null,
      fatura_vencimento: row.fatura?.data_vencimento ?? null,
    });
  }

  return map;
}
