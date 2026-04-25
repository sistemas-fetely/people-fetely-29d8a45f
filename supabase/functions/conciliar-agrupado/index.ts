import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const { movimentacao_id, contas_pagar_ids, observacao } = await req.json();

    if (!movimentacao_id || !Array.isArray(contas_pagar_ids) || contas_pagar_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "movimentacao_id e contas_pagar_ids são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Busca movimentação
    const { data: mov, error: movError } = await supabase
      .from("movimentacoes_bancarias")
      .select("id, valor, conciliado")
      .eq("id", movimentacao_id)
      .single();

    if (movError || !mov) {
      return new Response(JSON.stringify({ error: "Movimentação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mov.conciliado) {
      return new Response(JSON.stringify({ error: "Movimentação já conciliada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Busca contas a pagar
    const { data: contas, error: contasError } = await supabase
      .from("contas_pagar_receber")
      .select("id, valor, status")
      .in("id", contas_pagar_ids);

    if (contasError || !contas || contas.length === 0) {
      return new Response(JSON.stringify({ error: "Contas não encontradas" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const algumaConciliada = contas.some((c: any) => c.status === "conciliado");
    if (algumaConciliada) {
      return new Response(JSON.stringify({ error: "Uma ou mais contas já estão conciliadas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Calcula soma e tolerância
    const somaReal = contas.reduce((sum: number, c: any) => sum + Number(c.valor), 0);
    const valorMovAbs = Math.abs(Number(mov.valor));
    const diferenca = Math.abs(somaReal - valorMovAbs);
    const difPercent = valorMovAbs > 0 ? (diferenca / valorMovAbs) * 100 : 0;

    if (difPercent > 1.0) {
      return new Response(
        JSON.stringify({
          error: `Diferença muito grande: ${difPercent.toFixed(2)}% (máximo 1%)`,
          soma_contas: somaReal,
          valor_movimentacao: valorMovAbs,
          diferenca,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Cria agrupamento
    const { data: agrupamento, error: agrupError } = await supabase
      .from("conciliacoes_agrupadas")
      .insert({
        movimentacao_id,
        soma_esperada: somaReal,
        soma_real: valorMovAbs,
        diferenca_percentual: difPercent,
        observacao,
        criado_por: userId,
      })
      .select()
      .single();

    if (agrupError || !agrupamento) {
      return new Response(JSON.stringify({ error: "Erro ao criar agrupamento", details: agrupError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Itens
    const itens = contas_pagar_ids.map((id: string) => ({
      agrupamento_id: agrupamento.id,
      conta_pagar_id: id,
    }));

    const { error: itensError } = await supabase
      .from("conciliacoes_agrupadas_itens")
      .insert(itens);

    if (itensError) {
      return new Response(JSON.stringify({ error: "Erro ao criar itens", details: itensError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Atualiza contas
    const { error: updateContasError } = await supabase
      .from("contas_pagar_receber")
      .update({ status: "conciliado" })
      .in("id", contas_pagar_ids);

    if (updateContasError) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar contas", details: updateContasError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Atualiza movimentação
    const { error: updateMovError } = await supabase
      .from("movimentacoes_bancarias")
      .update({ conciliado: true })
      .eq("id", movimentacao_id);

    if (updateMovError) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar movimentação", details: updateMovError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        agrupamento_id: agrupamento.id,
        contas_conciliadas: contas_pagar_ids.length,
        diferenca_percentual: difPercent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
