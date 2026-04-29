/**
 * Mapeamento de ORIGEM da conta a pagar para ícone Lucide + cor.
 *
 * Doutrina: indica visualmente que a conta tem origem rastreada
 * (cartão, NF, OFX, compromisso). Conta com origem 'manual' não
 * mostra ícone — não há rastreio externo.
 *
 * Reusável em: ContasPagar, CaixaBanco, FluxoCaixa, OFX Stage.
 */

import {
  CreditCard,
  FileText,
  Banknote,
  Repeat,
  Layers,
  Link2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VinculoOrigemIcon = {
  Icon: LucideIcon;
  cor: string;
  label: string;
  tooltip: string;
};

/**
 * Devolve ícone + cor + tooltip pra origem.
 * Retorna null se origem é 'manual' ou desconhecida (sem rastreio).
 */
export function getVinculoOrigemIcon(
  origem: string | null | undefined,
): VinculoOrigemIcon | null {
  if (!origem) return null;
  const o = origem.toLowerCase().trim();

  // Cartão de crédito
  if (o === "cartao" || o === "cartao_credito" || o.includes("cart")) {
    return {
      Icon: CreditCard,
      cor: "text-violet-600",
      label: "Cartão",
      tooltip: "Vinculado a lançamento de cartão de crédito",
    };
  }

  // Nota Fiscal (todas variações)
  if (o === "nf" || o.startsWith("nf_")) {
    let detalhe = "Nota Fiscal";
    if (o === "nf_qive") detalhe = "NF importada do Qive";
    else if (o === "nf_xml") detalhe = "NF importada via XML";
    else if (o === "nf_pj_interno") detalhe = "NF de prestador PJ";
    return {
      Icon: FileText,
      cor: "text-blue-600",
      label: "NF",
      tooltip: `Vinculado a ${detalhe}`,
    };
  }

  // OFX / Extrato bancário
  if (o === "ofx" || o === "ofx_avulso" || o.includes("ofx")) {
    return {
      Icon: Banknote,
      cor: "text-amber-600",
      label: "OFX",
      tooltip:
        o === "ofx_avulso"
          ? "Lançamento avulso de OFX"
          : "Vinculado a importação OFX",
    };
  }

  // Compromisso recorrente
  if (o === "recorrente") {
    return {
      Icon: Repeat,
      cor: "text-indigo-600",
      label: "Recorrente",
      tooltip: "Gerado por compromisso recorrente",
    };
  }

  // Compromisso parcelado
  if (o === "parcelado") {
    return {
      Icon: Layers,
      cor: "text-purple-600",
      label: "Parcelado",
      tooltip: "Parcela de compromisso parcelado",
    };
  }

  // Conta consolidada (cartão)
  if (o === "consolidada") {
    return {
      Icon: CreditCard,
      cor: "text-violet-700",
      label: "Consolidada",
      tooltip: "Conta consolidada de fatura de cartão",
    };
  }

  // Bling
  if (o === "bling") {
    return {
      Icon: Link2,
      cor: "text-cyan-600",
      label: "Bling",
      tooltip: "Sincronizado com Bling",
    };
  }

  // 'manual' e desconhecidos: sem ícone (não há vínculo externo)
  return null;
}
