import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

var BLING_BASE = "https://www.bling.com.br/Api/v3";

function ok(data) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message, status) {
  return new Response(
    JSON.stringify({ sucesso: false, erro: message }),
    { status: status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function blingGet(endpoint, accessToken) {
  var url = BLING_BASE + endpoint;
  var res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Accept": "application/json"
    }
  });
  if (res.status === 429) {
    await sleep(1200);
    return blingGet(endpoint, accessToken);
  }
  if (!res.ok) {
    var text = await res.text();
    throw new Error("Bling API erro " + res.status + ": " + text);
  }
  return res.json();
}

async function refreshToken(supabase, config) {
  var credentials = config.client_id + ":" + config.client_secret;
  var encoded = btoa(credentials);
  var params = new URLSearchParams();
  params.set("grant_type", "refresh_token");
  params.set("refresh_token", config.refresh_token);

  var res = await fetch(BLING_BASE + "/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "Authorization": "Basic " + encoded
    },
    body: params
  });

  if (!res.ok) {
    throw new Error("Falha ao renovar token. Reconecte o Bling.");
  }

  var tokens = await res.json();
  var expiresAt = new Date(Date.now() + ((tokens.expires_in || 3600) * 1000)).toISOString();

  await supabase.from("integracoes_config").update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: expiresAt,
    updated_at: new Date().toISOString()
  }).eq("sistema", "bling");

  return tokens.access_token;
}

async function syncCategorias(supabase, accessToken) {
  var criados = 0;
  var atualizados = 0;
  var erros = 0;

  try {
    var data = await blingGet("/categorias/receitas-despesas", accessToken);
    var categorias = (data && data.data) ? data.data : [];

    for (var i = 0; i < categorias.length; i++) {
      try {
        var cat = categorias[i];
        var tipo = (cat.tipo === 1) ? "receita" : "despesa";
        var blingId = String(cat.id);

        var existing = await supabase
          .from("plano_contas")
          .select("id")
          .eq("bling_id", blingId)
          .maybeSingle();

        if (existing.data) {
          await supabase.from("plano_contas")
            .update({ nome: cat.descricao, ativo: true, updated_at: new Date().toISOString() })
            .eq("id", existing.data.id);
          atualizados++;
        } else {
          var parentId = null;
          if (cat.idCategoriaPai) {
            var parentResult = await supabase
              .from("plano_contas")
              .select("id")
              .eq("bling_id", String(cat.idCategoriaPai))
              .maybeSingle();
            if (parentResult.data) {
              parentId = parentResult.data.id;
            }
          }

          await supabase.from("plano_contas").insert({
            codigo: blingId,
            nome: cat.descricao,
            nivel: parentId ? 2 : 1,
            tipo: tipo,
            natureza: "operacional",
            origem: "bling",
            bling_id: blingId,
            parent_id: parentId
          });
          criados++;
        }
        await sleep(100);
      } catch (e) {
        erros++;
      }
    }
  } catch (e) {
    erros++;
  }

  return { criados: criados, atualizados: atualizados, erros: erros };
}

async function syncContas(supabase, accessToken, tipoSync, ultimaSync) {
  var criados = 0;
  var atualizados = 0;
  var erros = 0;
  var pagina = 1;
  var temMais = true;
  var endpoint = (tipoSync === "pagar") ? "/contas/pagar" : "/contas/receber";

  while (temMais) {
    try {
      var url = endpoint + "?limite=100&pagina=" + pagina;
      if (ultimaSync) {
        var dataFiltro = ultimaSync.split("T")[0];
        url = url + "&dataEmissao[gte]=" + dataFiltro;
      }

      var data = await blingGet(url, accessToken);
      var contas = (data && data.data) ? data.data : [];

      if (contas.length === 0) {
        temMais = false;
        break;
      }

      for (var i = 0; i < contas.length; i++) {
        try {
          var conta = contas[i];

          var status = "aberto";
          if (conta.situacao === 2 || conta.situacao === 5) {
            status = "pago";
          } else if (conta.situacao === 3) {
            status = "cancelado";
          }
          if (status === "aberto" && conta.vencimento) {
            var venc = new Date(conta.vencimento);
            if (venc < new Date()) {
              status = "atrasado";
            }
          }

          var contaId = null;
          if (conta.categoria && conta.categoria.id) {
            var planoResult = await supabase
              .from("plano_contas")
              .select("id")
              .eq("bling_id", String(conta.categoria.id))
              .maybeSingle();
            if (planoResult.data) {
              contaId = planoResult.data.id;
            }
          }

          var nomeContato = null;
          if (conta.contato && conta.contato.nome) {
            nomeContato = conta.contato.nome;
          }

          var descricao = conta.historico || conta.nroDocumento || "Sem descricao";
          var valor = parseFloat(conta.valor) || 0;
          var blingId = String(conta.id);

          var registro = {
            tipo: tipoSync,
            descricao: descricao,
            valor: valor,
            data_vencimento: conta.vencimento || null,
            data_pagamento: conta.dataPagamento || null,
            status: status,
            conta_id: contaId,
            fornecedor_cliente: nomeContato,
            origem: "api_bling",
            bling_id: blingId,
            observacao: conta.ocorrencia || null
          };

          var existing = await supabase
            .from("contas_pagar_receber")
            .select("id")
            .eq("bling_id", blingId)
            .eq("tipo", tipoSync)
            .maybeSingle();

          if (existing.data) {
            await supabase.from("contas_pagar_receber").update(registro).eq("id", existing.data.id);
            atualizados++;
          } else {
            await supabase.from("contas_pagar_receber").insert(registro);
            criados++;
          }
        } catch (e) {
          erros++;
        }
      }

      pagina++;
      await sleep(400);
    } catch (e) {
      erros++;
      temMais = false;
    }
  }

  return { criados: criados, atualizados: atualizados, erros: erros };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    var supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    var authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nao autorizado");

    var jwt = authHeader.replace("Bearer ", "");
    var authResult = await supabase.auth.getUser(jwt);
    if (authResult.error || !authResult.data.user) throw new Error("Nao autorizado");
    var user = authResult.data.user;

    var roleResult = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleResult.data) throw new Error("Apenas super_admin");

    var body = await req.json().catch(function() { return { tipo: "ping" }; });
    var tipo = body.tipo || "ping";

    if (tipo === "ping") {
      return ok({ sucesso: true, mensagem: "Edge Function ativa!" });
    }

    if (tipo === "token_exchange" && body.code) {
      var cfgResult = await supabase
        .from("integracoes_config")
        .select("client_id, client_secret")
        .eq("sistema", "bling")
        .maybeSingle();

      if (!cfgResult.data || !cfgResult.data.client_id || !cfgResult.data.client_secret) {
        throw new Error("Client ID/Secret nao cadastrados");
      }

      var credentials = cfgResult.data.client_id + ":" + cfgResult.data.client_secret;
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

      await supabase.from("integracoes_config").update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        ativo: true,
        updated_at: new Date().toISOString()
      }).eq("sistema", "bling");

      return ok({ sucesso: true, mensagem: "Bling conectado com sucesso!" });
    }

    if (tipo === "full" || tipo === "categorias" || tipo === "contas_pagar" || tipo === "contas_receber") {
      var configResult = await supabase
        .from("integracoes_config")
        .select("*")
        .eq("sistema", "bling")
        .maybeSingle();

      if (!configResult.data || !configResult.data.access_token) {
        throw new Error("Bling nao configurado. Conecte primeiro.");
      }

      var config = configResult.data;
      var accessToken = config.access_token;

      if (config.token_expires_at) {
        var expiresDate = new Date(config.token_expires_at);
        if (expiresDate < new Date()) {
          accessToken = await refreshToken(supabase, config);
        }
      }

      var logResult = await supabase.from("integracoes_sync_log").insert({
        sistema: "bling",
        tipo: tipo,
        status: "executando",
        iniciado_por: user.id
      }).select("id").maybeSingle();

      var logId = logResult.data ? logResult.data.id : null;
      var startTime = Date.now();
      var totalCriados = 0;
      var totalAtualizados = 0;
      var totalErros = 0;
      var detalhes = [];

      if (tipo === "full" || tipo === "categorias") {
        var r = await syncCategorias(supabase, accessToken);
        totalCriados = totalCriados + r.criados;
        totalAtualizados = totalAtualizados + r.atualizados;
        totalErros = totalErros + r.erros;
        detalhes.push("Categorias: " + r.criados + " novas, " + r.atualizados + " atualizadas");
      }

      if (tipo === "full" || tipo === "contas_pagar") {
        var r2 = await syncContas(supabase, accessToken, "pagar", config.ultima_sync_at);
        totalCriados = totalCriados + r2.criados;
        totalAtualizados = totalAtualizados + r2.atualizados;
        totalErros = totalErros + r2.erros;
        detalhes.push("Contas pagar: " + r2.criados + " novas, " + r2.atualizados + " atualizadas");
      }

      if (tipo === "full" || tipo === "contas_receber") {
        var r3 = await syncContas(supabase, accessToken, "receber", config.ultima_sync_at);
        totalCriados = totalCriados + r3.criados;
        totalAtualizados = totalAtualizados + r3.atualizados;
        totalErros = totalErros + r3.erros;
        detalhes.push("Contas receber: " + r3.criados + " novas, " + r3.atualizados + " atualizadas");
      }

      var duracao = Date.now() - startTime;
      var statusFinal = (totalErros > 0) ? "parcial" : "sucesso";
      var detalheStr = detalhes.join(" | ");

      if (logId) {
        await supabase.from("integracoes_sync_log").update({
          status: statusFinal,
          registros_criados: totalCriados,
          registros_atualizados: totalAtualizados,
          registros_erro: totalErros,
          detalhes: detalheStr,
          duracao_ms: duracao
        }).eq("id", logId);
      }

      await supabase.from("integracoes_config").update({
        ultima_sync_at: new Date().toISOString(),
        ultima_sync_status: statusFinal,
        ultima_sync_detalhes: detalheStr,
        updated_at: new Date().toISOString()
      }).eq("sistema", "bling");

      return ok({
        sucesso: true,
        criados: totalCriados,
        atualizados: totalAtualizados,
        erros: totalErros,
        detalhes: detalheStr,
        duracao_ms: duracao
      });
    }

    throw new Error("Tipo nao reconhecido: " + tipo);

  } catch (e) {
    var msg = (e instanceof Error) ? e.message : String(e);
    return err(msg, 400);
  }
});
