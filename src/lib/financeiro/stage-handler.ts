/**
 * Stage Handler - Gerencia NFs em stage (etapa intermediária).
 *
 * Fluxo:
 * 1. Importadores (PDF/XML/CSV) parseiam arquivos e chamam moverParaStage()
 * 2. NFs ficam em nfs_stage com status 'pendente' ou 'classificada'
 * 3. Usuário classifica/edita na tela "NFs em Stage"
 * 4. Quando pronto, chama enviarParaContasPagar() que cria registros em contas_pagar_receber
 *
 * Vantagens:
 * - PDFs persistem no bucket nfs-stage (não dependem do localStorage)
 * - Multi-sessão: importa hoje, classifica amanhã
 * - Auditoria clara de quem importou e quando
 */
import { supabase } from "@/integrations/supabase/client";
import type { NFParsed } from "./types";

const BUCKET = "nfs-stage";

export interface StageResult {
  sucesso: number;
  duplicatas: number;
  erros: string[];
  loteId: string;
}

/**
 * Move NFs parseadas para o stage. Faz upload de PDFs/XMLs no bucket.
 */
export async function moverParaStage(
  nfs: NFParsed[],
  arquivosOrigem: { nf: NFParsed; arquivo?: File }[] = [],
): Promise<StageResult> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || null;
  const loteId = crypto.randomUUID();

  const result: StageResult = {
    sucesso: 0,
    duplicatas: 0,
    erros: [],
    loteId,
  };

  // Mapa NF -> arquivo (busca por chave única)
  const mapaArquivos = new Map<string, File>();
  for (const item of arquivosOrigem) {
    const k = chaveArquivo(item.nf);
    if (item.arquivo && k) mapaArquivos.set(k, item.arquivo);
  }

  for (const nf of nfs) {
    try {
      // Skip duplicata
      if (nf._duplicata) {
        result.duplicatas++;
        continue;
      }

      // Upload do arquivo (se houver) - PDF ou XML
      let storagePath: string | null = null;
      const arquivo = mapaArquivos.get(chaveArquivo(nf));
      if (arquivo) {
        const ext = arquivo.name.split(".").pop() || "pdf";
        const nomeLimpo = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        storagePath = `lote-${loteId}/${Date.now()}_${nomeLimpo}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, arquivo, {
            contentType: arquivo.type || "application/pdf",
            upsert: false,
          });
        if (upErr) {
          result.erros.push(`Upload de ${arquivo.name}: ${upErr.message}`);
          storagePath = null;
        }
      }

      // Status: pendente se não tem categoria, classificada se tem
      const status = nf._categoria_id ? "classificada" : "pendente";

      // Insert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insErr } = await (supabase as any)
        .from("nfs_stage")
        .insert({
          fonte: nf._source || "pdf_nfe",
          arquivo_nome: arquivo?.name || null,
          arquivo_storage_path: storagePath,
          importacao_lote_id: loteId,
          fornecedor_cnpj: nf.fornecedor_cnpj || null,
          fornecedor_razao_social: nf.fornecedor_razao_social || null,
          fornecedor_cliente: nf.fornecedor_cliente || null,
          parceiro_id: nf._parceiro_id_resolvido || null,
          nf_numero: nf.nf_numero || null,
          nf_chave_acesso: nf.nf_chave_acesso || null,
          nf_data_emissao: nf.nf_data_emissao || null,
          nf_serie: nf.nf_serie || null,
          valor: nf.valor || 0,
          descricao: nf.descricao || null,
          categoria_id: nf._categoria_id || null,
          data_vencimento: nf.data_vencimento || nf.nf_data_emissao || null,
          status,
          conta_pagar_existente_id: nf._match_pagamento?.id || null,
          match_score: nf._match_pagamento?.score || null,
          match_motivos: nf._match_pagamento?.motivos?.join(", ") || null,
          itens: nf.itens || null,
          criada_por: userId,
        });

      if (insErr) {
        result.erros.push(`Insert: ${insErr.message}`);
        continue;
      }

      result.sucesso++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.erros.push(msg);
    }
  }

  return result;
}

/**
 * Envia NFs do stage para a tabela contas_pagar_receber.
 * Faz inclusive a vinculação com conta_pagar_existente_id se houver match.
 */
export async function enviarStageParaContasPagar(
  stageIds: string[],
): Promise<{ sucesso: number; erros: string[] }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || null;
  const result = { sucesso: 0, erros: [] as string[] };

  // Busca NFs do stage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nfs, error: errBusca } = await (supabase as any)
    .from("nfs_stage")
    .select("*")
    .in("id", stageIds)
    .neq("status", "importada");

  if (errBusca) {
    result.erros.push(`Erro ao buscar stage: ${errBusca.message}`);
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const nf of (nfs || []) as any[]) {
    try {
      // Auto-cadastro de parceiro se necessário
      // Se tem CNPJ mas não tem parceiro_id, cria parceiro automaticamente
      // Nome Fantasia = Razão Social (atalho - usuário pode ajustar depois)
      let parceiroId = nf.parceiro_id;
      if (!parceiroId && nf.fornecedor_cnpj) {
        // Verifica se já existe parceiro com esse CNPJ
        const { data: existente } = await supabase
          .from("parceiros_comerciais")
          .select("id")
          .eq("cnpj", nf.fornecedor_cnpj)
          .maybeSingle();

        if (existente) {
          parceiroId = existente.id;
        } else if (nf.fornecedor_razao_social) {
          // Cria automático com Nome Fantasia = Razão Social
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: novoParceiro, error: errParc } = await (supabase as any)
            .from("parceiros_comerciais")
            .insert({
              cnpj: nf.fornecedor_cnpj,
              razao_social: nf.fornecedor_razao_social,
              nome_fantasia: nf.fornecedor_razao_social, // atalho
              tipo: "fornecedor",
              ativo: true,
            })
            .select("id")
            .single();

          if (!errParc && novoParceiro) {
            parceiroId = novoParceiro.id;
            // Atualiza o stage também
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from("nfs_stage")
              .update({ parceiro_id: parceiroId })
              .eq("id", nf.id);
          }
        }
      }

      // Caso 1: vincular a conta existente (atualizar a CP existente)
      if (nf.conta_pagar_existente_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: errUpd } = await (supabase as any)
          .from("contas_pagar_receber")
          .update({
            nf_numero: nf.nf_numero,
            nf_chave_acesso: nf.nf_chave_acesso,
            nf_data_emissao: nf.nf_data_emissao,
            nf_cnpj_emitente: nf.fornecedor_cnpj,
            descricao: nf.descricao,
            origem: "vinculacao_nf",
          })
          .eq("id", nf.conta_pagar_existente_id);
        if (errUpd) {
          result.erros.push(`Erro vinculação: ${errUpd.message}`);
          continue;
        }
        // Marca stage como importada
        await marcarComoImportada(nf.id, nf.conta_pagar_existente_id, userId);

        // Move PDF do bucket nfs-stage pra financeiro-docs
        if (nf.arquivo_storage_path) {
          await moverArquivoParaContasPagar(
            nf.arquivo_storage_path,
            nf.conta_pagar_existente_id,
            nf.arquivo_nome || "documento.pdf",
          );
        }
        result.sucesso++;
        continue;
      }

      // Caso 2: criar nova conta a pagar
      const descricao = montarDescricao(nf);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: novaConta, error: errIns } = await (supabase as any)
        .from("contas_pagar_receber")
        .insert({
          tipo: "pagar",
          descricao,
          fornecedor_cliente:
            nf.fornecedor_razao_social || nf.fornecedor_cliente || "Sem identificação",
          parceiro_id: parceiroId,
          valor: nf.valor,
          data_emissao: nf.nf_data_emissao,
          data_vencimento: nf.data_vencimento || nf.nf_data_emissao,
          status: "aberto",
          conta_id: nf.categoria_id,
          nf_numero: nf.nf_numero,
          nf_chave_acesso: nf.nf_chave_acesso,
          nf_data_emissao: nf.nf_data_emissao,
          nf_serie: nf.nf_serie,
          nf_cnpj_emitente: nf.fornecedor_cnpj,
          origem: nf.fonte || "pdf_nfe",
        })
        .select("id")
        .single();

      if (errIns) {
        result.erros.push(`Erro insert: ${errIns.message}`);
        continue;
      }

      // Move PDF do bucket nfs-stage pra financeiro-docs (vinculado à conta nova)
      if (nf.arquivo_storage_path) {
        await moverArquivoParaContasPagar(
          nf.arquivo_storage_path,
          novaConta.id,
          nf.arquivo_nome || "documento.pdf",
        );
      }

      // Marca stage como importada
      await marcarComoImportada(nf.id, novaConta.id, userId);
      result.sucesso++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.erros.push(msg);
    }
  }

  return result;
}

/**
 * Move arquivo do bucket nfs-stage pra financeiro-docs vinculando à conta criada.
 */
async function moverArquivoParaContasPagar(
  pathStage: string,
  contaId: string,
  nomeArquivo: string,
): Promise<void> {
  try {
    // Download do arquivo no stage
    const { data: blob } = await supabase.storage.from(BUCKET).download(pathStage);
    if (!blob) return;

    // Upload no financeiro-docs
    const ext = nomeArquivo.split(".").pop() || "pdf";
    const tipoDoc = ext === "xml" ? "outro" : "nf";
    const novoPath = `cp/${contaId}/${Date.now()}_${nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage
      .from("financeiro-docs")
      .upload(novoPath, blob);
    if (upErr) {
      console.warn("Falha ao mover doc:", upErr);
      return;
    }

    // Registra em contas_pagar_documentos
    await supabase.from("contas_pagar_documentos").insert({
      conta_id: contaId,
      tipo: tipoDoc,
      nome_arquivo: nomeArquivo,
      storage_path: novoPath,
      tamanho_bytes: blob.size,
    });

    // Apaga do bucket nfs-stage
    await supabase.storage.from(BUCKET).remove([pathStage]);
  } catch (e) {
    console.warn("Erro mover arquivo:", e);
  }
}

async function marcarComoImportada(
  stageId: string,
  contaPagarId: string,
  userId: string | null,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("nfs_stage")
    .update({
      status: "importada",
      conta_pagar_id: contaPagarId,
      importada_em: new Date().toISOString(),
      importada_por: userId,
    })
    .eq("id", stageId);
}

function montarDescricao(nf: Record<string, unknown>): string {
  const fornecedor =
    (nf.fornecedor_razao_social as string) || (nf.fornecedor_cliente as string) || "";
  const numero = nf.nf_numero ? `NF ${nf.nf_numero}` : "";
  if (fornecedor && numero) return `${fornecedor} — ${numero}`;
  if (fornecedor) return fornecedor;
  if (numero) return numero;
  return "NF importada";
}

function chaveArquivo(nf: NFParsed): string {
  return [nf.nf_chave_acesso, nf.fornecedor_cnpj, nf.nf_numero, nf.valor]
    .filter(Boolean)
    .join("|");
}

/**
 * Descarta NFs do stage (apaga registros + arquivos).
 */
export async function descartarStage(stageIds: string[]): Promise<number> {
  // Pega paths pra apagar do bucket
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nfs } = await (supabase as any)
    .from("nfs_stage")
    .select("arquivo_storage_path")
    .in("id", stageIds);

  // Apaga arquivos
  const paths = (nfs || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((n: any) => n.arquivo_storage_path)
    .filter(Boolean) as string[];
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  // Apaga registros
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (supabase as any)
    .from("nfs_stage")
    .delete({ count: "exact" })
    .in("id", stageIds);

  if (error) throw error;
  return count || 0;
}
