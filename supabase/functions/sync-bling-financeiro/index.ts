import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nao autorizado");

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) throw new Error("Nao autorizado");

    const body = await req.json().catch(function() { return { tipo: "ping" }; });

    if (body.tipo === "ping") {
      return new Response(
        JSON.stringify({ sucesso: true, mensagem: "Edge Function ativa!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.tipo === "token_exchange" && body.code) {
      var cfg_result = await supabase
        .from("integracoes_config")
        .select("client_id, client_secret")
        .eq("sistema", "bling")
        .maybeSingle();

      if (!cfg_result.data || !cfg_result.data.client_id || !cfg_result.data.client_secret) {
        throw new Error("Client ID/Secret nao cadastrados");
      }

      var credentials = cfg_result.data.client_id + ":" + cfg_result.data.client_secret;
      var encoded = btoa(credentials);

      var params = new URLSearchParams();
      params.set("grant_type", "authorization_code");
      params.set("code", body.code);
      params.set("redirect_uri", body.redirect_uri || "https://people-fetely.lovable.app/administrativo/bling-callback");

      var tokenRes = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "Authorization": "Basic " + encoded
        },
        body: params
      });

      if (!tokenRes.ok) {
        var errText = await tokenRes.text();
        throw new Error("Bling rejeitou: " + tokenRes.status + " " + errText);
      }

      var tokens = await tokenRes.json();

      var expiresAt = new Date(Date.now() + ((tokens.expires_in || 3600) * 1000)).toISOString();

      await supabase
        .from("integracoes_config")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          ativo: true,
          updated_at: new Date().toISOString()
        })
        .eq("sistema", "bling");

      return new Response(
        JSON.stringify({ sucesso: true, mensagem: "Bling conectado com sucesso!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Tipo nao reconhecido: " + body.tipo);

  } catch (e) {
    var msg = (e instanceof Error) ? e.message : String(e);
    return new Response(
      JSON.stringify({ sucesso: false, erro: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
