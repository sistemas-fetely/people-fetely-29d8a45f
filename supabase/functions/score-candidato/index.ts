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
              content: `Você é um especialista sênior em recrutamento e desenvolvimento de carreira. Avalie com profundidade e inteligência a aderência deste candidato à vaga.

═══ LÓGICA DE NÍVEL — LEIA COM ATENÇÃO ═══

DETECÇÃO DO NÍVEL REAL DO CANDIDATO:
Analise as experiências e defina o nível real:
- Jr: 0-2 anos, atividades de suporte/execução, pouca autonomia
- Pl: 2-5 anos, entrega independente, começa a liderar tarefas
- Sr: 5+ anos, referência técnica, lidera projetos e pessoas
- Coordenação/Especialista: 7+ anos, gestão de times ou especialização profunda

REGRAS DE ADEQUAÇÃO DE NÍVEL (peso 30 pontos):
- Candidato Sr ou Coord candidatando-se a vaga Jr/Pl:
  → nivel_adequacao: 25-30 pts. Overqualification é irrelevante — ele ENTREGA o que a vaga pede e mais.
  → Penalize APENAS se o candidato não tiver NENHUMA das skills básicas da vaga.
- Candidato Pl candidatando-se a vaga Jr:
  → nivel_adequacao: 22-28 pts. Tem o essencial e está em progressão natural.
- Candidato Jr candidatando-se a vaga Jr:
  → nivel_adequacao: 18-25 pts. Nível correto — avalie pela qualidade das skills básicas.
- Candidato Jr candidatando-se a vaga Pl/Sr:
  → nivel_adequacao: 8-15 pts. Risco real de performance abaixo do esperado.
- Candidato Jr candidatando-se a vaga Sr/Coord:
  → nivel_adequacao: 2-8 pts. Lacuna crítica de experiência.

REGRAS DE SKILLS (peso 35 pontos):
- Para vagas Jr: skills básicas corretas valem muito. Não exija profundidade — o candidato Jr está aprendendo.
- Para candidatos Sr em vagas Jr: as skills do candidato são mais avançadas que as pedidas — isso é POSITIVO. Pontue alto mesmo que os nomes não sejam idênticos.
- Avalie equivalências: "Photoshop" = "Edição de imagem"; "React" = "TypeScript/Frontend"; "Google Analytics" = "Análise de Métricas".
- Skills desejadas são bônus — não penalize por não ter.

REGRAS DE EXPERIÊNCIA (peso 20 pontos):
- Jr com 0-1 ano de experiência ou estágios: completamente normal para uma vaga Jr. Pontue 14-18.
- Jr com formação forte + estágio: pontue 16-18.
- Sr com experiências em áreas adjacentes à vaga: pontue 15-18.
- Ausência total de experiência em candidato Jr: pontue 10-13 (ainda possível).

═══ DADOS DA AVALIAÇÃO ═══

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

═══ CALIBRAÇÃO DE REFERÊNCIA ═══
Use estas referências para calibrar seu score:
- Candidato Sr experiente em vaga Jr, com skills relevantes → score: 85-95
- Candidato Pl maduro em vaga Jr → score: 78-88
- Candidato Jr com skills básicas corretas em vaga Jr → score: 65-78
- Candidato Jr fraco (poucas skills) em vaga Jr → score: 45-62
- Candidato Jr em vaga Pl → score: 30-48
- Candidato Jr em vaga Sr → score: 10-28

Responda APENAS com JSON válido:
{
  "skills_match": 0-35,
  "nivel_adequacao": 0-30,
  "experiencia_relevante": 0-20,
  "sistemas_match": 0-10,
  "motivacao": 0-5,
  "total": 0-100,
  "nivel_detectado": "jr|pl|sr|coordenacao|especialista",
  "resumo": "2 linhas explicando o fit — mencionar se está acima ou abaixo do nível pedido e por quê"
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
