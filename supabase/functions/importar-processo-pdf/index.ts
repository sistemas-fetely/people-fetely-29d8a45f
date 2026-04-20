// @ts-expect-error Deno runtime
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// @ts-expect-error Deno runtime
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
// @ts-expect-error Deno runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-expect-error Deno runtime
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ═══════════════════════════════════════════════
// PROMPT DA IA — estruturado, anti-alucinação
// ═══════════════════════════════════════════════
const SYSTEM_PROMPT = `Você é um analista sênior de processos da empresa Fetely. 
Seu trabalho é ler PDFs e extrair processos estruturados.

REGRAS CRÍTICAS:
1. Analise o PDF. Se NÃO parece um documento de processo operacional (ex: contrato, recibo, currículo, relatório financeiro), retorne { "eh_processo": false, "motivo": "..." }.
2. Se parece processo mas tem MÚLTIPLOS processos distintos no mesmo PDF, retorne { "eh_processo": true, "multiplos": true, "processos": [...] } com uma lista resumida (título + descrição curta).
3. Se é UM único processo bem definido, retorne a estrutura completa em JSON.
4. NUNCA invente informação. Se o PDF não diz quem é o responsável, deixe "responsavel_sugerido": null.
5. Tags devem ser curtas e objetivas (máx 5).
6. Diagrama Mermaid deve ser SIMPLES — flowchart TD com no máximo 10 nós. Prefira 'A[Texto] --> B[Texto]' básico.

Estrutura esperada quando é um processo único:
{
  "eh_processo": true,
  "multiplos": false,
  "nome": "Nome curto e direto do processo",
  "descricao": "Resumo em 1-2 linhas",
  "narrativa": "Texto longo explicando o processo do começo ao fim",
  "area_sugerida": "rh|ti|comercial|financeiro|produto|marketing|logistica|operacional|administrativo",
  "natureza_valor_sugerida": "gera_valor|mantem_valor|reduz_risco",
  "sensivel_sugerido": false,
  "etapas_sugeridas": [
    {
      "ordem": 1,
      "titulo": "Nome da etapa",
      "descricao": "O que acontece nela",
      "responsavel": "ex: admin_rh"
    }
  ],
  "responsavel_sugerido": "quem é o R do processo (ex: admin_rh, gestor_direto, null)",
  "tags_sugeridas": ["tag1", "tag2"],
  "kpis_candidatos": [
    { "nome": "Tempo médio de execução", "unidade": "dias" }
  ],
  "diagrama_mermaid": "flowchart TD\\n  A[Início] --> B[Passo]\\n  B --> C[Fim]"
}

Retorne APENAS JSON válido. Sem markdown, sem texto fora do JSON.`;

async function callGeminiVision(base64Pdf: string, nomeArquivo: string): Promise<any> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise este PDF (nome do arquivo: "${nomeArquivo}") e extraia o processo conforme as regras.`,
            },
            {
              type: "file",
              file: {
                filename: nomeArquivo,
                file_data: `data:application/pdf;base64,${base64Pdf}`,
              },
            },
          ],
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("Gemini retornou vazio");

  // Remover possíveis markdown code fences
  const cleanedContent = rawContent
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleanedContent);
  } catch (_e) {
    throw new Error(`JSON inválido retornado: ${cleanedContent.substring(0, 200)}`);
  }
}

// ═══════════════════════════════════════════════
// Handler principal
// ═══════════════════════════════════════════════
// @ts-expect-error Deno runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se é admin_rh ou super_admin
    const { data: rolesData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = (rolesData || []).map((r: any) => r.role);
    const isAdmin = roles.includes("super_admin") || roles.includes("admin_rh");

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin RH ou super admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ler PDF do body
    const body = await req.json();
    const { arquivo_base64, arquivo_nome } = body;

    if (!arquivo_base64 || !arquivo_nome) {
      return new Response(JSON.stringify({ error: "Arquivo e nome obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tamanho em KB (aproximado a partir do base64)
    const tamanhoKb = Math.round((arquivo_base64.length * 3) / 4 / 1024);

    if (tamanhoKb > 10 * 1024) {
      return new Response(JSON.stringify({ error: "PDF muito grande (máx 10MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar nome do usuário
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("nome")
      .eq("user_id", user.id)
      .maybeSingle();

    // Registrar início da importação
    const { data: impRegistro } = await supabaseAdmin
      .from("processos_importacoes_pdf")
      .insert({
        importado_por: user.id,
        importado_por_nome: profile?.nome || user.email,
        arquivo_nome,
        arquivo_tamanho_kb: tamanhoKb,
        status: "em_processamento",
      })
      .select("id")
      .single();

    const importacaoId = impRegistro?.id;

    // Chamar Gemini
    let resultadoIa: any;
    try {
      resultadoIa = await callGeminiVision(arquivo_base64, arquivo_nome);
    } catch (e: any) {
      if (importacaoId) {
        await supabaseAdmin
          .from("processos_importacoes_pdf")
          .update({
            status: "erro_ia",
            erro_mensagem: e.message,
          })
          .eq("id", importacaoId);
      }
      return new Response(
        JSON.stringify({
          error: "Erro ao analisar PDF com IA",
          detalhe: e.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validar resposta da IA
    if (!resultadoIa.eh_processo) {
      if (importacaoId) {
        await supabaseAdmin
          .from("processos_importacoes_pdf")
          .update({
            status: "recusado_nao_processo",
            resultado_ia: resultadoIa,
          })
          .eq("id", importacaoId);
      }
      return new Response(
        JSON.stringify({
          sucesso: false,
          eh_processo: false,
          motivo: resultadoIa.motivo || "PDF não parece ser um documento de processo operacional",
          importacao_id: importacaoId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Sucesso — atualizar registro
    if (importacaoId) {
      await supabaseAdmin
        .from("processos_importacoes_pdf")
        .update({
          status: "sucesso",
          resultado_ia: resultadoIa,
        })
        .eq("id", importacaoId);
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        eh_processo: true,
        multiplos: !!resultadoIa.multiplos,
        resultado: resultadoIa,
        importacao_id: importacaoId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Erro geral:", error);
    return new Response(
      JSON.stringify({
        error: "Erro interno",
        detalhe: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
