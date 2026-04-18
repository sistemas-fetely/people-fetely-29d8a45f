import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPT_EXTRACAO_SISTEMA = `Você é o extrator de conhecimento do Fala Fetely — assistente da empresa Fetely (marca de papelaria, utilidades e decoração com espírito comemorativo).

Você recebe um documento PDF (manual, política, procedimento) e deve identificar TÓPICOS AUTONOMOS que possam virar registros independentes na Base de Conhecimento do Fala Fetely.

DIRETRIZES DE QUEBRA:
- Cada tópico deve ser AUTOEXPLICATIVO — uma pessoa deve entender sem ler o resto do documento
- Cada tópico deve caber em 300-1500 caracteres (não muito curto, não muito longo)
- Prefira QUEBRAR POR ASSUNTO FUNCIONAL (ex: "Admissão CLT", "Cálculo de INSS", "Processo de férias"), não por capítulo
- Informações procedurais/instrucionais → categoria "regra" ou "diretriz"
- Definições, glossários, conceitos → categoria "conceito"
- Políticas da empresa → categoria "politica"
- Perguntas frequentes → categoria "faq"
- Evite: tabelas numéricas puras (alíquotas que mudam todo ano), informações genéricas do setor

CATEGORIAS DISPONÍVEIS:
- politica
- regra
- diretriz
- faq
- conceito
- manifesto
- mercado

RETORNE JSON PURO (sem markdown, sem \`\`\`json), com a seguinte estrutura:
{
  "conhecimentos": [
    {
      "titulo": "string curto e claro (até 80 chars)",
      "categoria": "politica|regra|diretriz|faq|conceito|manifesto|mercado",
      "conteudo": "texto completo e autoexplicativo do tópico",
      "tags": ["tag1", "tag2"],
      "pagina_origem": número da página onde está no PDF (se conseguir identificar),
      "publico_alvo_sugerido": "todos|admin_rh|gestores|colaboradores|financeiro|ti"
    }
  ],
  "resumo_documento": "1-2 frases resumindo do que trata o documento",
  "total_paginas_analisadas": número
}

Se o PDF parecer não ser um manual/procedimento (ex: imagem escaneada sem texto, documento irrelevante, pdf corrompido), retorne:
{
  "conhecimentos": [],
  "resumo_documento": "breve explicação do porquê não foi possível extrair",
  "total_paginas_analisadas": 0
}

Extraia entre 3 e 30 tópicos por documento (não invente conteúdo — se o documento for curto, extraia menos).`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  let importacao_id: string | null = null;
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  async function marcarErro(msg: string) {
    if (importacao_id) {
      await supabaseAdmin
        .from("fala_fetely_importacoes_pdf")
        .update({ status: "erro", erro_mensagem: msg })
        .eq("id", importacao_id);
    }
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Validar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ sucesso: false, erro: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ sucesso: false, erro: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    // Validar role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleNames = (roles || []).map((r: any) => r.role);
    const ehAutorizado =
      roleNames.includes("super_admin") ||
      roleNames.includes("admin_rh") ||
      roleNames.includes("gestor_rh");
    if (!ehAutorizado) {
      return new Response(JSON.stringify({ sucesso: false, erro: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    importacao_id = body.importacao_id;
    const arquivo_url: string = body.arquivo_url;

    if (!importacao_id || !arquivo_url) {
      return new Response(JSON.stringify({ sucesso: false, erro: "Parâmetros faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar importação
    const { data: importacao, error: impErr } = await supabaseAdmin
      .from("fala_fetely_importacoes_pdf")
      .select("id, user_id, status")
      .eq("id", importacao_id)
      .single();

    if (impErr || !importacao) {
      return new Response(JSON.stringify({ sucesso: false, erro: "Importação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (importacao.user_id !== userId) {
      return new Response(JSON.stringify({ sucesso: false, erro: "Importação não pertence ao usuário" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin
      .from("fala_fetely_importacoes_pdf")
      .update({ status: "processando", erro_mensagem: null })
      .eq("id", importacao_id);

    // Obter URL assinada do PDF
    const { data: signedData, error: signedErr } = await supabaseAdmin.storage
      .from("fala-fetely-fontes")
      .createSignedUrl(arquivo_url, 600);

    if (signedErr || !signedData) {
      await marcarErro("Falha ao gerar URL assinada: " + (signedErr?.message ?? "desconhecido"));
      return new Response(JSON.stringify({ sucesso: false, erro: "Falha ao acessar PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Baixar PDF e converter para base64
    const pdfResponse = await fetch(signedData.signedUrl);
    if (!pdfResponse.ok) {
      await marcarErro("Falha ao baixar PDF: " + pdfResponse.status);
      return new Response(JSON.stringify({ sucesso: false, erro: "Falha ao baixar PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const bytes = new Uint8Array(pdfBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const pdfBase64 = btoa(binary);

    console.log("PDF carregado, tamanho:", bytes.length, "bytes");

    // Chamar Lovable AI Gateway com Gemini 2.5 Pro
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: PROMPT_EXTRACAO_SISTEMA,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise o PDF abaixo e extraia os tópicos relevantes conforme as instruções do sistema.",
              },
              {
                type: "file",
                file: {
                  filename: "documento.pdf",
                  file_data: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Erro do AI Gateway:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        await marcarErro("Limite de requisições excedido. Tente novamente em alguns minutos.");
        return new Response(
          JSON.stringify({ sucesso: false, erro: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        await marcarErro("Créditos do AI Gateway esgotados.");
        return new Response(
          JSON.stringify({ sucesso: false, erro: "Créditos da IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      await marcarErro("Erro do AI Gateway: " + aiResponse.status);
      return new Response(JSON.stringify({ sucesso: false, erro: "Erro ao processar com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const contentText: string = aiData.choices?.[0]?.message?.content ?? "";

    if (!contentText) {
      await marcarErro("Resposta vazia da IA");
      return new Response(JSON.stringify({ sucesso: false, erro: "Resposta vazia da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(contentText);
    } catch (parseErr) {
      // Tentar extrair JSON de markdown caso venha encapsulado
      const match = contentText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          parsed = JSON.parse(match[1].trim());
        } catch {
          await marcarErro("JSON inválido na resposta da IA");
          return new Response(JSON.stringify({ sucesso: false, erro: "JSON inválido na resposta" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        await marcarErro("JSON inválido na resposta da IA");
        return new Response(JSON.stringify({ sucesso: false, erro: "JSON inválido na resposta" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const conhecimentos = Array.isArray(parsed.conhecimentos) ? parsed.conhecimentos : [];

    await supabaseAdmin
      .from("fala_fetely_importacoes_pdf")
      .update({
        status: "aguardando_revisao",
        conhecimentos_criados: 0,
      })
      .eq("id", importacao_id);

    return new Response(
      JSON.stringify({
        sucesso: true,
        importacao_id,
        conhecimentos_sugeridos: conhecimentos,
        resumo_documento: parsed.resumo_documento || "",
        total_paginas: parsed.total_paginas_analisadas || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Erro processar-pdf-conhecimento:", err);
    await marcarErro(err?.message ?? "Erro desconhecido");
    return new Response(
      JSON.stringify({ sucesso: false, erro: err?.message ?? "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
