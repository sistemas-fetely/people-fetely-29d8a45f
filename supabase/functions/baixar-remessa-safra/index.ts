// Rebuilds a previously generated Safra CNAB400 remittance file
// for re-download. Uses titulos already linked via remessa_safra_id,
// with their stored nosso_numero/linha_digitavel/codigo_barras.
// Does NOT re-allocate nosso_numero nor modify any record.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Helpers CNAB ───────────────────────────────────────────────────────────

function zeroLeft(val: string | number, length: number): string {
  return String(val).replace(/\D/g, "").padStart(length, "0").slice(-length);
}
function spaceRight(val: string, length: number): string {
  return (val ?? "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").padEnd(length, " ").slice(0, length);
}
function blanks(n: number): string { return " ".repeat(n); }
function fmtDDMMAA(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return String(d.getDate()).padStart(2,"0") + String(d.getMonth()+1).padStart(2,"0") + String(d.getFullYear()).slice(-2);
}
function fmtValor(valor: number, length: number): string {
  return String(Math.round(valor * 100)).padStart(length, "0").slice(-length);
}

function gerarHeader(params: Record<string, string>, nroSeq: number, hoje: string): string {
  let h = "";
  h += "0"; h += "1"; h += "REMESSA"; h += "01"; h += "COBRANCA";
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
  if (h.length !== 400) throw new Error(`Header com ${h.length} chars`);
  return h;
}

// deno-lint-ignore no-explicit-any
function gerarDetalhe(titulo: any, nossoNumero: string, params: Record<string, string>, nroSeq: number, nroReg: number, dataGeracao: string): string {
  const parceiro = titulo.parceiro ?? {};
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
  d += nossoNumero.padStart(9, "0");
  d += blanks(30);
  d += "0"; d += "00"; d += " ";
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
  d += fmtDDMMAA(dataGeracao);
  d += instrucao1; d += instrucao2;
  d += jurosDia;
  d += "000000"; d += "0000000000000"; d += "0000000000000";
  d += dataMulta; d += multaPct; d += "000";
  d += tipoInscricaoPagador;
  d += zeroLeft(docPagador, 14);
  d += spaceRight(parceiro.razao_social ?? "", 40);
  d += spaceRight(endereco, 40);
  d += spaceRight(parceiro.bairro ?? "", 10);
  d += blanks(2);
  d += zeroLeft(parceiro.cep ?? "", 8);
  d += spaceRight(parceiro.cidade ?? "", 15);
  d += spaceRight(parceiro.uf ?? "", 2);
  d += blanks(30); d += blanks(7);
  d += "422";
  d += zeroLeft(nroSeq, 3);
  d += zeroLeft(nroReg, 6);
  if (d.length !== 400) throw new Error(`Detalhe ${titulo.numero_titulo} com ${d.length} chars`);
  return d;
}

function gerarTrailer(nroSeq: number, qtd: number, total: number, nroRegFinal: number): string {
  let t = "9";
  t += blanks(367);
  t += zeroLeft(qtd, 8);
  t += fmtValor(total, 15);
  t += zeroLeft(nroSeq, 3);
  t += zeroLeft(nroRegFinal, 6);
  if (t.length !== 400) throw new Error(`Trailer com ${t.length} chars`);
  return t;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey    = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, erro: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sbUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await sbUser.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, erro: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const remessaId: string = body.remessa_id;
    if (!remessaId) {
      return new Response(JSON.stringify({ ok: false, erro: "remessa_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: remessa, error: remessaErr } = await sb
      .from("remessas_safra")
      .select("id, nro_sequencial, gerado_em, arquivo_nome")
      .eq("id", remessaId)
      .single();
    if (remessaErr || !remessa) {
      return new Response(JSON.stringify({ ok: false, erro: "Remessa não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: paramRows, error: paramErr } = await sb.from("parametros_remessa_safra").select("chave, valor");
    if (paramErr) throw new Error(`Erro ao carregar parâmetros: ${paramErr.message}`);
    const params: Record<string, string> = {};
    for (const row of (paramRows ?? []) as { chave: string; valor: string }[]) params[row.chave] = row.valor;

    const { data: titulos, error: titulosErr } = await sb
      .from("titulo_a_receber")
      .select(`id, numero_titulo, valor_bruto, data_vencimento_atual, nosso_numero_seq,
        conta:contas_pagar_receber(parceiro:parceiros_comerciais(id, razao_social, cnpj, cpf, logradouro, numero, bairro, cep, cidade, uf))`)
      .eq("remessa_safra_id", remessaId)
      .order("numero_titulo", { ascending: true });
    if (titulosErr) throw new Error(`Erro ao buscar títulos: ${titulosErr.message}`);
    if (!titulos || titulos.length === 0) {
      return new Response(JSON.stringify({ ok: false, erro: "Nenhum título vinculado a esta remessa" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const nroSeq = remessa.nro_sequencial;
    const dataGeracao = new Date(remessa.gerado_em).toISOString().slice(0, 10);
    const linhas: string[] = [];
    linhas.push(gerarHeader(params, nroSeq, dataGeracao));

    let nroReg = 2;
    let valorTotal = 0;

    // deno-lint-ignore no-explicit-any
    for (const t of titulos as any[]) {
      const nossoNumero = t.nosso_numero_seq;
      if (!nossoNumero) {
        return new Response(JSON.stringify({ ok: false, erro: `Título ${t.numero_titulo} sem nosso_numero — remessa corrompida` }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      linhas.push(gerarDetalhe({ ...t, parceiro: t.conta?.parceiro }, nossoNumero, params, nroSeq, nroReg, dataGeracao));
      valorTotal += Number(t.valor_bruto);
      nroReg++;
    }

    linhas.push(gerarTrailer(nroSeq, titulos.length, valorTotal, nroReg));
    const arquivoConteudo = linhas.join("\r\n") + "\r\n";

    return new Response(
      JSON.stringify({ ok: true, arquivo_conteudo: arquivoConteudo, arquivo_nome: remessa.arquivo_nome, qtd_titulos: titulos.length, valor_total: valorTotal }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("baixar-remessa-safra erro fatal", e);
    return new Response(JSON.stringify({ ok: false, erro: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
