/**
 * Helper: enriquece contas a pagar com info de compromisso (recorrente/parcelado).
 *
 * Dado um array de IDs de contas_pagar_receber, retorna um Map onde:
 *   key   = conta_pagar_id
 *   value = { tipo: 'recorrente' | 'parcelado', titulo: string }
 *
 * Faz UMA query em contas_pagar_receber com embed PostgREST nas relações
 * compromisso_recorrente e compromisso_parcelado.
 *
 * Se uma conta não tiver vínculo, simplesmente não aparece no Map.
 *
 * Reusável em: ContasPagar, CaixaBanco, OFX Stage, Modal Múltiplos.
 *
 * Doutrina: dado já existe no banco (FKs) — apenas trazido à superfície.
 */

import { supabase } from "@/integrations/supabase/client";

export type CompromissoInfo = {
  tipo: "recorrente" | "parcelado";
  titulo: string;
  // Pra parcelado: parcela atual e total (ex: 2 de 3)
  parcela_atual?: number | null;
  parcela_total?: number | null;
};

export async function getCompromissoInfoMap(
  contaPagarIds: string[],
): Promise<Map<string, CompromissoInfo>> {
  const map = new Map<string, CompromissoInfo>();
  if (!contaPagarIds.length) return map;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("contas_pagar_receber")
    .select(
      `
        id,
        compromisso_recorrente_id,
        compromisso_parcelado_id,
        numero_parcela,
        compromisso_recorrente:compromissos_recorrentes (
          descricao
        ),
        compromisso_parcelado:compromissos_parcelados (
          descricao,
          qtd_parcelas
        )
      `,
    )
    .in("id", contaPagarIds);

  if (error) {
    console.warn("[getCompromissoInfoMap] falha:", error);
    return map;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data || []) as any[]) {
    if (row.compromisso_recorrente_id && row.compromisso_recorrente) {
      map.set(row.id, {
        tipo: "recorrente",
        titulo: row.compromisso_recorrente.descricao ?? "Recorrente",
      });
    } else if (row.compromisso_parcelado_id && row.compromisso_parcelado) {
      map.set(row.id, {
        tipo: "parcelado",
        titulo: row.compromisso_parcelado.descricao ?? "Parcelado",
        parcela_atual: row.numero_parcela ?? null,
        parcela_total: row.compromisso_parcelado.qtd_parcelas ?? null,
      });
    }
  }

  return map;
}
