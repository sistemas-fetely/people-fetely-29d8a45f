import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { action, candidato_id, pdf_base64, vaga, candidato } = await req.json();

    // --- PARSE PDF ---
    if (action === "parse_pdf") {
      if (!pdf_base64) {
        return new Response(JSON.stringify({ error: "pdf_base64 obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente que extrai dados estruturados de currículos em PDF. Responda APENAS com JSON válido, sem markdown.",
            },
            {
              role: "user",
              content: [
                {
                  type: "file",
                  file: {
                    filename: "curriculo.pdf",
                    file_data: `data:application/pdf;base64,${pdf_base64}`,
                  },
                },
                {
                  type: "text",
                  text: `Extraia as informações deste currículo e responda APENAS com JSON válido:
{
  "nome": "string ou null",
  "email": "string ou null",
  "telefone": "string ou null",
  "linkedin_url": "string ou null",
  "experiencias": [
    { "cargo": "string", "empresa": "string", "periodo_inicio": "MM/AAAA", "periodo_fim": "MM/AAAA ou null se atual", "atual": boolean, "descricao": "resumo breve das atividades" }
  ],
  "formacoes": [
    { "curso": "string", "instituicao": "string", "nivel": "tecnico|graduacao|pos|mba|mestrado|outro", "status": "concluido|cursando", "ano_conclusao": "AAAA ou null" }
  ],
  "skills_identificadas": ["string"]
}
Incluir as 3 experiências mais recentes e todas as formações. Skills técnicas identificadas no currículo.`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Payment required" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error: " + status);
      }

      const data = await response.json();
      let texto = data.choices?.[0]?.message?.content ?? "";
      texto = texto.replace(/```json|```/g, "").trim();

      try {
        const perfil = JSON.parse(texto);
        return new Response(JSON.stringify({ perfil }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ perfil: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- CALCULAR SCORE ---
    if (action === "calcular_score") {
      if (!candidato_id || !vaga || !candidato) {
        return new Response(JSON.stringify({ error: "Dados incompletos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você é um especialista sênior em recrutamento. Calcule scores de aderência de candidatos. Responda APENAS com JSON válido, sem markdown.",
            },
            {
              role: "user",
              content: `Você é um especialista sênior em recrutamento. Calcule o score de aderência deste candidato para a vaga.

REGRAS CRÍTICAS DE AVALIAÇÃO POR NÍVEL:

1. Se o candidato tem nível ACIMA do pedido (ex: Sr candidatando-se a Jr): pontuação ALTA (80-95%). Ele entrega mais do que o mínimo exigido. Penalize levemente apenas se houver risco real de overqualification.

2. Se o candidato tem nível COMPATÍVEL com o pedido: avaliar normalmente (50-85%).

3. Se o candidato tem nível ABAIXO do pedido (ex: Jr candidatando-se a Sr): pontuação BAIXA (10-45%). Falta de experiência é crítica.

4. Para vagas Jr: não penalize por falta de ferramentas avançadas ou experiências longas — isso não é esperado de um Jr.

5. Para vagas Jr: valorize potencial, formação, skills básicas corretas e motivação.

COMO DETECTAR O NÍVEL DO CANDIDATO:
- Analise a quantidade e profundidade das experiências
- Anos de experiência acumulados
- Complexidade das atividades descritas
- Nível das skills declaradas
- Formação acadêmica

VAGA:
- Título: ${vaga.titulo}
- Nível exigido: ${vaga.nivel}
- Skills obrigatórias: ${JSON.stringify(vaga.skills_obrigatorias)}
- Skills desejadas: ${JSON.stringify(vaga.skills_desejadas)}
- Ferramentas: ${JSON.stringify(vaga.ferramentas)}

CANDIDATO:
- Skills declaradas: ${JSON.stringify(candidato.skills_candidato)}
- Sistemas declarados: ${JSON.stringify(candidato.sistemas_candidato)}
- Experiências: ${JSON.stringify(candidato.experiencias)}
- Formações: ${JSON.stringify(candidato.formacoes)}
- Motivação: "${candidato.mensagem || ""}"

DIMENSÕES DE AVALIAÇÃO:
- skills_match (0-35): aderência das skills declaradas às skills obrigatórias da vaga
- nivel_adequacao (0-30): compatibilidade do nível do candidato com o nível exigido (MAIOR PESO — siga as regras acima)
- experiencia_relevante (0-20): qualidade e relevância das experiências para o cargo
- sistemas_match (0-10): aderência às ferramentas pedidas
- motivacao (0-5): clareza e alinhamento da motivação declarada

Responda APENAS com JSON válido:
{
  "skills_match": 0-35,
  "nivel_adequacao": 0-30,
  "experiencia_relevante": 0-20,
  "sistemas_match": 0-10,
  "motivacao": 0-5,
  "total": 0-100,
  "nivel_detectado": "jr|pl|sr|coordenacao|especialista",
  "resumo": "2 linhas explicando o fit — mencionar se está acima ou abaixo do nível pedido"
}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error("AI gateway error:", response.status);
        return new Response(JSON.stringify({ error: "Erro ao calcular score" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      let texto = data.choices?.[0]?.message?.content ?? "";
      texto = texto.replace(/```json|```/g, "").trim();

      try {
        const score = JSON.parse(texto);

        // Update candidato in database
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        await supabaseAdmin
          .from("candidatos")
          .update({
            score_total: score.total,
            score_detalhado: score,
            score_calculado_em: new Date().toISOString(),
          })
          .eq("id", candidato_id);

        return new Response(JSON.stringify({ score }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Erro ao parsear score" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "action inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-candidato error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
