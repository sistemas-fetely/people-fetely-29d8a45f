import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PDF_BYTES = 8 * 1024 * 1024;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    parts.push(String.fromCharCode(...chunk));
  }
  return btoa(parts.join(""));
}

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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo PDF não enviado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > MAX_PDF_BYTES) {
      return new Response(JSON.stringify({
        error: `PDF muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: 8MB.`,
      }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = uint8ArrayToBase64(bytes);

    const systemPrompt = `Você é um extrator de dados de contratos comerciais e de serviços.

Analise o PDF e extraia as informações do contrato.

Responda APENAS com JSON neste formato (sem markdown, sem explicações):

{
  "objeto": string (descrição do serviço ou produto contratado — ex: "Aluguel de Espaço ABCasa Fair"),
  "fornecedor_cnpj": string ou null (CNPJ do fornecedor/prestador, apenas números),
  "fornecedor_razao_social": string ou null (razão social do fornecedor/prestador),
  "tipo_contrato": "parcelado" | "recorrente_com_fim" | "recorrente_sem_fim" | "unico" (identifique pelo contexto),
  "valor_parcela": number ou null (valor de cada parcela/mensalidade em BRL. FORMATO BRASILEIRO: ponto é separador de milhar e vírgula é decimal. "R$ 4.542,79" = 4542.79),
  "valor_total": number ou null (valor total do contrato em BRL, se informado),
  "total_parcelas": number ou null (número total de parcelas, se parcelado fixo),
  "data_inicio": string formato YYYY-MM-DD ou null,
  "data_fim": string formato YYYY-MM-DD ou null (null se recorrente sem fim),
  "dia_vencimento": number ou null (dia do mês para vencimento, ex: 22 para "todo dia 22"),
  "area": "financeiro" | "ti" | "juridico" | "outro" (identifique pela natureza do contrato — aluguel/eventos/serviços = financeiro, software/licença/SaaS = ti, assessoria jurídica = juridico),
  "fases": array de objetos com:
    {
      "nome": string (ex: "Setup", "Implantação", "Mensalidade"),
      "tipo": "unico" | "recorrente_com_fim" | "recorrente_sem_fim",
      "valor": number,
      "data_inicio": string YYYY-MM-DD ou null,
      "data_fim": string YYYY-MM-DD ou null,
      "dia_vencimento": number ou null
    }
  "clausulas_principais": array de strings (até 5 cláusulas ou pontos importantes do contrato),
  "resumo": string (resumo em 2-3 linhas do que é o contrato),
  "confianca": "alta" | "baixa"
}

REGRAS:
- Se o contrato tiver só um valor recorrente sem prazo definido → tipo_contrato="recorrente_sem_fim", fases com 1 item tipo "recorrente_sem_fim"
- Se tiver valor de setup + mensalidade → fases com 2 itens: primeiro "unico" (setup), segundo recorrente
- Se for parcelamento fixo (ex: 8x) → tipo_contrato="parcelado", total_parcelas=8, fases com 1 item tipo "unico" por parcela ou "recorrente_com_fim"
- Se não conseguir identificar algum campo, use null
- clausulas_principais: extrair os pontos mais importantes (multa por rescisão, reajuste, obrigações principais)
- Retornar sempre o JSON completo mesmo que alguns campos sejam null`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: systemPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Erro AI Gateway:", errText);
      return new Response(JSON.stringify({ error: "Erro ao processar PDF com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    let parsed: Record<string, unknown>;
    try {
      const clean = content.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Erro ao parsear JSON da IA:", content);
      return new Response(JSON.stringify({ error: "IA retornou formato inválido", raw: content }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro geral:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
