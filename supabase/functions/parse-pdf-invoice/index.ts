import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada no servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new Response(
        JSON.stringify({ error: "Arquivo PDF não enviado" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Converte PDF para base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunkSize)) as any,
      );
    }
    const base64 = btoa(binary);

    console.log(`Processando PDF: ${file.name}, ${bytes.length} bytes`);

    // Gemini suporta PDFs via formato file/inline_data — no AI Gateway via OpenAI compatible
    // usamos type "file" com file_data contendo o data URL base64
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Você é um extrator de dados de Notas Fiscais brasileiras (DANFE), recibos, e invoices internacionais (Lovable, Anthropic, OpenAI, AWS, GitHub, SaaS).
Analise o PDF e extraia em JSON:
- vendor: string (razão social ou nome fantasia do emitente/fornecedor)
- vendor_cnpj: string | null (CNPJ do emitente, só números)
- description: string (descrição resumida dos itens/serviços)
- amount: number (valor total da NF/invoice. Se houver valor em BRL use ele, senão use o original)
- currency: "BRL" | "USD" | "EUR" | outro
- issue_date: string YYYY-MM-DD (data de emissão)
- due_date: string | null YYYY-MM-DD (data de vencimento, se existir)
- invoice_number: string | null (número da NF ou invoice)
- invoice_series: string | null (série da NF, se existir)
- access_key: string | null (chave de acesso da NF-e, 44 dígitos, se existir)
- payment_method: "Cartão Crédito" | "PIX" | "Boleto" | "TED" | "Débito Automático" | "Outros"

Responda APENAS com JSON válido, sem markdown.
Use null para campos não encontrados.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "file",
                  file: {
                    filename: file.name || "invoice.pdf",
                    file_data: `data:application/pdf;base64,${base64}`,
                  },
                },
                {
                  type: "text",
                  text: "Extraia os dados deste documento fiscal (NF, DANFE, recibo ou invoice).",
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      },
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de IA atingido, tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `Erro ao processar PDF com IA: ${errText.slice(0, 200)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    console.log("AI response content:", content.slice(0, 300));

    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({
          error: "Não foi possível extrair dados do PDF",
          raw: content,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `Erro interno: ${msg}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
