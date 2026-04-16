import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tipo, marca, modelo, ano_compra, estado, condicao, valor_compra, especificacoes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const condicaoLabel: Record<string, string> = {
      otima: "Ótima",
      muito_boa: "Muito Boa",
      boa: "Boa",
      inativo: "Inativo",
    };

    const specs = especificacoes || {};
    let specsText = "";
    if (specs.processador) specsText += `, processador ${specs.processador}`;
    if (specs.ram) specsText += `, ${specs.ram} RAM`;
    if (specs.hd_tamanho) specsText += `, ${specs.hd_tipo || "SSD"} ${specs.hd_tamanho}`;
    if (specs.tamanho) specsText += `, ${specs.tamanho} polegadas`;
    if (specs.resolucao) specsText += `, resolução ${specs.resolucao}`;

    const prompt = `Estime o valor atual de mercado (usado, em reais BRL) de um equipamento com as seguintes características:
- Tipo: ${tipo}
- Marca: ${marca}
- Modelo: ${modelo}
- Ano de compra: ${ano_compra || "desconhecido"}
- Estado: ${estado}
- Condição: ${condicaoLabel[condicao] || "Boa"}${specsText}
${valor_compra ? `- Valor de compra original: R$ ${Number(valor_compra).toLocaleString("pt-BR")}` : ""}

Responda APENAS com o valor numérico estimado em reais, sem texto adicional, sem "R$", sem pontos de milhar. Use ponto como separador decimal. Exemplo: 3500.00`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em precificação de equipamentos de TI no mercado brasileiro." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    const valor = parseFloat(text.replace(/[^\d.]/g, ""));

    if (isNaN(valor) || valor <= 0) {
      return new Response(JSON.stringify({ error: "Não foi possível estimar o valor", raw: text }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ valor }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("estimar-valor-ativo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
