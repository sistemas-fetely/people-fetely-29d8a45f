import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nome, nivel, departamento } = await req.json();
    if (!nome || !nivel) {
      return new Response(JSON.stringify({ error: "nome e nivel são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const nivelLabel: Record<string, string> = {
      jr: "Júnior", pl: "Pleno", sr: "Sênior",
      coordenacao: "Coordenação", especialista: "Especialista", c_level: "C-Level"
    };

    const prompt = `Você é especialista em RH e mercado de trabalho brasileiro.
Para o cargo "${nome}" nível ${nivelLabel[nivel] || nivel}${departamento ? `, área de ${departamento}` : ""}, em uma empresa de médio porte no Brasil:

Pesquise dados reais de mercado (Robert Half, Michael Page, Glassdoor, LinkedIn).

Os valores salariais devem ser mensais em reais (BRL) para São Paulo/SP.
Faixas representam progressão salarial: F1 = entrada, F2 = desenvolvimento (1-2 anos), F3 = pleno (autônomo), F4 = sênior (referência na área), F5 = teto da faixa (próximo de promoção).
Calcule valores progressivos e realistas entre faixas. Para PJ, considere que o valor mensal é tipicamente 30-50% maior que CLT.

IMPORTANTE:
- Responsabilidades devem ser atividades concretas e específicas para "${nome}"
- Skills obrigatórias devem ser competências técnicas específicas para "${nome}"
- Skills desejadas devem ser diferenciais específicos
- Ferramentas devem ser softwares/sistemas reais usados neste cargo`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em RH e remuneração no mercado brasileiro. Responda usando a ferramenta fornecida." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "enrich_cargo",
              description: "Retorna dados de mercado para um cargo",
              parameters: {
                type: "object",
                properties: {
                  missao: { type: "string", description: "O que essa pessoa resolve na empresa (1-2 frases)" },
                  responsabilidades: { type: "array", items: { type: "string" }, description: "5 responsabilidades principais" },
                  skills_obrigatorias: { type: "array", items: { type: "string" }, description: "5 skills obrigatórias" },
                  skills_desejadas: { type: "array", items: { type: "string" }, description: "3 skills desejáveis" },
                  ferramentas: { type: "array", items: { type: "string" }, description: "3 ferramentas principais" },
                  faixa_clt_f1_min: { type: "number", description: "CLT F1 entrada mín" },
                  faixa_clt_f1_max: { type: "number", description: "CLT F1 entrada máx" },
                  faixa_clt_f2_min: { type: "number", description: "CLT F2 desenvolvimento mín" },
                  faixa_clt_f2_max: { type: "number", description: "CLT F2 desenvolvimento máx" },
                  faixa_clt_f3_min: { type: "number", description: "CLT F3 pleno mín" },
                  faixa_clt_f3_max: { type: "number", description: "CLT F3 pleno máx" },
                  faixa_clt_f4_min: { type: "number", description: "CLT F4 sênior mín" },
                  faixa_clt_f4_max: { type: "number", description: "CLT F4 sênior máx" },
                  faixa_clt_f5_min: { type: "number", description: "CLT F5 referência mín" },
                  faixa_clt_f5_max: { type: "number", description: "CLT F5 referência máx" },
                  faixa_pj_f1_min: { type: "number", description: "PJ F1 entrada mín" },
                  faixa_pj_f1_max: { type: "number", description: "PJ F1 entrada máx" },
                  faixa_pj_f2_min: { type: "number", description: "PJ F2 desenvolvimento mín" },
                  faixa_pj_f2_max: { type: "number", description: "PJ F2 desenvolvimento máx" },
                  faixa_pj_f3_min: { type: "number", description: "PJ F3 pleno mín" },
                  faixa_pj_f3_max: { type: "number", description: "PJ F3 pleno máx" },
                  faixa_pj_f4_min: { type: "number", description: "PJ F4 sênior mín" },
                  faixa_pj_f4_max: { type: "number", description: "PJ F4 sênior máx" },
                  faixa_pj_f5_min: { type: "number", description: "PJ F5 referência mín" },
                  faixa_pj_f5_max: { type: "number", description: "PJ F5 referência máx" },
                },
                required: ["missao", "responsabilidades", "skills_obrigatorias", "skills_desejadas", "ferramentas",
                  "faixa_clt_f1_min", "faixa_clt_f1_max", "faixa_clt_f2_min", "faixa_clt_f2_max",
                  "faixa_clt_f3_min", "faixa_clt_f3_max", "faixa_clt_f4_min", "faixa_clt_f4_max",
                  "faixa_clt_f5_min", "faixa_clt_f5_max",
                  "faixa_pj_f1_min", "faixa_pj_f1_max", "faixa_pj_f2_min", "faixa_pj_f2_max",
                  "faixa_pj_f3_min", "faixa_pj_f3_max", "faixa_pj_f4_min", "faixa_pj_f4_max",
                  "faixa_pj_f5_min", "faixa_pj_f5_max"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "enrich_cargo" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-cargo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
