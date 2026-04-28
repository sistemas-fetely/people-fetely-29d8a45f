import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // ============================================
    // PROMPT MULTI-TIPO: NF-e, NFS-e, Recibo
    // ============================================
    const systemPrompt = `Você é um extrator de dados de documentos fiscais e financeiros.

Analise o PDF e identifique o TIPO do documento, depois extraia os campos.

TIPOS POSSÍVEIS:
1. "nfe" — NF-e brasileira de PRODUTO (DANFE com chave de acesso de 44 dígitos, NCM, CFOP, ICMS)
2. "nfse" — NFS-e brasileira de SERVIÇO (Nota Fiscal de Serviço Eletrônica, com prestador municipal, ISS, código de serviço)
3. "recibo" — Recibo/Invoice de empresa estrangeira (Anthropic, Lovable, AWS, Microsoft, Google, etc.) ou recibo brasileiro genérico SEM ser NF formal

Responda APENAS com JSON neste formato (sem markdown, sem explicações):

{
  "tipo_documento": "nfe" | "nfse" | "recibo",
  "pais_emissor": "BR" | "US" | "EU" | etc (código ISO 2 letras, default BR),
  "moeda": "BRL" | "USD" | "EUR" | etc (código ISO 3 letras, default BRL),
  "valor": number (valor total SEMPRE convertido pra BRL — se documento estrangeiro, use a taxa de conversão informada no próprio documento; se não tiver taxa, retorne valor original e null em valor_origem),
  "valor_origem": number ou null (valor na moeda original — preencher SOMENTE se moeda != BRL),
  "taxa_conversao": number ou null (multiplicador moeda_origem → BRL — preencher SOMENTE se moeda != BRL),
  "data_emissao": string formato YYYY-MM-DD,
  "data_vencimento": string formato YYYY-MM-DD ou null,
  "descricao": string (descrição dos itens/serviços),
  "numero_documento": string (número da NF, número do recibo, invoice number),
  "serie": string ou null (série, só pra NF-e/NFS-e brasileiras),
  "chave_acesso": string ou null (chave de acesso de 44 dígitos pra NF-e, ID do InfNfse pra NFS-e, null pra recibo),
  "fornecedor_cnpj": string ou null (CNPJ do prestador/emissor, apenas números, null se estrangeiro sem CNPJ BR),
  "fornecedor_razao_social": string (razão social do prestador/emissor)
}

REGRAS DE MOEDA — LEIA COM ATENÇÃO:

REGRA DE OURO: Se documento contém TEXTO de conversão de moeda (ex: "Charged R$51.78 using 1 USD = 5.1777 BRL"), a MOEDA do documento é a ORIGINAL (USD), NÃO a final (BRL).

- Se documento brasileiro com CNPJ → pais_emissor="BR", moeda="BRL", valor_origem=null, taxa_conversao=null
- Se documento estrangeiro SEM conversão (cobrança nativa em USD/EUR) → moeda=moeda da cobrança, valor=valor original, valor_origem=null, taxa_conversao=null
- Se documento estrangeiro COM conversão explícita (texto tipo "Charged R$X using 1 USD = Y BRL") → moeda=moeda ORIGINAL (USD/EUR), valor=valor BRL convertido, valor_origem=valor na moeda original, taxa_conversao=taxa explicitada
- Se documento estrangeiro emitido DIRETAMENTE em BRL (ex: Anthropic emite R$1.001,06 nativo) → moeda="BRL", valor_origem=null, taxa_conversao=null

REGRA INVIOLÁVEL: NUNCA preencher valor_origem ou taxa_conversao quando moeda="BRL". Se moeda="BRL", esses 2 campos DEVEM ser null. Se documento tem conversão explícita, moeda NÃO É "BRL".

REGRAS GERAIS:
- numero_documento: pra NF-e/NFS-e use o número da nota; pra recibo use invoice number ou receipt number
- Se não conseguir extrair algum campo opcional, use null
- Se não conseguir identificar o tipo com certeza, escolha o mais provável e prossiga`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
              {
                type: "text",
                text: "Identifique o tipo e extraia os dados deste documento.",
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", errText);
      return new Response(JSON.stringify({ error: "Erro ao processar PDF com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response (may have markdown code blocks)
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({
          error: "Não foi possível extrair dados do PDF",
          raw: content,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validação leve: garante campos mínimos com defaults
    const data = {
      tipo_documento: parsed.tipo_documento || "nfe",
      pais_emissor: parsed.pais_emissor || "BR",
      moeda: parsed.moeda || "BRL",
      valor: typeof parsed.valor === "number" ? parsed.valor : 0,
      valor_origem: parsed.valor_origem ?? null,
      taxa_conversao: parsed.taxa_conversao ?? null,
      data_emissao: parsed.data_emissao || null,
      data_vencimento: parsed.data_vencimento || null,
      descricao: parsed.descricao || null,
      numero_documento: parsed.numero_documento || null,
      serie: parsed.serie || null,
      chave_acesso: parsed.chave_acesso || null,
      fornecedor_cnpj: parsed.fornecedor_cnpj || null,
      fornecedor_razao_social: parsed.fornecedor_razao_social || null,
    };

    // ============================================
    // DEFESA EM PROFUNDIDADE: corrige inconsistências de moeda
    // ============================================
    // Caso 1: moeda='BRL' mas tem valor_origem/taxa preenchidos
    //         → IA confundiu moeda. Se há conversão, moeda original NÃO é BRL.
    //         → Limpa valor_origem e taxa_conversao (mantém moeda BRL coerente)
    if (data.moeda === "BRL" && (data.valor_origem !== null || data.taxa_conversao !== null)) {
      console.warn("Inconsistência detectada: moeda=BRL com conversão preenchida. Limpando campos de conversão.");
      data.valor_origem = null;
      data.taxa_conversao = null;
    }

    // Caso 2: valor_origem preenchido mas taxa_conversao NULL (ou vice-versa)
    //         → constraint "ambos ou nenhum". Limpa ambos.
    if ((data.valor_origem === null) !== (data.taxa_conversao === null)) {
      console.warn("Inconsistência: apenas um de valor_origem/taxa_conversao preenchido. Limpando ambos.");
      data.valor_origem = null;
      data.taxa_conversao = null;
    }

    // Caso 3: moeda != BRL mas SEM valor_origem/taxa
    //         → cobrança nativa em moeda estrangeira. valor já está na moeda dela.
    //         → Sistema espera valor SEMPRE em BRL. Se não tem como converter, falha graciosa.
    //         → Por enquanto: deixa passar (campo valor pode ficar incoerente, mas não bloqueia)

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
