// Edge Function: atualizar-documentacao
// Permite atualizar conteúdo dos documentos vivos do SNCF via HTTP.
// Apenas super_admin pode chamar. Trigger sncf_documentacao_versionar
// cria automaticamente uma versão no histórico a cada UPDATE de conteúdo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "Missing Authorization header");

    // 1) Validar usuário autenticado
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) return jsonError(401, "Não autenticado");
    const user = userData.user;

    // 2) Verificar se é super_admin
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isSuperAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });
    if (!isSuperAdmin) return jsonError(403, "Apenas super_admin pode atualizar documentação");

    // 3) Validar input
    const body = await req.json().catch(() => ({}));
    const slug: string = (body.slug || "").trim();
    const conteudo: string = body.conteudo || "";
    const titulo: string | undefined = body.titulo?.trim() || undefined;
    const editor_nome: string = (body.editor_nome || "").trim() || (user.email ?? "Editor anônimo");

    if (!slug) return jsonError(400, "Campo 'slug' é obrigatório");
    if (!conteudo) return jsonError(400, "Campo 'conteudo' é obrigatório");
    if (conteudo.length > 200000) return jsonError(400, "Conteúdo muito longo (max 200k chars)");

    // 4) Verificar que o documento existe e está ativo
    const { data: docExistente, error: existeErr } = await supabase
      .from("sncf_documentacao")
      .select("id, versao")
      .eq("slug", slug)
      .eq("ativo", true)
      .maybeSingle();

    if (existeErr) {
      console.error("Erro buscando documento:", existeErr);
      return jsonError(500, "Erro ao buscar documento");
    }
    if (!docExistente) return jsonError(404, `Documento ativo com slug '${slug}' não encontrado`);

    // 5) UPDATE — o trigger sncf_documentacao_versionar cria a versão antiga no histórico
    const updatePayload: Record<string, unknown> = {
      conteudo,
      editado_por: user.id,
      editado_por_nome: editor_nome,
    };
    if (titulo) updatePayload.titulo = titulo;

    const { data: updated, error: updateErr } = await supabase
      .from("sncf_documentacao")
      .update(updatePayload)
      .eq("slug", slug)
      .eq("ativo", true)
      .select("id, slug, titulo, versao, updated_at")
      .single();

    if (updateErr) {
      console.error("Erro atualizando documento:", updateErr);
      return jsonError(500, "Erro ao atualizar documento: " + updateErr.message);
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        slug: updated.slug,
        titulo: updated.titulo,
        versao_nova: updated.versao,
        timestamp: updated.updated_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Erro inesperado:", e);
    return jsonError(500, "Erro inesperado: " + (e as Error).message);
  }
});
