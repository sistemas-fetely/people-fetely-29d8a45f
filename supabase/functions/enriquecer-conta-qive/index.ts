import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QiveNFResponse {
  nf_numero: string;
  nf_serie: string;
  cnpj_emitente: string;
  razao_social_emitente: string;
  valor_total: number;
  data_emissao: string;
  forma_pagamento?: string;
  condicao_pagamento?: string;
}

function mapearFormaPagamento(formaQiveRaw?: string): string {
  if (!formaQiveRaw) return "Outros";
  const f = formaQiveRaw.toUpperCase();

  if (f.includes("CARTAO") || f.includes("CARTÃO") || f.includes("CREDITO") || f.includes("CRÉDITO")) {
    return "Cartão Crédito";
  }
  if (f.includes("PIX")) return "PIX";
  if (f.includes("BOLETO")) return "Boleto";
  if (f.includes("TED") || f.includes("TRANSF")) return "TED";
  if (f.includes("DINHEIRO")) return "Dinheiro";
  if (f.includes("DEBITO") && f.includes("AUTO")) return "Débito Automático";
  if (f.includes("DÉBITO") && f.includes("AUTO")) return "Débito Automático";
  return "Outros";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conta_id } = await req.json();
    if (!conta_id || typeof conta_id !== "string") {
      return new Response(JSON.stringify({ error: "conta_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conta, error: contaError } = await supabaseClient
      .from("contas_pagar_receber")
      .select("id, nf_numero, nf_serie, nf_chave_acesso, nf_cnpj_emitente, tipo")
      .eq("id", conta_id)
      .single();

    if (contaError || !conta) {
      return new Response(JSON.stringify({ error: "Conta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!conta.nf_chave_acesso && !conta.nf_numero) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Conta sem NF vinculada — não é possível enriquecer",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const qiveApiKey = Deno.env.get("QIVE_API_KEY");
    if (!qiveApiKey) {
      return new Response(
        JSON.stringify({
          error: "QIVE_API_KEY não configurada. Adicione a chave nos secrets do projeto para habilitar o enriquecimento.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const chave = conta.nf_chave_acesso || `${conta.nf_numero}-${conta.nf_serie ?? ""}`;

    const qiveResponse = await fetch(`https://api.qive.com.br/v1/nfe/${chave}`, {
      headers: {
        Authorization: `Bearer ${qiveApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!qiveResponse.ok) {
      const errorText = await qiveResponse.text();
      throw new Error(`Erro ao consultar Qive [${qiveResponse.status}]: ${errorText}`);
    }

    const nfData: QiveNFResponse = await qiveResponse.json();
    const formaPagamento = mapearFormaPagamento(nfData.forma_pagamento);

    const { error: updateError } = await supabaseClient
      .from("contas_pagar_receber")
      .update({
        forma_pagamento: formaPagamento,
        nf_cnpj_emitente: nfData.cnpj_emitente ?? conta.nf_cnpj_emitente,
        fornecedor_cliente: nfData.razao_social_emitente,
        dados_enriquecidos_qive: true,
      })
      .eq("id", conta_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Dados enriquecidos com sucesso!",
        dados: {
          forma_pagamento: formaPagamento,
          cnpj: nfData.cnpj_emitente,
          fornecedor: nfData.razao_social_emitente,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro enriquecer-conta-qive:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
