import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // 1. Fetch all email_enviado convites
    const { data: convites, error: fetchErr } = await supabase
      .from("convites_cadastro")
      .select("*")
      .eq("status", "email_enviado");

    if (fetchErr) throw fetchErr;

    for (const convite of convites || []) {
      const createdAt = new Date(convite.created_at);
      const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const expiraEm = new Date(convite.expira_em);
      const isExpired = expiraEm <= now;
      const link = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/cadastro/${convite.token}`;
      // Use a known app URL pattern
      const appLink = `https://people-fetely.lovable.app/cadastro/${convite.token}`;

      if (isExpired) {
        // Mark as expired + notify HR
        await supabase
          .from("convites_cadastro")
          .update({ status: "expirado" })
          .eq("id", convite.id);

        await supabase.from("notificacoes_rh").insert({
          tipo: "convite_expirado",
          titulo: `Convite expirado: ${convite.nome}`,
          mensagem: `${convite.nome} não preencheu a ficha de cadastro. O convite expirou. Deseja reenviar?`,
          link: "/convites-cadastro",
          user_id: convite.criado_por,
        });
        continue;
      }

      // D+3 reminder
      if (daysSince === 3) {
        const idempotencyKey = `reminder-d3-${convite.id}`;
        const { data: existing } = await supabase
          .from("email_send_log")
          .select("id")
          .eq("message_id", idempotencyKey)
          .maybeSingle();

        if (!existing) {
          const messageId = idempotencyKey;
          const html = buildReminderHtml(convite.nome, appLink, false);
          const plain = buildReminderPlain(convite.nome, appLink, false);

          // Get/create unsubscribe token
          const unsubToken = await getOrCreateUnsubToken(supabase, convite.email);

          await supabase.from("email_send_log").insert({
            message_id: messageId,
            template_name: "lembrete-cadastro",
            recipient_email: convite.email.toLowerCase(),
            status: "pending",
          });

          await supabase.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              message_id: messageId,
              to: convite.email.toLowerCase(),
              from: "Fetely People <noreply@notify.fetelycorp.com.br>",
              sender_domain: "notify.fetelycorp.com.br",
              subject: "Lembrete: sua ficha de cadastro está pendente",
              html,
              text: plain,
              purpose: "transactional",
              label: "lembrete-cadastro",
              idempotency_key: idempotencyKey,
              unsubscribe_token: unsubToken,
              queued_at: now.toISOString(),
            },
          });
        }
      }

      // D+6 reminder (urgent)
      if (daysSince === 6) {
        const idempotencyKey = `reminder-d6-${convite.id}`;
        const { data: existing } = await supabase
          .from("email_send_log")
          .select("id")
          .eq("message_id", idempotencyKey)
          .maybeSingle();

        if (!existing) {
          const messageId = idempotencyKey;
          const html = buildReminderHtml(convite.nome, appLink, true);
          const plain = buildReminderPlain(convite.nome, appLink, true);

          const unsubToken = await getOrCreateUnsubToken(supabase, convite.email);

          await supabase.from("email_send_log").insert({
            message_id: messageId,
            template_name: "lembrete-cadastro-urgente",
            recipient_email: convite.email.toLowerCase(),
            status: "pending",
          });

          await supabase.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              message_id: messageId,
              to: convite.email.toLowerCase(),
              from: "Fetely People <noreply@notify.fetelycorp.com.br>",
              sender_domain: "notify.fetelycorp.com.br",
              subject: "⚠️ Urgente: prazo da sua ficha está se encerrando",
              html,
              text: plain,
              purpose: "transactional",
              label: "lembrete-cadastro-urgente",
              idempotency_key: idempotencyKey,
              unsubscribe_token: unsubToken,
              queued_at: now.toISOString(),
            },
          });
        }
      }
    }

    // 2. Process scheduled alerts (alertas_agendados)
    const { data: alertas } = await supabase
      .from("alertas_agendados")
      .select("*")
      .eq("executado", false)
      .lte("data_alerta", today);

    for (const alerta of alertas || []) {
      // Create notification
      await supabase.from("notificacoes_rh").insert({
        tipo: alerta.tipo,
        titulo: alerta.titulo,
        mensagem: alerta.mensagem,
        link: alerta.link,
        user_id: alerta.user_id,
      });

      // Mark as executed
      await supabase
        .from("alertas_agendados")
        .update({ executado: true, executado_em: now.toISOString() })
        .eq("id", alerta.id);
    }

    return new Response(
      JSON.stringify({ ok: true, convites_processed: (convites || []).length, alertas_processed: (alertas || []).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getOrCreateUnsubToken(supabase: any, email: string): Promise<string> {
  const emailLower = email.toLowerCase();
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", emailLower)
    .maybeSingle();

  if (existing?.token) return existing.token;

  const token = crypto.randomUUID();
  await supabase
    .from("email_unsubscribe_tokens")
    .insert({ token, email: emailLower });

  return token;
}

function buildReminderHtml(nome: string, link: string, urgent: boolean): string {
  const title = urgent
    ? "⚠️ Seu prazo está se encerrando!"
    : "Sua ficha de cadastro está pendente";
  const body = urgent
    ? `<p style="font-size:15px;color:#3a3a4a;line-height:1.6;margin:0 0 16px;">Olá, ${nome}! O prazo para preenchimento da sua ficha de pré-cadastro está se encerrando. Por favor, <strong>preencha o mais rápido possível</strong> para não perder o acesso.</p>`
    : `<p style="font-size:15px;color:#3a3a4a;line-height:1.6;margin:0 0 16px;">Olá, ${nome}! Notamos que sua ficha de pré-cadastro ainda está pendente. Por favor, preencha-a clicando no botão abaixo.</p>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body style="background-color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;">
<div style="max-width:560px;margin:0 auto;padding:30px 25px;">
<h1 style="font-size:22px;font-weight:bold;color:#1a3a5c;margin:0 0 20px;">${title}</h1>
${body}
<div style="text-align:center;margin:24px 0;">
<a href="${link}" style="display:inline-block;padding:12px 28px;background-color:#1a56db;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Preencher Ficha</a>
</div>
<hr style="border-color:#e5e7eb;margin:24px 0;" />
<p style="font-size:12px;color:#999999;margin:0;">Este é um e-mail automático enviado por Fetely People.</p>
</div></body></html>`;
}

function buildReminderPlain(nome: string, link: string, urgent: boolean): string {
  const title = urgent ? "⚠️ Seu prazo está se encerrando!" : "Sua ficha de cadastro está pendente";
  const body = urgent
    ? `Olá, ${nome}! O prazo para preenchimento da sua ficha está se encerrando. Preencha o mais rápido possível.`
    : `Olá, ${nome}! Sua ficha de pré-cadastro ainda está pendente.`;
  return `${title}\n\n${body}\n\nAcesse: ${link}\n\nFetely People`;
}
