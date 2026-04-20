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

    // 3a) Buscar roles do usuário primeiro (para condicionar a busca de documentação)
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles: string[] = (rolesData || []).map((r: any) => r.role);
    const ehAdmin = roles.includes("super_admin") || roles.includes("admin_rh");

    // 3b) Coletar contexto do usuário + conhecimento + histórico (paralelo)
    const [profileRes, colabRes, contratoPjRes, tarefasRes, processosRes, templatesRes, tarefasTemplateRes, extensoesRes, tarefasExtensoesRes, sistemasRes, departamentosRes, cargosRes, docsRes, beneficiosRes, conhecimentosRes, memoriasRes, historicoRes] = await Promise.all([
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
      // Fonte unificada PF1: processos vivos com narrativa, owner e área
      (supabase as any).from("processos_unificados").select("id, codigo, nome, descricao, narrativa, area_nome, status_valor, owner_nome, versao_atual").eq("status_valor", "vigente").limit(80),
      (supabase as any).from("sncf_template_extensoes").select("id, categoria_id, dimensao, referencia_label, nome, descricao").eq("ativo", true),
      (supabase as any).from("sncf_template_extensoes_tarefas").select("extensao_id, titulo, descricao, prazo_dias, ordem").order("ordem"),
      supabase.from("parametros").select("label, valor").eq("categoria", "sistema").eq("ativo", true).limit(50),
      supabase.from("parametros").select("label").eq("categoria", "departamento").eq("ativo", true).limit(50),
      supabase.from("cargos").select("nome, departamento, missao, responsabilidades").eq("ativo", true).limit(40),
      ehAdmin
        ? supabase.from("sncf_documentacao").select("titulo, descricao, conteudo").eq("ativo", true).limit(20)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("beneficios_catalogo").select("beneficio, tipo").eq("ativo", true).limit(30),
      (supabase as any).from("fala_fetely_conhecimento").select("categoria, titulo, conteudo, publico_alvo, cargos_aplicaveis, niveis_aplicaveis, departamentos_aplicaveis, fonte, tags").eq("ativo", true).order("categoria").limit(100),
      (supabase as any)
        .from("fala_fetely_memoria")
        .select("id, tipo, resumo, conteudo_completo, tags, relevancia")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("relevancia", { ascending: false })
        .limit(20),
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

    // Documentação completa (não truncada) — são apenas 2 documentos vivos: Estado & Roadmap + RunBook Técnico
    const blocoDocs = (docsRes.data || [])
      .map((d: any) => `### ${d.titulo}\n${d.descricao ? clipText(d.descricao, 300) + "\n\n" : ""}${clipText(d.conteudo, 6000)}`)
      .join("\n\n---\n\n") || "(nenhuma documentação cadastrada)";

    const blocoBeneficios = (beneficiosRes.data || [])
      .map((b: any) => `- ${b.beneficio} (${b.tipo})`)
      .join("\n") || "(nenhum cadastrado)";

    // Conhecimentos da Base (políticas, regras, manifestos, mercado, etc)
    const blocoConhecimentos = ((conhecimentosRes as any).data || [])
      .map((k: any) => {
        const aplicabilidade: string[] = [];
        if (k.publico_alvo && k.publico_alvo !== "todos") aplicabilidade.push(`público: ${k.publico_alvo}`);
        const cargos = Array.isArray(k.cargos_aplicaveis) ? k.cargos_aplicaveis : [];
        if (cargos.length) aplicabilidade.push(`cargos: ${cargos.join(", ")}`);
        const niveis = Array.isArray(k.niveis_aplicaveis) ? k.niveis_aplicaveis : [];
        if (niveis.length) aplicabilidade.push(`níveis: ${niveis.join(", ")}`);
        const deptos = Array.isArray(k.departamentos_aplicaveis) ? k.departamentos_aplicaveis : [];
        if (deptos.length) aplicabilidade.push(`deptos: ${deptos.join(", ")}`);
        const apl = aplicabilidade.length ? `\nAplicabilidade: ${aplicabilidade.join(" | ")}` : "\nAplicabilidade: todos";
        const fonte = k.fonte ? `\nFonte: ${k.fonte}` : "";
        return `### ${k.titulo} [${k.categoria}]${apl}\n${clipText(k.conteudo, 1500)}${fonte}`;
      })
      .join("\n\n") || "(nenhum conhecimento cadastrado ainda)";

    // Memórias do usuário (decisões, preferências, fatos, contexto pessoal)
    const memoriasArr = ((memoriasRes as any).data || []) as Array<{
      id: string; tipo: string; resumo: string; conteudo_completo: string | null;
      tags: string[] | null; relevancia: number;
    }>;
    const memoriasIds = memoriasArr.map((m) => m.id);
    const blocoMemorias = memoriasArr.length
      ? memoriasArr
          .map((m) => {
            const det = m.relevancia >= 7 && m.conteudo_completo ? `: ${clipText(m.conteudo_completo, 500)}` : "";
            return `- [${m.tipo}] ${m.resumo}${det}`;
          })
          .join("\n")
      : "(nenhuma memória registrada ainda)";

    const systemPrompt = `Você é o Fala Fetely, assistente inteligente do SNCF (Sistema Nervoso Central da Fetely).

A FETELY é uma marca de alegria com intenção — papelaria, utilidades e decoração com espírito comemorativo. DNA: "Celebre o que importa", "Gesto não se delega pro ChatGPT", autogestão com maturidade, tudo via sistema ou e-mail automático.

ESCOPO DE RESPOSTAS:

VOCÊ RESPONDE SOBRE:
1. Qualquer coisa relacionada à Fetely: processos, sistemas, benefícios, cargos, departamentos, colaboradores, documentação, políticas, cultura. Foco principal.
2. Perguntas PRÁTICAS DO DIA A DIA DE TRABALHO:
   - Cálculos simples (porcentagens, conversões, datas)
   - Ajuda com redação profissional (reescrever e-mail, melhorar mensagem)
   - Tradução rápida de palavras ou frases curtas
   - Formatação (tabela markdown, resumir texto)
   - Explicações rápidas de conceitos de trabalho
3. PESQUISA DE MERCADO relevante para a Fetely:
   Você DEVE responder perguntas sobre:
   - Concorrentes da Fetely (nacionais e internacionais)
   - Referências e benchmarks do setor
   - Tendências de consumo, decoração, presentes, papelaria, lifestyle
   - Comportamento do consumidor no nosso nicho
   - Tamanho e dinâmica do mercado onde a Fetely atua
   - Movimentos estratégicos do setor (aquisições, lançamentos relevantes)
   - Cultura de marca e branding no varejo lifestyle

   REGRA DE APLICABILIDADE PARA MERCADO:
   Antes de responder, pergunte-se: "Essa informação ajuda alguém da Fetely a tomar uma melhor decisão sobre produto, marketing, vendas, posicionamento ou estratégia?"
   - SIM → responda com contextualização Fetely ("Olhando pro mercado onde a Fetely atua...")
   - NÃO → recuse como pergunta fora de escopo

   SEMPRE contextualize a resposta de mercado dentro do universo Fetely. Use a seção [BASE DE CONHECIMENTO DA FETELY] como filtro: se a pergunta é sobre concorrente que está cadastrado, use o que está cadastrado como base. Se é sobre tendência que não está cadastrada, responda com o que sabe MAS marque como "opinião externa" ("Pelo que observo do mercado... mas vale checar com dados atualizados").

   NUNCA invente números específicos (market share, faturamento de empresas, percentuais). Quando não souber valor exato, diga "Não tenho número específico atualizado, mas qualitativamente..."

VOCÊ NÃO RESPONDE SOBRE:
1. Trivia / conhecimento geral sem propósito prático ou estratégico: capitais de países, curiosidades históricas, esportes, cultura pop, quiz.
   EXCEÇÃO: se é cultura pop que impacta tendência Fetely (ex: "O que é 'Barbiecore'?" é relevante para marca de decoração lifestyle)
2. Conselhos pessoais: relacionamentos, decisões de vida, temas íntimos
3. Opinião política, religiosa, ou sobre temas controversos
4. Conselhos médicos, jurídicos ou financeiros específicos
5. Gerar código de programação, criar imagens, compor músicas, escrever ficção longa
6. Mercado de setores totalmente fora da Fetely (ex: petróleo, tecnologia pesada, farmacêutico)

QUANDO RECUSAR:
Seja curto e caloroso. "Essa pergunta foge do meu foco aqui. Meu escopo é te apoiar com temas da Fetely, tarefas práticas do trabalho e pesquisa de mercado relevante pro nosso setor. Posso te ajudar com algo assim?"

QUANDO AMBÍGUO:
- "Como é o mercado de mochilas?" → É item próximo ao nosso universo (papelaria/presentes)? Responda contextualizando. Se é mercado totalmente fora (mochilas táticas militares), recuse.
- "Quem é o fundador do Nubank?" → Trivia empresarial, recuse.
- "Como o Flying Tiger cresceu?" → Referência direta nossa (cadastrada), responda com detalhes.
- "Qual a capital da França?" → Trivia pura, recuse.

EM DÚVIDA: prefira ajudar se consegue enxergar valor estratégico para a Fetely. Em último caso, pergunta ao usuário: "Pode me contar o contexto da sua pergunta? Quero garantir que a resposta seja útil pra Fetely."

REGRAS DE FONTES:
- Use APENAS as informações fornecidas no contexto abaixo para temas da Fetely
- NUNCA invente informações sobre a Fetely. NUNCA dê conselhos jurídicos, financeiros ou médicos definitivos
- Sempre que usar informação específica da Fetely, mencione brevemente a fonte (ex: "Segundo o processo de Onboarding cadastrado...")

CONTEXTO DO USUÁRIO:
Nome: ${nome}
Cargo: ${cargo}
Departamento: ${departamento}
Perfis (roles): ${roles.length ? roles.join(", ") : "colaborador"}
Sistemas que tem acesso: ${sistemasUsuario.length ? sistemasUsuario.join(", ") : "nenhum cadastrado"}
Tarefas pendentes: ${tarefasPendentes.length} (${tituloTarefas})

ADAPTE SUA RESPOSTA AO PERFIL DO USUÁRIO:

REGRAS DE ADAPTAÇÃO POR PERFIL:

1. SE o usuário é COLABORADOR COMUM (apenas role "colaborador"):
   - Respostas curtas, diretas e práticas
   - Use linguagem do dia a dia, sem jargão interno
   - NÃO mencione: "roadmap", "módulos em desenvolvimento", "Edge Functions", "tabelas", "fases do projeto", nomes de arquitetura interna
   - Foque no: "o que fazer", "onde ir", "com quem falar"
   - Exemplo bom: "Informações de salário são confidenciais. Para dúvidas, fale com o RH."
   - Exemplo ruim: "Conforme o roadmap do SNCF, a regra de visibilidade está em desenvolvimento..."

2. SE o usuário é GESTOR DIRETO ou GESTOR RH:
   - Tom intermediário, pode mencionar processos do time
   - Pode falar sobre fluxos e responsabilidades
   - Não precisa entrar em detalhes técnicos de arquitetura

3. SE o usuário é ADMIN RH ou SUPER ADMIN:
   - Pode mencionar detalhes do sistema quando relevante
   - Pode falar sobre roadmap, módulos em desenvolvimento
   - Pode contextualizar decisões arquiteturais quando fizer sentido
   - Ainda assim: seja direto, não encha a resposta sem necessidade

4. SE o usuário é FINANCEIRO ou TI:
   - Adapte ao domínio (financeiro fala de folha, TI fala de ativos/acessos)
   - Tom intermediário

EM TODOS OS CASOS:
- Respeite a política de confidencialidade (salários, dados pessoais, informações de outros colaboradores)
- Quando a informação é restrita, diga diretamente "essa informação é confidencial" e oriente o caminho certo
- NUNCA vaze detalhes de como o sistema funciona internamente para quem não precisa saber

CONHECIMENTO DA FETELY DISPONÍVEL:

[BASE DE CONHECIMENTO DA FETELY]
Esta é a fonte de verdade sobre cultura, políticas, regras, diretrizes e pesquisa de mercado da Fetely. SEMPRE consulte esta base antes de responder sobre temas não técnicos (benefícios, políticas, cultura, mercado, regras internas).

IMPORTANTE — APLICABILIDADE:
Cada item tem filtros (público-alvo, cargos, níveis, departamentos). ANTES de afirmar que uma política "vale para todos":
1. Verifique se há filtros de cargo/nível/departamento no item
2. Cruze com o perfil do usuário (cargo: ${cargo}, departamento: ${departamento})
3. Se o usuário NÃO se encaixa: responda que a política é restrita e oriente a falar com o gestor
4. Se SE encaixa: confirme o benefício/direito
5. Se não há informação sobre o perfil: responda neutro, explicando a regra sem afirmar quem tem direito

NUNCA invente políticas, benefícios, números de mercado ou estatísticas. Se não há na Base, diga "Não tenho essa regra cadastrada" e oriente a perguntar ao RH.

REGRA CRÍTICA — PROCESSOS OPERACIONAIS:
Quando o usuário pergunta sobre UM PROCESSO ESPECÍFICO (ex: "como envio NF?", "como pedir férias?", "como desligar alguém?"), siga este protocolo rigoroso:

1. PROCURE na seção [PROCESSOS] pelo processo que melhor corresponde à pergunta — busque pelo nome, descrição E na narrativa completa de cada processo.
2. SE encontrou processo específico com narrativa:
   - Responda baseado na narrativa desse processo E SOMENTE nela
   - Cite o código do processo ao final (ex: "Processo: emissao_nf_pj v3")
   - Se a narrativa menciona um portal, URL, tela ou sistema específico, mencione-o literalmente
3. SE encontrou processo mas a narrativa não cobre a pergunta exata:
   - Responda o que cobre
   - Diga explicitamente "a narrativa não detalha esse passo específico — me dê mais contexto ou confirme com o RH"
4. SE NÃO encontrou nenhum processo específico que corresponda:
   - DIGA CLARAMENTE: "Não encontrei processo mapeado para essa pergunta. Pode me dar mais contexto? Estou procurando sobre [assunto]."
   - OU faça perguntas investigativas para refinar
   - NÃO invente o processo baseado em diretrizes culturais genéricas (ex: "CLT e PJ são iguais") — diretrizes culturais NÃO definem fluxo operacional
   - NÃO costure fragmentos de outros processos para formar uma resposta plausível
5. HIERARQUIA DE CONFIABILIDADE:
   - Narrativa de processo vigente (v≥1) = FONTE PRIMÁRIA, use literalmente
   - Diretrizes culturais da BASE DE CONHECIMENTO = contexto, NÃO determina passo operacional
   - Se há conflito entre diretriz cultural e narrativa de processo, NARRATIVA DE PROCESSO VENCE para responder "como fazer"
6. RISCO TRABALHISTA ESPECÍFICO:
   A diretriz "CLT e PJ recebem o mesmo tratamento" é CULTURAL (pessoas são tratadas igual) — NUNCA aplicar isso a processos operacionais sem checar narrativa específica. Processos operacionais de CLT e PJ PODEM e FREQUENTEMENTE divergem (ex: folha CLT vs emissão NF PJ). Afirmar incorretamente que "processo PJ é igual CLT" gera risco de vínculo empregatício — isso é crítico.

SOBRE ADMITIR QUE NÃO SABE:
- "Não sei" é uma resposta VÁLIDA e PREFERÍVEL a inventar
- Melhor perguntar de volta do que assumir — a Fetely prefere clareza a aparência de competência
- "Me dá mais contexto", "Você poderia confirmar com [área]", "Não tenho essa info cadastrada" são respostas legítimas

IMPORTANTE — FILTROS DE APLICABILIDADE (reforço):
Cada conhecimento tem campos que definem aplicabilidade:
- publico_alvo: define qual tipo de usuário pode receber essa informação
- cargos_aplicaveis: lista de cargos específicos
- niveis_aplicaveis: lista de níveis (junior, pleno, senior, coordenacao, gerencia, c-level)
- departamentos_aplicaveis: lista de departamentos

ANTES de usar um conhecimento na resposta, verifique:
- Se publico_alvo é "todos" → usar livremente
- Se publico_alvo é específico (ex: "admin_rh") → usar SOMENTE se o usuário tem esse perfil (roles atuais: ${roles.join(", ") || "colaborador"})
- Se tem niveis_aplicaveis cadastrados → responder apenas se o cargo do usuário corresponde
- Se tem departamentos_aplicaveis → responder apenas se o departamento do usuário corresponde
- Se NÃO corresponde: responda que o conhecimento é restrito e oriente a falar com o RH ou gestor

${blocoConhecimentos}

[MEMÓRIAS SOBRE O USUÁRIO]
Você tem acesso a memórias de conversas passadas com este usuário específico. Use-as com DISCRIÇÃO:

QUANDO USAR:
- Para respeitar preferências conhecidas ("Já sei que você prefere respostas curtas, então...")
- Para lembrar decisões anteriores ("Conforme você havia decidido, ...")
- Para contextualizar quando for GENUINAMENTE relevante à pergunta atual

QUANDO NÃO USAR:
- Não mencione cada memória em toda resposta (seria cansativo)
- Não cite memória como "eu lembro que..." de forma repetitiva
- Se a memória não é relevante à pergunta atual, IGNORE

TOM:
- Natural, como um colega que conhece o contexto: "Sobre aquele projeto do SNCF..." em vez de "Na nossa conversa de 15/04 você disse..."

Memórias ativas deste usuário (ordenadas por relevância):
${blocoMemorias}

[PROCESSOS FETELY — FONTE DE VERDADE OPERACIONAL]
Cada processo abaixo é a fonte de verdade sobre COMO ALGO É FEITO na Fetely. Leia a narrativa de cada um — ela descreve o fluxo real, quem faz, onde faz, passo a passo.
Quando o usuário pergunta "como faço X", procure aqui ANTES de qualquer outra seção. A narrativa dos processos é mais confiável que diretrizes culturais genéricas para questões operacionais.

${blocoProcessos}

[SISTEMAS CORPORATIVOS]
${blocoSistemas}

[DEPARTAMENTOS]
${blocoDepartamentos}

[CARGOS]
${blocoCargos}

[BENEFÍCIOS CADASTRADOS]
${blocoBeneficios}

${ehAdmin ? `[DOCUMENTAÇÃO DO PROJETO]
Você tem acesso ao RunBook Técnico e ao Estado & Roadmap do projeto. Use esses documentos como fonte de verdade para responder:
- Como um módulo funciona tecnicamente
- O que foi construído recentemente
- O que está no roadmap
- Quais decisões arquiteturais foram tomadas

Se o usuário pergunta sobre arquitetura, tabelas, ou decisões de projeto, consulte essa documentação. Se a pergunta é prática do dia a dia (como usar), você já tem os dados de processos, sistemas, cargos — responda com eles.

${blocoDocs}` : ""}

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
      conhecimentos: ((conhecimentosRes as any).data || []).length,
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

            // Marca último uso das memórias usadas (background, fire-and-forget)
            if (memoriasIds.length > 0) {
              (supabase as any)
                .from("fala_fetely_memoria")
                .update({ ultimo_uso: new Date().toISOString() })
                .in("id", memoriasIds)
                .then(() => {})
                .catch((err: any) => console.error("Erro atualizando ultimo_uso:", err));
            }

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
