import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocLink {
  tipo: string;
  nome: string;
  url: string;
}

interface DocInput {
  tipo: string;
  nome_arquivo: string;
  storage_path: string;
}

const TIPO_DOC_LABEL: Record<string, string> = {
  nf: "NF",
  recibo: "Recibo",
  boleto: "Boleto",
  ticket_cartao: "Ticket cartão",
  comprovante: "Comprovante",
  contrato: "Contrato",
  outro: "Outro",
};

function formatBRL(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatDateBR(data: string | null | undefined): string {
  if (!data) return "—";
  const d = new Date(data);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, erro: "Nao autorizado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseService = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const cprId: string = body.cpr_id;
    const emailDestinatario: string = body.email_destinatario;
    const mensagemPersonalizada: string = body.mensagem_personalizada ?? "";
    const docs: DocInput[] = Array.isArray(body.docs) ? body.docs : [];

    if (!cprId || !emailDestinatario) {
      return new Response(
        JSON.stringify({ ok: false, erro: "cpr_id e email_destinatario sao obrigatorios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: cpr, error: cprError } = await supabaseService
      .from("contas_pagar_receber")
      .select(
        `id, valor, data_vencimento, nf_numero,
         dados_pagamento_fornecedor, observacao_pagamento,
         plano_contas:conta_id(codigo, nome),
         parceiros_comerciais:parceiro_id(razao_social)`,
      )
      .eq("id", cprId)
      .single();

    if (cprError || !cpr) {
      return new Response(
        JSON.stringify({ ok: false, erro: "CPR nao encontrada" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cprAny = cpr as any;
    const fornecedorNome = cprAny.parceiros_comerciais?.razao_social ?? "—";
    const categoriaTxt = cprAny.plano_contas
      ? `${cprAny.plano_contas.codigo ?? ""} ${cprAny.plano_contas.nome ?? ""}`.trim()
      : "—";
    const dadosPgto = cprAny.dados_pagamento_fornecedor ?? {};

    const linksDocs: DocLink[] = [];
    for (const doc of docs) {
      const { data: signed } = await supabaseService.storage
        .from("financeiro-docs")
        .createSignedUrl(doc.storage_path, 60 * 60 * 24 * 30);
      if (signed?.signedUrl) {
        linksDocs.push({
          tipo: TIPO_DOC_LABEL[doc.tipo] ?? doc.tipo,
          nome: doc.nome_arquivo,
          url: signed.signedUrl,
        });
      }
    }

    const emailResp = await fetch(
      `${supabaseUrl}/functions/v1/send-transactional-email`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({
          templateName: "pagamento-solicitacao",
          recipientEmail: emailDestinatario,
          idempotencyKey: `pgto-${cprId}-${Date.now()}`,
          templateData: {
            fornecedor: fornecedorNome,
            valor: formatBRL(cprAny.valor),
            vencimento: formatDateBR(cprAny.data_vencimento),
            nf_numero: cprAny.nf_numero || "—",
            categoria: categoriaTxt,
            banco: dadosPgto.banco || "—",
            agencia: dadosPgto.agencia || "—",
            conta_bancaria: dadosPgto.conta || "—",
            pix: dadosPgto.pix || "—",
            observacao: cprAny.observacao_pagamento || "—",
            mensagem_personalizada: mensagemPersonalizada,
            documentos_links: linksDocs,
            solicitante: user.email ?? "",
          },
        }),
      },
    );

    const emailOk = emailResp.ok;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emailJson: any = null;
    try {
      emailJson = await emailResp.json();
    } catch {
      // ignore
    }

    await supabaseService
      .from("contas_pagar_receber")
      .update({ email_pagamento_enviado: emailOk })
      .eq("id", cprId);

    if (!emailOk) {
      return new Response(
        JSON.stringify({
          ok: false,
          erro: emailJson?.error ?? "Falha ao enviar email",
          status: emailResp.status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        email_id: emailJson?.messageId ?? null,
        recipient: emailDestinatario,
        docs_anexados: linksDocs.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("Erro em enviar-email-pagamento:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, erro: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
