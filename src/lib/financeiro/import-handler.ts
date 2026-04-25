/**
 * Pipeline compartilhado para importar NFs (de qualquer fonte) como contas a pagar.
 * - Anti-duplicata por chave de acesso.
 * - Auto-cadastro de parceiro por CNPJ.
 * - Insert de itens quando disponíveis.
 */

import { supabase } from "@/integrations/supabase/client";
import type { NFParsed } from "./types";

export async function verificarDuplicatas(nfs: NFParsed[]): Promise<NFParsed[]> {
  const chaves = nfs.map((n) => n.nf_chave_acesso).filter((c): c is string => !!c);
  if (chaves.length === 0) return nfs.map((n) => ({ ...n, _duplicata: false }));

  const { data } = await supabase
    .from("contas_pagar_receber")
    .select("nf_chave_acesso")
    .in("nf_chave_acesso", chaves);

  const existentes = new Set((data || []).map((r: any) => r.nf_chave_acesso as string));
  return nfs.map((n) => ({
    ...n,
    _duplicata: !!n.nf_chave_acesso && existentes.has(n.nf_chave_acesso),
  }));
}

export interface ImportResult {
  sucesso: number;
  vinculadas: number;
  erros: number;
  errosDetalhe: string[];
}

export async function importarNFs(nfs: NFParsed[]): Promise<ImportResult> {
  let sucesso = 0;
  let vinculadas = 0;
  let erros = 0;
  const errosDetalhe: string[] = [];

  for (const nf of nfs) {
    try {
      // === VINCULAÇÃO: NF bate com pagamento existente sem NF ===
      if (nf._match_pagamento) {
        const contaId = nf._match_pagamento.conta_id;

        const { error: upErr } = await supabase
          .from("contas_pagar_receber")
          .update({
            nf_chave_acesso: nf.nf_chave_acesso || null,
            nf_numero: nf.nf_numero || null,
            nf_serie: nf.nf_serie || null,
            nf_data_emissao: nf.nf_data_emissao || null,
            nf_cnpj_emitente: nf.fornecedor_cnpj || null,
            nf_valor_produtos: nf.nf_valor_produtos || nf.valor,
            nf_valor_impostos: nf.nf_valor_impostos || 0,
            nf_natureza_operacao: nf.nf_natureza_operacao || null,
            nf_cfop: nf.nf_cfop || null,
            nf_ncm: nf.nf_ncm || null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", contaId);

        if (upErr) throw upErr;

        // Histórico de vinculação
        await supabase.from("contas_pagar_historico").insert({
          conta_id: contaId,
          status_anterior: nf._match_pagamento.conta_status,
          status_novo: nf._match_pagamento.conta_status,
          observacao: `NF ${nf.nf_numero || "s/n"} vinculada via importação ${nf._source}`,
        } as any);

        // Inserir itens se houver (e a conta ainda não tem)
        if (nf.itens && nf.itens.length > 0) {
          const { count } = await supabase
            .from("contas_pagar_itens")
            .select("id", { count: "exact", head: true })
            .eq("conta_id", contaId);
          if (!count || count === 0) {
            const itensInsert = nf.itens.map((item) => ({
              conta_id: contaId,
              codigo_produto: item.codigo_produto || null,
              descricao: item.descricao,
              ncm: item.ncm || null,
              cfop: item.cfop || null,
              unidade: item.unidade || null,
              quantidade: item.quantidade ?? null,
              valor_unitario: item.valor_unitario ?? null,
              valor_total: item.valor_total ?? null,
              valor_icms: item.valor_icms ?? 0,
              valor_pis: item.valor_pis ?? 0,
              valor_cofins: item.valor_cofins ?? 0,
              conta_plano_id: item._categoria_id || nf._categoria_id || null,
            }));
            await supabase.from("contas_pagar_itens").insert(itensInsert as any);
          }
        }

        vinculadas++;
        continue;
      }

      // 1. Upsert parceiro por CNPJ
      let parceiro_id: string | null = null;
      if (nf.fornecedor_cnpj) {
        const { data: parceiro } = await supabase
          .from("parceiros_comerciais")
          .select("id")
          .eq("cnpj", nf.fornecedor_cnpj)
          .maybeSingle();

        if (parceiro) {
          parceiro_id = parceiro.id;
        } else {
          const { data: novoParceiro, error: pErr } = await supabase
            .from("parceiros_comerciais")
            .insert({
              cnpj: nf.fornecedor_cnpj,
              razao_social: nf.fornecedor_nome,
              tipo: "pj",
              tipos: ["fornecedor"],
              origem: nf._source === "csv_qive" ? "qive" : "nf_import",
            } as any)
            .select("id")
            .single();
          if (pErr) throw pErr;
          parceiro_id = novoParceiro?.id || null;
        }
      }

      // 2. Forma de pagamento
      let forma_id: string | null = null;
      if (nf.meio_pagamento) {
        const { data: forma } = await supabase
          .from("formas_pagamento")
          .select("id")
          .eq("codigo", nf.meio_pagamento)
          .maybeSingle();
        forma_id = forma?.id || null;
      }

      // 3. Insert conta a pagar
      // Se expandida por item, conta principal usa a categoria do item de maior valor
      let categoriaContaPrincipal = nf._categoria_id || null;
      let centroCustoContaPrincipal = nf._centro_custo || null;
      if (nf._expandirItens && nf.itens && nf.itens.length > 0) {
        const principal = nf.itens.reduce((a, b) =>
          (a.valor_total || 0) >= (b.valor_total || 0) ? a : b,
        );
        if (principal._categoria_id) {
          categoriaContaPrincipal = principal._categoria_id;
          centroCustoContaPrincipal = principal._centro_custo || null;
        }
      }

      const { data: contaCriada, error: contaErr } = await supabase
        .from("contas_pagar_receber")
        .insert({
          tipo: "pagar",
          descricao: `${nf.fornecedor_nome} — NF ${nf.nf_numero || "s/n"}`,
          valor: nf.valor,
          data_vencimento: nf.nf_data_emissao || new Date().toISOString().substring(0, 10),
          // Importação inteligente: completo → "aberto" (já validado), incompleto → "rascunho"
          status:
            categoriaContaPrincipal && nf.valor && (nf.fornecedor_cnpj || nf.fornecedor_nome)
              ? "aberto"
              : "rascunho",
          conta_id: categoriaContaPrincipal,
          centro_custo: centroCustoContaPrincipal,
          fornecedor_cliente: nf.fornecedor_nome,
          parceiro_id,
          fornecedor_id: parceiro_id,
          forma_pagamento_id: forma_id,
          origem: nf._source,
          nf_chave_acesso: nf.nf_chave_acesso || null,
          nf_numero: nf.nf_numero || null,
          nf_serie: nf.nf_serie || null,
          nf_data_emissao: nf.nf_data_emissao || null,
          nf_cnpj_emitente: nf.fornecedor_cnpj || null,
          nf_valor_produtos: nf.nf_valor_produtos || nf.valor,
          nf_valor_impostos: nf.nf_valor_impostos || 0,
          nf_natureza_operacao: nf.nf_natureza_operacao || null,
          nf_cfop: nf.nf_cfop || null,
          nf_ncm: nf.nf_ncm || null,
          categoria_sugerida_ia: !!categoriaContaPrincipal,
          categoria_confirmada: false,
        } as any)
        .select("id")
        .single();

      if (contaErr) throw contaErr;

      // 4. Itens (se existirem)
      if (nf.itens && nf.itens.length > 0 && contaCriada) {
        const itensInsert = nf.itens.map((item) => ({
          conta_id: contaCriada.id,
          codigo_produto: item.codigo_produto || null,
          descricao: item.descricao,
          ncm: item.ncm || null,
          cfop: item.cfop || null,
          unidade: item.unidade || null,
          quantidade: item.quantidade ?? null,
          valor_unitario: item.valor_unitario ?? null,
          valor_total: item.valor_total ?? null,
          valor_icms: item.valor_icms ?? 0,
          valor_pis: item.valor_pis ?? 0,
          valor_cofins: item.valor_cofins ?? 0,
          // Categoria por item — usada quando expandida; cai pra categoria geral senão
          conta_plano_id: nf._expandirItens
            ? item._categoria_id || nf._categoria_id || null
            : nf._categoria_id || null,
        }));
        const { error: itErr } = await supabase
          .from("contas_pagar_itens")
          .insert(itensInsert as any);
        if (itErr) {
          // Não falhar a NF inteira por causa de itens, mas registrar
          errosDetalhe.push(`Itens da NF ${nf.nf_numero}: ${itErr.message}`);
        }
      }

      sucesso++;
    } catch (e: any) {
      erros++;
      errosDetalhe.push(`${nf.fornecedor_nome} (NF ${nf.nf_numero}): ${e.message || e}`);
    }
  }

  return { sucesso, vinculadas, erros, errosDetalhe };
}
