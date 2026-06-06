import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function zeroLeft(val: string | number, length: number): string {
  return String(val).replace(/\D/g, "").padStart(length, "0").slice(-length);
}

function spaceRight(val: string, length: number): string {
  return val
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .padEnd(length, " ")
    .slice(0, length);
}

function blanks(n: number): string {
  return " ".repeat(n);
}

function fmtDDMMAA(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${aa}`;
}

function fmtValor(valor: number, length: number): string {
  const centavos = Math.round(valor * 100);
  return String(centavos).padStart(length, "0").slice(-length);
}

async function proximoSequencial(sb: ReturnType<typeof createClient>): Promise<number> {
  const { data } = await sb
    .from("remessas_safra")
    .select("nro_sequencial")
    .order("nro_sequencial", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { nro_sequencial: number } | null)?.nro_sequencial ?? 0) + 1;
}

function gerarHeader(params: Record<string, string>, nroSeq: number, hoje: string): string {
  let h = "";
  h += "0";
  h += "1";
  h += "REMESSA";
  h += "01";
  h += "COBRANCA";
  h += blanks(7);
  h += params.conta_com_dv;
  h += blanks(6);
  h += spaceRight(params.razao_social_cedente, 30);
  h += "422";
  h += spaceRight("BANCO SAFRA", 11);
  h += blanks(4);
  h += fmtDDMMAA(hoje);
  h += blanks(291);
  h += zeroLeft(nroSeq, 3);
  h += "000001";
  if (h.length !== 400) throw new Error(`Header com ${h.length} chars (esperado 400)`);
  return h;
}

// deno-lint-ignore no-explicit-any
function gerarDetalhe(titulo: any, params: Record<string, string>, nroSeq: number, nroReg: number): string {
  const parceiro = titulo.parceiro;
  const docPagador = (parceiro.cnpj ?? parceiro.cpf ?? "").replace(/\D/g, "");
  const tipoInscricaoPagador = docPagador.length === 14 ? "02" : "01";
  const endereco = [parceiro.logradouro, parceiro.numero].filter(Boolean).join(", ");
  const seuNumero = spaceRight(titulo.numero_titulo ?? "", 10);
  const usoLivre = spaceRight(titulo.id ?? "", 25);
  const instrucao1 = (params.politica_instrucao_1 ?? "08").padStart(2, "0");
  const instrucao2 = (params.politica_instrucao_2 ?? "00").padStart(2, "0");
  const jurosDia = zeroLeft(params.juros_mora_dia_centavos ?? "0", 13);
  const dataMulta = (() => {
    const d = new Date(titulo.data_vencimento_atual + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return fmtDDMMAA(d.toISOString().slice(0, 10));
  })();
  const multaPct = (params.multa_percentual ?? "0000").padStart(4, "0").slice(0, 4);

  let d = "";
  d += "1";
  d += "02";
  d += zeroLeft(params.cnpj_cedente, 14);
  d += params.conta_com_dv;
  d += blanks(6);
  d += usoLivre;
  d += "000000000";
  d += blanks(30);
  d += "0";
  d += "00";
  d += " ";
  d += zeroLeft(params.dias_protesto ?? "00", 2);
  d += (params.tipo_carteira ?? "1");
  d += "01";
  d += seuNumero;
  d += fmtDDMMAA(titulo.data_vencimento_atual);
  d += fmtValor(Number(titulo.valor_bruto), 13);
  d += "422";
  d += zeroLeft(params.agencia ?? "00005", 5);
  d += (params.especie_titulo ?? "01");
  d += "N";
  d += fmtDDMMAA(new Date().toISOString().slice(0, 10));
  d += instrucao1;
  d += instrucao2;
  d += jurosDia;
  d += "000000";
  d += "0000000000000";
  d += "0000000000000";
  d += dataMulta;
  d += multaPct;
  d += "000";
  d += tipoInscricaoPagador;
  d += zeroLeft(docPagador, 14);
  d += spaceRight(parceiro.razao_social ?? "", 40);
  d += spaceRight(endereco, 40);
  d += spaceRight(parceiro.bairro ?? "", 10);
  d += blanks(2);
  d += zeroLeft(parceiro.cep ?? "", 8);
  d += spaceRight(parceiro.cidade ?? "", 15);
  d += spaceRight(parceiro.uf ?? "", 2);
  d += blanks(30);
  d += blanks(7);
  d += "422";
  d += zeroLeft(nroSeq, 3);
  d += zeroLeft(nroReg, 6);
  if (d.length !== 400) throw new Error(`Detalhe ${titulo.numero_titulo} com ${d.length} chars (esperado 400)`);
  return d;
}

function gerarTrailer(nroSeq: number, qtdTitulos: number, valorTotal: number, nroRegFinal: number): string {
  let t = "";
  t += "9";
  t += blanks(367);
  t += zeroLeft(qtdTitulos, 8);
  t += fmtValor(valorTotal, 15);
  t += zeroLeft(nroSeq, 3);
  t += zeroLeft(nroRegFinal, 6);
  if (t.length !== 400) throw new Error(`Trailer com ${t.length} chars (esperado 400)`);
  return t;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey    = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, erro: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sbUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await sbUser.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, erro: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const tituloIds: string[] = Array.isArray(body.titulo_ids) ? body.titulo_ids : [];
    if (tituloIds.length === 0) {
      return new Response(JSON.stringify({ ok: false, erro: "titulo_ids não pode ser vazio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: paramRows, error: paramErr } = await sb
      .from("parametros_remessa_safra")
      .select("chave, valor");
    if (paramErr) throw new Error(`Erro ao carregar parâmetros: ${paramErr.message}`);
    const params: Record<string, string> = {};
    for (const row of (paramRows ?? []) as { chave: string; valor: string }[]) {
      params[row.chave] = row.valor;
    }

    const { data: titulos, error: titulosErr } = await sb
      .from("titulo_a_receber")
      .select(`
        id, numero_titulo, numero_parcela, total_parcelas,
        valor_bruto, data_vencimento_atual, boleto_status, tipo_pagamento,
        conta:contas_pagar_receber(
          parceiro:parceiros_comerciais(
            id, razao_social, cnpj, cpf, email,
            cadastro_incompleto, logradouro, numero,
            bairro, cep, cidade, uf
          )
        )
      `)
      .in("id", tituloIds);
    if (titulosErr) throw new Error(`Erro ao buscar títulos: ${titulosErr.message}`);
    if (!titulos || titulos.length === 0) {
      return new Response(JSON.stringify({ ok: false, erro: "Nenhum título encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const erros: Array<{ titulo_id: string; numero_titulo: string; motivo: string }> = [];
    for (const t of titulos as any[]) {
      const parceiro = t.conta?.parceiro;
      if (!parceiro) { erros.push({ titulo_id: t.id, numero_titulo: t.numero_titulo, motivo: "Parceiro não encontrado" }); continue; }
      if (parceiro.cadastro_incompleto) erros.push({ titulo_id: t.id, numero_titulo: t.numero_titulo, motivo: "Cadastro incompleto" });
      if (!parceiro.email) erros.push({ titulo_id: t.id, numero_titulo: t.numero_titulo, motivo: "E-mail não cadastrado" });
      if (Number(t.valor_bruto) <= 0) erros.push({ titulo_id: t.id, numero_titulo: t.numero_titulo, motivo: "Valor inválido" });
      if (new Date(t.data_vencimento_atual + "T00:00:00") < new Date(new Date().toDateString())) erros.push({ titulo_id: t.id, numero_titulo: t.numero_titulo, motivo: "Vencimento no passado" });
      if (t.tipo_pagamento !== "boleto") erros.push({ titulo_id: t.id, numero_titulo: t.numero_titulo, motivo: "Não é boleto" });
      if (t.boleto_status !== "pendente") erros.push({ titulo_id: t.id, numero_titulo: t.numero_titulo, motivo: `Status inválido: ${t.boleto_status}` });
    }
    if (erros.length > 0) {
      return new Response(JSON.stringify({ ok: false, erro: "Títulos com bloqueios", erros }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nroSeq = await proximoSequencial(sb);
    const hoje = new Date().toISOString().slice(0, 10);
    const linhas: string[] = [];
    linhas.push(gerarHeader(params, nroSeq, hoje));

    let nroReg = 2;
    let valorTotal = 0;
    for (const t of titulos as any[]) {
      linhas.push(gerarDetalhe({ ...t, parceiro: t.conta?.parceiro }, params, nroSeq, nroReg));
      valorTotal += Number(t.valor_bruto);
      nroReg++;
    }
    linhas.push(gerarTrailer(nroSeq, titulos.length, valorTotal, nroReg));

    const arquivoConteudo = linhas.join("\r\n") + "\r\n";
    const seqFormatado = String(nroSeq).padStart(3, "0");
    const arquivoNome = `FETELY_REMESSA_SAFRA_${hoje.replace(/-/g, "")}_${seqFormatado}.txt`;

    const { data: remessa, error: remessaErr } = await sb
      .from("remessas_safra")
      .insert({
        nro_sequencial: nroSeq,
        gerado_por:     callerId,
        qtd_titulos:    titulos.length,
        valor_total:    valorTotal,
        status:         "gerada",
        arquivo_nome:   arquivoNome,
      })
      .select("id")
      .single();
    if (remessaErr || !remessa) throw new Error(`Erro ao gravar remessa: ${remessaErr?.message}`);

    const { error: updErr } = await sb
      .from("titulo_a_receber")
      .update({ remessa_safra_id: remessa.id, boleto_status: "remessa_gerada" })
      .in("id", tituloIds);
    if (updErr) throw new Error(`Erro ao atualizar títulos: ${updErr.message}`);

    return new Response(
      JSON.stringify({
        ok:               true,
        arquivo_conteudo: arquivoConteudo,
        arquivo_nome:     arquivoNome,
        remessa_id:       remessa.id,
        nro_sequencial:   nroSeq,
        qtd_titulos:      titulos.length,
        valor_total:      valorTotal,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("gerar-remessa-safra erro fatal", e);
    return new Response(
      JSON.stringify({ ok: false, erro: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
