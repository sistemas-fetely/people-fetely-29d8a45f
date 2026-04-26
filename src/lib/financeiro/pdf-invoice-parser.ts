/**
 * Parser de PDF Invoice/Receipt usando IA via Edge Function
 * Para invoices internacionais SEM NF brasileira (Lovable, Anthropic, etc.)
 */

import { supabase } from "@/integrations/supabase/client";
import type { NFParsed, RegraCategorizacao } from "./types";

export async function parsePdfInvoice(
  file: File,
  regras: RegraCategorizacao[] = [],
): Promise<NFParsed> {
  const formData = new FormData();
  formData.append("file", file);

  const { data, error } = await supabase.functions.invoke("parse-pdf-invoice", {
    body: formData,
  });

  if (error) {
    console.error("Erro na edge function parse-pdf-invoice:", error);
    throw new Error(error.message || "Erro ao processar PDF");
  }

  if (!data?.success || !data?.data) {
    throw new Error("Resposta inválida da IA");
  }

  const extracted = data.data as Record<string, any>;

  let nfParsed: NFParsed = {
    nf_numero: String(extracted.invoice_number || file.name.replace(/\.pdf$/i, "")),
    nf_data_emissao: typeof extracted.date === "string" ? extracted.date : null,
    fornecedor_nome: extracted.vendor || "Fornecedor Internacional",
    fornecedor_cnpj: "",
    valor: Number(extracted.amount) || 0,
    nf_valor_produtos: Number(extracted.amount) || 0,
    nf_natureza_operacao: extracted.description || "Serviço Internacional",
    meio_pagamento: extracted.payment_method || "Cartão Crédito",
    _source: "pdf_invoice",
  };

  if (regras && regras.length > 0) {
    const { aplicarRegras } = await import("@/hooks/useRegrasCategorizacao");
    nfParsed = aplicarRegras(nfParsed, regras);
  }

  return nfParsed;
}
