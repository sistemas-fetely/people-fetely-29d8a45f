import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidato, vaga, tipo } = await req.json();
    if (!candidato || !vaga) {
      return new Response(JSON.stringify({ error: "candidato e vaga são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isTeste = tipo === "teste_tecnico";
    const tipoLabel = tipo === "rh" ? "entrevistador de RH" : tipo === "gestor" ? "gestor da área" : "teste técnico";

    const prompt = isTeste
      ? `Você é especialista em RH e recrutamento. Crie um teste técnico prático para o candidato abaixo.

VAGA: ${vaga.titulo ?? ""}
Nível: ${vaga.nivel ?? ""}
Área: ${vaga.area ?? ""}
Skills obrigatórias: ${JSON.stringify(vaga.skills_obrigatorias ?? [])}
Responsabilidades: ${JSON.stringify(vaga.responsabilidades ?? [])}

CANDIDATO: ${candidato.nome ?? ""}
Experiência: ${JSON.stringify(candidato.experiencias ?? [])}
Skills declaradas: ${JSON.stringify(candidato.skills_candidato ?? [])}

EMPRESA: Fetely — marca de lifestyle, papelaria e decoração com DNA comemorativo.
Tom da empresa: humano, poético, atual.

Crie um desafio PRÁTICO, ESPECÍFICO e RELEVANTE para este cargo.
Prazo sugerido: 3 a 5 dias úteis.`
      : `Você é especialista em RH e recrutamento. Analise este candidato para a vaga e gere um resumo para o ${tipoLabel}.

VAGA: ${vaga.titulo ?? ""}
Skills obrigatórias: ${JSON.stringify(vaga.skills_obrigatorias ?? [])}
Skills desejadas: ${JSON.stringify(vaga.skills_desejadas ?? [])}

CANDIDATO: ${candidato.nome}
Experiências: ${JSON.stringify(candidato.experiencias ?? [])}
Formações: ${JSON.stringify(candidato.formacoes ?? [])}
Skills declaradas: ${JSON.stringify(candidato.skills_candidato ?? [])}
Sistemas: ${JSON.stringify(candidato.sistemas_candidato ?? [])}
Score de aderência: ${candidato.score_total ?? 0}%
Motivação: "${candidato.mensagem ?? ""}"`;

    const toolDef = isTeste
      ? {
          type: "function" as const,
          function: {
            name: "generate_teste_tecnico",
            description: "Retorna um teste técnico estruturado para o candidato",
            parameters: {
              type: "object",
              properties: {
                contexto: { type: "string", description: "2-3 frases sobre o cenário/problema que o candidato vai resolver" },
                descricao: { type: "string", description: "O que o candidato deve fazer — específico e claro" },
                entregaveis: { type: "string", description: "O que deve ser entregue (formato, extensão, etc.)" },
                criterios: { type: "string", description: "Como será avaliado — 3 a 5 critérios objetivos" },
              },
              required: ["contexto", "descricao", "entregaveis", "criterios"],
              additionalProperties: false,
            },
          },
        }
      : {
          type: "function" as const,
          function: {
            name: "analyze_candidato",
            description: "Retorna análise estruturada do candidato para entrevista",
            parameters: {
              type: "object",
              properties: {
                resumo: { type: "string", description: "2-3 frases sobre o perfil geral do candidato" },
                pontos_fortes: { type: "array", items: { type: "string" }, description: "3-5 pontos fortes observados" },
                pontos_atencao: { type: "array", items: { type: "string" }, description: "2-3 pontos de atenção" },
                recomendacao_ia: { type: "string", enum: ["avançar", "aguardar", "nao_avançar"], description: "Recomendação" },
                score_fit: { type: "number", description: "Score de fit com a vaga de 0 a 100" },
              },
              required: ["resumo", "pontos_fortes", "pontos_atencao", "recomendacao_ia", "score_fit"],
              additionalProperties: false,
            },
          },
        };

    const toolName = isTeste ? "generate_teste_tecnico" : "analyze_candidato";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: isTeste
            ? "Você é um especialista em RH e recrutamento. Crie testes técnicos práticos usando a ferramenta fornecida."
            : "Você é um especialista em RH e recrutamento. Responda usando a ferramenta fornecida."
          },
          { role: "user", content: prompt },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: toolName } },
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
    console.error("analyze-candidato error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
