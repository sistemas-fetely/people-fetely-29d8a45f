// Edge Function: fala-fetely-perguntar
// Responde perguntas dos colaboradores usando contexto do banco + Lovable AI Gateway (streaming)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const MODEL = "google/gemini-2.5-pro";

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clipText(s: string | null | undefined, max: number) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "Missing Authorization header");

    // Cliente autenticado para validar usuário
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) return jsonError(401, "Não autenticado");
    const user = userData.user;

    // Cliente service role para bypass de RLS quando necessário (contexto)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const pergunta: string = (body.pergunta || "").trim();
    let conversa_id: string | null = body.conversa_id || null;

    if (!pergunta) return jsonError(400, "Pergunta vazia");
    if (pergunta.length > 2000) return jsonError(400, "Pergunta muito longa (max 2000 chars)");

    // 1) Cria conversa se necessário
    if (!conversa_id) {
      const titulo = pergunta.slice(0, 50);
      const { data: novaConversa, error: convErr } = await supabase
        .from("fala_fetely_conversas")
        .insert({ user_id: user.id, titulo })
        .select("id")
        .single();
      if (convErr) {
        console.error("Erro criando conversa:", convErr);
        return jsonError(500, "Erro ao criar conversa");
      }
      conversa_id = novaConversa.id;
    } else {
      // valida posse
      const { data: conv } = await supabase
        .from("fala_fetely_conversas")
        .select("user_id")
        .eq("id", conversa_id)
        .single();
      if (!conv || conv.user_id !== user.id) return jsonError(403, "Conversa não pertence ao usuário");
    }

    // 2) Salva mensagem do usuário
    await supabase.from("fala_fetely_mensagens").insert({
      conversa_id,
      papel: "user",
      conteudo: pergunta,
    });

    // 3) Coletar contexto do usuário + conhecimento + histórico (paralelo)
    const [profileRes, colabRes, contratoPjRes, tarefasRes, processosRes, templatesRes, tarefasTemplateRes, extensoesRes, tarefasExtensoesRes, sistemasRes, departamentosRes, cargosRes, docsRes, beneficiosRes, historicoRes] = await Promise.all([
      supabase.from("profiles").select("full_name, colaborador_tipo").eq("user_id", user.id).maybeSingle(),
      supabase.from("colaboradores_clt").select("id, cargo, departamento, nome_completo").eq("user_id", user.id).maybeSingle(),
      supabase.from("contratos_pj").select("tipo_servico, departamento, contato_nome").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("sncf_tarefas")
        .select("titulo, prazo_data, prioridade")
        .eq("responsavel_user_id", user.id)
        .in("status", ["pendente", "atrasada", "em_andamento"])
        .order("prazo_data", { ascending: true })
        .limit(5),
      supabase.from("sncf_processos_categorias").select("id, slug, nome, descricao").eq("ativo", true).limit(30),
      (supabase as any).from("sncf_templates_processos").select("id, categoria_id"),
      (supabase as any).from("sncf_templates_tarefas").select("template_id, titulo, descricao, prazo_dias, responsavel_role, somente_clt, ordem").order("ordem"),
      (supabase as any).from("sncf_template_extensoes").select("id, categoria_id, dimensao, referencia_label, nome, descricao").eq("ativo", true),
      (supabase as any).from("sncf_template_extensoes_tarefas").select("extensao_id, titulo, descricao, prazo_dias, ordem").order("ordem"),
      supabase.from("parametros").select("label, valor").eq("categoria", "sistema").eq("ativo", true).limit(50),
      supabase.from("parametros").select("label").eq("categoria", "departamento").eq("ativo", true).limit(50),
      supabase.from("cargos").select("nome, departamento, missao, responsabilidades").eq("ativo", true).limit(40),
      supabase.from("sncf_documentacao").select("titulo, descricao, conteudo").eq("ativo", true).limit(20),
      supabase.from("beneficios_catalogo").select("beneficio, tipo").eq("ativo", true).limit(30),
      conversa_id
        ? supabase
            .from("fala_fetely_mensagens")
            .select("papel, conteudo")
            .eq("conversa_id", conversa_id)
            .order("created_at", { ascending: false })
            .limit(11) // 10 anteriores + a recém-inserida
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const nome = profileRes.data?.full_name || colabRes.data?.nome_completo || contratoPjRes.data?.contato_nome || user.email || "colaborador";
    const cargo = colabRes.data?.cargo || contratoPjRes.data?.tipo_servico || "Não cadastrado";
    const departamento = colabRes.data?.departamento || contratoPjRes.data?.departamento || "Não cadastrado";

    // Sistemas que o usuário tem acesso
    let sistemasUsuario: string[] = [];
    if (colabRes.data) {
      const { data } = await supabase
        .from("colaborador_acessos_sistemas")
        .select("sistema")
        .eq("colaborador_id", (colabRes.data as any).id || "")
        .eq("tem_acesso", true);
      sistemasUsuario = (data || []).map((s: any) => s.sistema);
    }

    const tarefasPendentes = tarefasRes.data || [];
    const tituloTarefas = tarefasPendentes.slice(0, 3).map((t: any) => `"${t.titulo}"`).join(", ") || "nenhuma";

    // Montar blocos de conhecimento
    // Indexar templates/tarefas/extensões por categoria
    const templatesArr = (templatesRes as any).data || [];
    const tarefasTemplateArr = (tarefasTemplateRes as any).data || [];
    const extensoesArr = (extensoesRes as any).data || [];
    const tarefasExtensoesArr = (tarefasExtensoesRes as any).data || [];

    const templatePorCategoria = new Map<string, string>();
    templatesArr.forEach((t: any) => {
      if (!templatePorCategoria.has(t.categoria_id)) templatePorCategoria.set(t.categoria_id, t.id);
    });

    const processosArr = (processosRes.data || []) as any[];

    // Cap total de tarefas em 80 — se exceder, manter apenas títulos das extras
    const totalTarefasEstimado = tarefasTemplateArr.length + tarefasExtensoesArr.length;
    const truncar = totalTarefasEstimado > 80;

    const blocoProcessos = processosArr.map((p: any) => {
      const linhas: string[] = [`### ${p.nome}${p.descricao ? ` — ${clipText(p.descricao, 200)}` : ""}`];

      // Tarefas padrão
      const templateId = templatePorCategoria.get(p.id);
      if (templateId) {
        const tarefas = tarefasTemplateArr.filter((t: any) => t.template_id === templateId);
        if (tarefas.length) {
          linhas.push("Tarefas padrão:");
          tarefas.forEach((t: any) => {
            if (truncar) {
              linhas.push(`- ${t.titulo}`);
            } else {
              const meta = [
                t.prazo_dias != null ? `${t.prazo_dias}d` : null,
                t.responsavel_role || null,
                t.somente_clt ? "CLT only" : null,
              ].filter(Boolean).join(" · ");
              linhas.push(`- ${t.titulo}${meta ? ` [${meta}]` : ""}${t.descricao ? `: ${clipText(t.descricao, 120)}` : ""}`);
            }
          });
        }
      }

      // Personalizações
      const exts = extensoesArr.filter((e: any) => e.categoria_id === p.id);
      if (exts.length) {
        linhas.push("Personalizações:");
        exts.forEach((e: any) => {
          linhas.push(`- ${e.nome} (${e.dimensao}: ${e.referencia_label})${e.descricao ? ` — ${clipText(e.descricao, 100)}` : ""}`);
          const tExt = tarefasExtensoesArr.filter((te: any) => te.extensao_id === e.id);
          tExt.forEach((te: any) => {
            if (truncar) {
              linhas.push(`  · ${te.titulo}`);
            } else {
              linhas.push(`  · ${te.titulo}${te.prazo_dias != null ? ` [${te.prazo_dias}d]` : ""}${te.descricao ? `: ${clipText(te.descricao, 100)}` : ""}`);
            }
          });
        });
      }

      return linhas.join("\n");
    }).join("\n\n") || "(nenhum cadastrado)";

    const blocoSistemas = (sistemasRes.data || [])
      .map((s: any) => `- ${s.label}${s.valor ? ` (${clipText(s.valor, 100)})` : ""}`)
      .join("\n") || "(nenhum cadastrado)";

    const blocoDepartamentos = (departamentosRes.data || [])
      .map((d: any) => `- ${d.label}`)
      .join("\n") || "(nenhum cadastrado)";

    const blocoCargos = (cargosRes.data || [])
      .map((c: any) => {
        const resp = Array.isArray(c.responsabilidades) ? c.responsabilidades.slice(0, 3).join("; ") : "";
        return `- ${c.nome} (${c.departamento || "?"})${c.missao ? ` — ${clipText(c.missao, 120)}` : ""}${resp ? ` | Resp.: ${clipText(resp, 200)}` : ""}`;
      })
      .join("\n") || "(nenhum cadastrado)";

    const blocoDocs = (docsRes.data || [])
      .map((d: any) => `### ${d.titulo}\n${d.descricao ? clipText(d.descricao, 200) + "\n" : ""}${clipText(d.conteudo, 800)}`)
      .join("\n\n---\n\n") || "(nenhuma documentação cadastrada)";

    const blocoBeneficios = (beneficiosRes.data || [])
      .map((b: any) => `- ${b.beneficio} (${b.tipo})`)
      .join("\n") || "(nenhum cadastrado)";

    const systemPrompt = `Você é o Fala Fetely, assistente inteligente do SNCF (Sistema Nervoso Central da Fetely).

A FETELY é uma marca de alegria com intenção — papelaria, utilidades e decoração com espírito comemorativo. DNA: "Celebre o que importa", "Gesto não se delega pro ChatGPT", autogestão com maturidade, tudo via sistema ou e-mail automático.

SEU PAPEL:
- Responder dúvidas dos colaboradores sobre processos, sistemas, benefícios, contratação, qualquer coisa relacionada ao trabalho na Fetely
- Usar APENAS as informações fornecidas no contexto abaixo
- NUNCA invente informações. NUNCA dê conselhos jurídicos, financeiros ou médicos definitivos
- Sempre que usar informação específica, mencione brevemente a fonte (ex: "Segundo o processo de Onboarding cadastrado...")

CONTEXTO DO USUÁRIO:
Nome: ${nome}
Cargo: ${cargo}
Departamento: ${departamento}
Sistemas que tem acesso: ${sistemasUsuario.length ? sistemasUsuario.join(", ") : "nenhum cadastrado"}
Tarefas pendentes: ${tarefasPendentes.length} (${tituloTarefas})

CONHECIMENTO DA FETELY DISPONÍVEL:

[PROCESSOS]
${blocoProcessos}

[SISTEMAS CORPORATIVOS]
${blocoSistemas}

[DEPARTAMENTOS]
${blocoDepartamentos}

[CARGOS]
${blocoCargos}

[BENEFÍCIOS CADASTRADOS]
${blocoBeneficios}

[DOCUMENTAÇÃO VIVA]
${blocoDocs}

INSTRUÇÕES DE RESPOSTA — SEJA DIRETO E CONCISO

REGRA DE OURO: respostas curtas e certeiras. Máximo de 3 parágrafos pequenos OU uma lista curta com 3-5 itens. Nunca respostas longas.

ESTRUTURA IDEAL:
1. Primeira frase vai DIRETO ao ponto. Sem cumprimento longo, sem repetir a pergunta.
2. Informação principal em 1 ou 2 parágrafos curtos, ou em bullet points se for lista.
3. Quando útil, encerrar com UMA sugestão de ação concreta ("Pra fazer isso, vai em [tela]" ou "Fale com o RH").

EVITE:
- Parágrafos longos com explicações desnecessárias.
- Repetir a pergunta do usuário antes de responder.
- Múltiplas perguntas retóricas no início ("Tudo bem? Como vai? Que pergunta legal!").
- Frases de motivação ou filosofia em toda resposta — use só quando fizer sentido genuíno.
- Mais de 1 emoji por resposta (no máximo 2 em casos especiais).
- Mencionar a palavra "celebrar" em toda resposta — use com parcimônia, como tempero.

QUANDO LISTAR ITENS:
Use markdown bullet points (traço + espaço). Máximo 5 itens por lista. Cada item curto.

QUANDO NÃO SOUBER RESPONDER:
Em uma frase, diga "Não tenho essa informação no sistema". Em outra frase, sugira o caminho ("Fale com o RH" ou "Verifique em [tela X]"). Não invente. Não enrole.

USO DO CONTEXTO:
- Nome do usuário: mencionar NO MÁXIMO uma vez por resposta, na primeira frase, opcional.
- Tarefas pendentes: mencionar APENAS se forem genuinamente relevantes à pergunta. Não empurre sempre.
- Pergunta específica (ex: "como peço acesso ao Bling"): responda só sobre o Bling. Não derive para outros sistemas.

TOM:
Próximo e profissional, sem ser robotizado. Levemente caloroso, NÃO efusivo. Você é um colega de trabalho prestativo, não um animador de festa infantil.`;

    // Histórico em ordem cronológica (excluindo a última que acabamos de inserir, que vai como user prompt)
    const historico = ((historicoRes as any).data || []).reverse() as { papel: string; conteudo: string }[];
    // Remove a última mensagem (que é a pergunta atual já inserida) para não duplicar
    const historicoSemAtual = historico.length > 0 && historico[historico.length - 1].papel === "user"
      ? historico.slice(0, -1)
      : historico;

    const messages = [
      { role: "system", content: systemPrompt },
      ...historicoSemAtual.map((m) => ({
        role: m.papel === "assistant" ? "assistant" : "user",
        content: m.conteudo,
      })),
      { role: "user", content: pergunta },
    ];

    const fontes = {
      processos: (processosRes.data || []).length,
      sistemas: (sistemasRes.data || []).length,
      cargos: (cargosRes.data || []).length,
      documentacao: (docsRes.data || []).length,
      beneficios: (beneficiosRes.data || []).length,
    };

    // 4) Chamada ao Lovable AI Gateway com streaming
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text().catch(() => "");
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) return jsonError(429, "Muitas perguntas em pouco tempo. Tente novamente em instantes.");
      if (aiResp.status === 402) return jsonError(402, "Créditos da IA esgotados. Avise um admin.");
      return jsonError(502, "A IA não respondeu. Tente novamente.");
    }
    if (!aiResp.body) return jsonError(502, "Resposta vazia da IA");

    // 5) Stream de volta para o cliente, acumulando para salvar no banco ao final
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let respostaCompleta = "";

    const stream = new ReadableStream({
      async start(controller) {
        // Envia metadados primeiro como evento custom
        const meta = JSON.stringify({ conversa_id, fontes });
        controller.enqueue(encoder.encode(`event: meta\ndata: ${meta}\n\n`));

        const reader = aiResp.body!.getReader();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, nl);
              buffer = buffer.slice(nl + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) {
                // repassa linhas vazias e comentários SSE para manter formato
                controller.enqueue(encoder.encode(line + "\n"));
                continue;
              }
              const json = line.slice(6).trim();
              if (json === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const parsed = JSON.parse(json);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) respostaCompleta += delta;
              } catch {
                // ignore parse partial
              }
              // repassa a linha para o cliente
              controller.enqueue(encoder.encode(line + "\n\n"));
            }
          }

          // Persistir resposta completa
          if (respostaCompleta.trim()) {
            const { data: msgInserida } = await supabase
              .from("fala_fetely_mensagens")
              .insert({
                conversa_id,
                papel: "assistant",
                conteudo: respostaCompleta,
                fontes_consultadas: fontes,
              })
              .select("id")
              .single();

            // Atualiza updated_at da conversa
            await supabase
              .from("fala_fetely_conversas")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", conversa_id);

            // Envia evento final com mensagem_id
            const finalMeta = JSON.stringify({ mensagem_id: msgInserida?.id });
            controller.enqueue(encoder.encode(`event: end\ndata: ${finalMeta}\n\n`));
          }
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("fala-fetely-perguntar error:", e);
    return jsonError(500, e instanceof Error ? e.message : "Erro interno");
  }
});
