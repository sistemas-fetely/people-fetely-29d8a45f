import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BLING_API_BASE = "https://www.bling.com.br/Api/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ========== Auth ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Não autorizado");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roles) throw new Error("Apenas super_admin pode sincronizar");

    // ========== Body ==========
    const body = await req.json().catch(() => ({ tipo: "full" }));
    const tipo = body.tipo || "full";
    const oauthCode = body.code;
    const oauthRedirectUri = body.redirect_uri;

    // ========== TOKEN EXCHANGE (OAuth) ==========
    if (tipo === "token_exchange" && oauthCode) {
      const { data: cfg } = await supabase
        .from("integracoes_config")
        .select("client_id, client_secret")
        .eq("sistema", "bling")
        .maybeSingle();

      if (!cfg?.client_id || !cfg?.client_secret) {
        throw new Error("Client ID/Secret não cadastrados");
      }

      const tokenRes = await fetch(`${BLING_API_BASE}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: `Basic ${btoa(`${cfg.client_id}:${cfg.client_secret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: oauthCode,
          redirect_uri:
            oauthRedirectUri ||
            "https://people-fetely.lovable.app/administrativo/configuracao-integracao",
        }),
      });

      if (!tokenRes.ok) {
        const text = await tokenRes.text();
        throw new Error(`Bling rejeitou: ${tokenRes.status} — ${text}`);
      }

      const tokens = await tokenRes.json();

      await supabase
        .from("integracoes_config")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(
            Date.now() + (tokens.expires_in || 3600) * 1000,
          ).toISOString(),
          ativo: true,
          updated_at: new Date().toISOString(),
        })
        .eq("sistema", "bling");

      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: "Bling conectado com sucesso!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ========== Config ==========
    const { data: config } = await supabase
      .from("integracoes_config")
      .select("*")
      .eq("sistema", "bling")
      .single();

    if (!config?.access_token) {
      throw new Error(
        "Bling não configurado. Cadastre as credenciais em Configurações da Integração.",
      );
    }

    let accessToken = config.access_token as string;
    if (
      config.token_expires_at &&
      new Date(config.token_expires_at as string) < new Date()
    ) {
      accessToken = await refreshBlingToken(supabase, config);
    }

    // ========== Log start ==========
    const { data: logEntry } = await supabase
      .from("integracoes_sync_log")
      .insert({
        sistema: "bling",
        tipo,
        status: "executando",
        iniciado_por: user.id,
      })
      .select("id")
      .single();

    const startTime = Date.now();
    let totalCriados = 0;
    let totalAtualizados = 0;
    let totalErros = 0;
    const detalhes: string[] = [];

    if (tipo === "full" || tipo === "categorias") {
      const r = await syncCategorias(supabase, accessToken);
      totalCriados += r.criados;
      totalAtualizados += r.atualizados;
      totalErros += r.erros;
      detalhes.push(
        `Categorias: ${r.criados} novas, ${r.atualizados} atualizadas`,
      );
    }

    if (tipo === "full" || tipo === "contas_pagar") {
      const r = await syncContasPagarReceber(
        supabase,
        accessToken,
        "pagar",
        config.ultima_sync_at as string | null,
      );
      totalCriados += r.criados;
      totalAtualizados += r.atualizados;
      totalErros += r.erros;
      detalhes.push(
        `Contas a pagar: ${r.criados} novas, ${r.atualizados} atualizadas`,
      );
    }

    if (tipo === "full" || tipo === "contas_receber") {
      const r = await syncContasPagarReceber(
        supabase,
        accessToken,
        "receber",
        config.ultima_sync_at as string | null,
      );
      totalCriados += r.criados;
      totalAtualizados += r.atualizados;
      totalErros += r.erros;
      detalhes.push(
        `Contas a receber: ${r.criados} novas, ${r.atualizados} atualizadas`,
      );
    }

    const duracao = Date.now() - startTime;
    const statusFinal = totalErros > 0 ? "parcial" : "sucesso";

    await supabase
      .from("integracoes_sync_log")
      .update({
        status: statusFinal,
        registros_criados: totalCriados,
        registros_atualizados: totalAtualizados,
        registros_erro: totalErros,
        detalhes: detalhes.join(" | "),
        duracao_ms: duracao,
      })
      .eq("id", logEntry!.id);

    await supabase
      .from("integracoes_config")
      .update({
        ultima_sync_at: new Date().toISOString(),
        ultima_sync_status: statusFinal,
        ultima_sync_detalhes: detalhes.join(" | "),
        updated_at: new Date().toISOString(),
      })
      .eq("sistema", "bling");

    return new Response(
      JSON.stringify({
        sucesso: true,
        criados: totalCriados,
        atualizados: totalAtualizados,
        erros: totalErros,
        detalhes: detalhes.join(" | "),
        duracao_ms: duracao,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ sucesso: false, erro: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// HELPERS
// ============================================================

async function refreshBlingToken(supabase: any, config: any): Promise<string> {
  const res = await fetch(`${BLING_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${config.client_id}:${config.client_secret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.refresh_token,
    }),
  });
  if (!res.ok) {
    throw new Error("Falha ao renovar token do Bling. Reconfigure a integração.");
  }
  const data = await res.json();

  await supabase
    .from("integracoes_config")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("sistema", "bling");

  return data.access_token;
}

async function blingGet(
  endpoint: string,
  token: string,
  params: Record<string, string> = {},
): Promise<any> {
  const url = new URL(`${BLING_API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1100));
    return blingGet(endpoint, token, params);
  }
  if (!res.ok) {
    throw new Error(`Bling API erro ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ============================================================
// SYNC: CATEGORIAS → PLANO DE CONTAS
// ============================================================
async function syncCategorias(supabase: any, token: string) {
  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  try {
    const data = await blingGet("/categorias/receitas-despesas", token);
    const categorias = data.data || [];

    for (const cat of categorias) {
      try {
        const tipo = cat.tipo === 1 ? "receita" : "despesa";

        const { data: existente } = await supabase
          .from("plano_contas")
          .select("id")
          .eq("bling_id", String(cat.id))
          .maybeSingle();

        if (existente) {
          await supabase
            .from("plano_contas")
            .update({
              nome: cat.descricao,
              ativo: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existente.id);
          atualizados++;
        } else {
          let parentId: string | null = null;
          if (cat.idCategoriaPai) {
            const { data: parent } = await supabase
              .from("plano_contas")
              .select("id")
              .eq("bling_id", String(cat.idCategoriaPai))
              .maybeSingle();
            parentId = parent?.id || null;
          }

          await supabase.from("plano_contas").insert({
            codigo: String(cat.id),
            nome: cat.descricao,
            nivel: parentId ? 2 : 1,
            tipo,
            natureza: "operacional",
            origem: "bling",
            bling_id: String(cat.id),
            parent_id: parentId,
          });
          criados++;
        }
        await new Promise((r) => setTimeout(r, 100));
      } catch {
        erros++;
      }
    }
  } catch {
    erros++;
  }

  return { criados, atualizados, erros };
}

// ============================================================
// SYNC: CONTAS A PAGAR / RECEBER (unificada)
// ============================================================
async function syncContasPagarReceber(
  supabase: any,
  token: string,
  tipoSync: "pagar" | "receber",
  ultimaSync: string | null,
) {
  let criados = 0;
  let atualizados = 0;
  let erros = 0;
  let pagina = 1;
  let temMais = true;

  const endpoint = tipoSync === "pagar" ? "/contas/pagar" : "/contas/receber";
  const params: Record<string, string> = { limite: "100" };
  if (ultimaSync) {
    params["dataEmissao[gte]"] = ultimaSync.split("T")[0];
  }

  while (temMais) {
    try {
      params.pagina = String(pagina);
      const data = await blingGet(endpoint, token, params);
      const contas = data.data || [];

      if (contas.length === 0) {
        temMais = false;
        break;
      }

      for (const conta of contas) {
        try {
          let status = "aberto";
          if ([2, 5].includes(conta.situacao)) status = "pago";
          else if (conta.situacao === 3) status = "cancelado";
          if (
            status === "aberto" &&
            conta.vencimento &&
            new Date(conta.vencimento) < new Date()
          ) {
            status = "atrasado";
          }

          let contaId: string | null = null;
          if (conta.categoria?.id) {
            const { data: plano } = await supabase
              .from("plano_contas")
              .select("id")
              .eq("bling_id", String(conta.categoria.id))
              .maybeSingle();
            contaId = plano?.id || null;
          }

          const registro = {
            tipo: tipoSync,
            descricao:
              conta.historico || conta.nroDocumento || "Sem descrição",
            valor: parseFloat(conta.valor) || 0,
            data_vencimento: conta.vencimento,
            data_pagamento: conta.dataPagamento || null,
            status,
            conta_id: contaId,
            fornecedor_cliente: conta.contato?.nome || null,
            origem: "api_bling" as const,
            bling_id: String(conta.id),
            observacao: conta.ocorrencia || null,
          };

          const { data: existente } = await supabase
            .from("contas_pagar_receber")
            .select("id")
            .eq("bling_id", String(conta.id))
            .eq("tipo", tipoSync)
            .maybeSingle();

          if (existente) {
            await supabase
              .from("contas_pagar_receber")
              .update(registro)
              .eq("id", existente.id);
            atualizados++;
          } else {
            await supabase.from("contas_pagar_receber").insert(registro);
            criados++;
          }
        } catch {
          erros++;
        }
      }

      pagina++;
      await new Promise((r) => setTimeout(r, 350));
    } catch {
      erros++;
      temMais = false;
    }
  }

  return { criados, atualizados, erros };
}
