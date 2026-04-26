import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contaId } = await req.json();
    if (!contaId) throw new Error("contaId é obrigatório");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados da conta
    const { data: conta, error: errConta } = await supabase
      .from("contas_pagar_receber")
      .select("*")
      .eq("id", contaId)
      .single();

    if (errConta || !conta) {
      throw new Error("Conta não encontrada: " + (errConta?.message || ""));
    }

    // Buscar parceiro (se houver)
    let parceiroNome = conta.fornecedor_cliente || "Não informado";
    if (conta.parceiro_id) {
      const { data: parceiro } = await supabase
        .from("parceiros_comerciais")
        .select("razao_social, nome_fantasia")
        .eq("id", conta.parceiro_id)
        .maybeSingle();
      if (parceiro) {
        parceiroNome =
          parceiro.razao_social || parceiro.nome_fantasia || parceiroNome;
      }
    }

    // Buscar documentos NF anexados
    const { data: docs } = await supabase
      .from("contas_pagar_documentos")
      .select("*")
      .eq("conta_id", contaId)
      .in("tipo", ["nf", "nota_fiscal", "recibo"])
      .order("created_at", { ascending: false });

    const temNF = !!(docs && docs.length > 0);

    // Email do financeiro (configurável)
    const { data: configFin } = await supabase
      .from("config_financeiro_externo")
      .select("email")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    const emailFinanceiro = configFin?.email || "financeiro@fetely.com.br";

    const valorFormatado = `R$ ${Number(conta.valor)
      .toFixed(2)
      .replace(".", ",")}`;
    const vencimentoFormatado = new Date(
      conta.data_vencimento,
    ).toLocaleDateString("pt-BR");

    const assunto = temNF
      ? `Conta aprovada: ${conta.descricao}`
      : `Conta aprovada (NF pendente): ${conta.descricao}`;

    const alertaNF = !temNF
      ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin:16px 0;border-radius:4px;">
          <strong style="color:#92400e;">⚠️ Nota Fiscal Pendente</strong>
          <p style="margin:4px 0 0;color:#78350f;">Esta conta foi aprovada sem anexo de Nota Fiscal. O documento deverá ser anexado posteriormente.</p>
        </div>`
      : "";

    const corpo = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
        <h2 style="color:#1e40af;margin-top:0;">Conta aprovada para pagamento</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px 0;color:#6b7280;">Fornecedor:</td><td style="padding:8px 0;font-weight:600;">${parceiroNome}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Descrição:</td><td style="padding:8px 0;">${conta.descricao}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Valor:</td><td style="padding:8px 0;font-weight:600;">${valorFormatado}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Vencimento:</td><td style="padding:8px 0;">${vencimentoFormatado}</td></tr>
          ${conta.nf_numero ? `<tr><td style="padding:8px 0;color:#6b7280;">NF nº:</td><td style="padding:8px 0;">${conta.nf_numero}</td></tr>` : ""}
        </table>
        ${alertaNF}
        <p style="font-size:12px;color:#9ca3af;margin-top:32px;">Este email foi enviado automaticamente pelo sistema Fetely SNCF.</p>
      </div>
    `;

    // Montar anexos (download das NFs)
    const attachments: Array<{ filename: string; content: string }> = [];
    if (temNF && docs) {
      for (const doc of docs.slice(0, 3)) {
        try {
          const { data: file } = await supabase.storage
            .from("documentos-financeiro")
            .download(doc.storage_path);
          if (file) {
            const buffer = await file.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(buffer).reduce(
                (acc, b) => acc + String.fromCharCode(b),
                "",
              ),
            );
            attachments.push({
              filename: doc.nome_arquivo,
              content: base64,
            });
          }
        } catch (e) {
          console.error("Erro ao baixar anexo:", doc.nome_arquivo, e);
        }
      }
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const emailPayload: Record<string, unknown> = {
      from: "SNCF Fetely <noreply@fetely.com.br>",
      to: [emailFinanceiro],
      subject: assunto,
      html: corpo,
    };
    if (attachments.length > 0) emailPayload.attachments = attachments;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend error: ${errorData}`);
    }

    const emailResult = await response.json();

    // Atualizar status da conta
    const novoStatus = temNF ? "aguardando_pagamento" : "nf_pendente";

    await supabase
      .from("contas_pagar_receber")
      .update({
        status: novoStatus,
        email_enviado_em: new Date().toISOString(),
      })
      .eq("id", contaId);

    // Histórico
    await supabase.from("contas_pagar_historico").insert({
      conta_id: contaId,
      status_anterior: "aprovado",
      status_novo: novoStatus,
      observacao: temNF
        ? "Email enviado com NF anexada"
        : "Email enviado - NF pendente",
    });

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        novoStatus,
        temNF,
        anexos: attachments.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Erro:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
