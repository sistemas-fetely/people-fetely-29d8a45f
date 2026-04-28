import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import {
  verificarDuplicatas,
} from "@/lib/financeiro/import-handler";
import { moverParaStage } from "@/lib/financeiro/stage-handler";
import { buscarMatchPagamentos } from "@/lib/financeiro/match-pagamentos";
import { limparCnpj, parseDataBR, parseValorBR } from "@/lib/financeiro/parsers";
import { useFilaAutoCadastroParceiro } from "@/hooks/useFilaAutoCadastroParceiro";
import { ParceiroFormSheet } from "@/components/financeiro/ParceiroFormSheet";
import type { NFParsed } from "@/lib/financeiro/types";
import type { CategoriaOption } from "@/components/financeiro/CategoriaCombobox";
import { PreviewNFsImport } from "./PreviewNFsImport";

interface Props {
  categorias: CategoriaOption[];
  onImported?: () => void;
}

export function ImportadorPdfDanfe({ categorias, onImported }: Props) {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<NFParsed[]>([]);
  

  // Fila de auto-cadastro de parceiros (CNPJs ainda não cadastrados)
  const fila = useFilaAutoCadastroParceiro();
  const [aguardandoCadastro, setAguardandoCadastro] = useState(false);
  const [nfsParaImportar, setNfsParaImportar] = useState<NFParsed[] | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setParsing(true);
    try {
      const novas: NFParsed[] = [];
      for (const f of files) {
        try {
          const formData = new FormData();
          formData.append("file", f);
          const { data, error } = await supabase.functions.invoke("parse-nf-pdf", {
            body: formData,
          });
          if (error) throw error;
          // Edge function devolve { success: true, data: {...} }
          const payload = (data?.data || data || {}) as Record<string, any>;

          // Validação: precisa pelo menos de fornecedor identificável
          if (!payload || (!payload.fornecedor_razao_social && !payload.razao_social_prestador && !payload.emitente_nome)) {
            toast.warning(`PDF ${f.name}: sem dados extraídos`);
            continue;
          }

          const tipoDoc = payload.tipo_documento || "nfe";

          const nf: NFParsed = {
            // Identificação
            nf_numero: String(payload.numero_documento || payload.numero || ""),
            nf_serie: payload.serie ? String(payload.serie) : "",
            nf_data_emissao: parseDataBR(payload.data_emissao) || payload.data_emissao || null,
            nf_natureza_operacao: payload.descricao || payload.natureza_operacao || "",
            nf_chave_acesso: payload.chave_acesso || undefined,

            // Fornecedor (com fallback pra schema antigo)
            fornecedor_nome:
              payload.fornecedor_razao_social ||
              payload.razao_social_prestador ||
              payload.emitente_nome ||
              "Fornecedor",
            fornecedor_cnpj: limparCnpj(
              payload.fornecedor_cnpj ||
              payload.cnpj_prestador ||
              payload.emitente_cnpj ||
              ""
            ) || undefined,

            // Valores (sempre em BRL no campo principal)
            valor: parseValorBR(payload.valor || payload.valor_total),

            // Pagamento
            meio_pagamento: null,

            // Itens (NF-e produto tem; recibo geralmente não)
            itens: Array.isArray(payload.itens)
              ? payload.itens.map((it: any) => ({
                  descricao: String(it.descricao || ""),
                  ncm: it.ncm ? String(it.ncm) : undefined,
                  quantidade: parseValorBR(it.quantidade),
                  valor_unitario: parseValorBR(it.valor_unitario),
                  valor_total: parseValorBR(it.valor_total),
                }))
              : [],

            // Metadados de origem e tipo
            _source: "pdf_nfe",
            _arquivo: f,
            tipo_documento: tipoDoc,
            pais_emissor: payload.pais_emissor || "BR",
            moeda: payload.moeda || "BRL",
            valor_origem: payload.valor_origem ?? null,
            taxa_conversao: payload.taxa_conversao ?? null,
          };
          novas.push(nf);
        } catch (err: any) {
          toast.error(`Erro no PDF ${f.name}: ${err.message || err}`);
        }
      }
      let processadas = [...novas];
      processadas = await verificarDuplicatas(processadas);
      processadas = await buscarMatchPagamentos(processadas);
      processadas = processadas.map((n) => ({ ...n, _selecionada: !n._duplicata }));
      if (processadas.length > 0) {
        setPreview((prev) => [...prev, ...processadas]);
        toast.success(`${processadas.length} PDF${processadas.length === 1 ? "" : "s"} processado${processadas.length === 1 ? "" : "s"}`);
      }
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  async function doImport() {
    const selecionadas = preview.filter((n) => n._selecionada && !n._duplicata);
    if (selecionadas.length === 0) return;

    // Não precisa mais de fila de auto-cadastro de parceiro aqui.
    // O cadastro automático acontece quando a NF é enviada do Stage para Contas a Pagar.
    await executarImportacao(selecionadas);
  }

  async function executarImportacao(nfs: NFParsed[]) {
    setImporting(true);
    // Coleta os arquivos PDF originais para enviar ao stage
    const arquivosOrigem = nfs
      .filter((n) => n._arquivo)
      .map((n) => ({ nf: n, arquivo: n._arquivo as File }));
    const result = await moverParaStage(nfs, arquivosOrigem);
    setImporting(false);
    if (result.sucesso > 0) {
      toast.success(
        `${result.sucesso} NF${result.sucesso === 1 ? "" : "s"} enviada${result.sucesso === 1 ? "" : "s"} pro Stage. Acesse "NFs em Stage" para revisar e enviar pra Contas a Pagar.`,
      );
      setPreview([]);
      onImported?.();
    }
    if (result.duplicatas > 0) {
      toast.info(`${result.duplicatas} duplicata${result.duplicatas === 1 ? "" : "s"} ignorada${result.duplicatas === 1 ? "" : "s"}`);
    }
    if (result.erros.length > 0) {
      toast.error(`${result.erros.length} erro(s): ${result.erros[0]}`);
      console.error(result.erros);
    }
  }

  function handleParceiroCadastrado(parceiroId: string) {
    if (!nfsParaImportar) return;
    const nfsAtualizadas = fila.avancarFila(nfsParaImportar, parceiroId);
    setNfsParaImportar(nfsAtualizadas);

    // Próxima posição já foi avançada pelo hook - se não há mais, executa importação
    if (fila.posicao + 1 >= fila.totalFila) {
      setAguardandoCadastro(false);
      executarImportacao(nfsAtualizadas);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5 text-admin" />
          PDFs (NF-e, NFS-e, Recibo)
        </CardTitle>
        <CardDescription>
          DANFE de NF-e, recibos NFS-e municipais ou recibos estrangeiros (Anthropic, Lovable, etc.). Lê os dados com IA — pode levar alguns segundos por arquivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm">
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Selecionar PDF(s)
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={handleFiles}
              disabled={parsing || importing}
            />
          </label>
          <span className="text-xs text-muted-foreground">
            Processado por IA
          </span>
        </div>

        <PreviewNFsImport
          nfs={preview}
          categorias={categorias}
          onChange={setPreview}
          onImport={doImport}
          importing={importing}
        />
      </CardContent>

      {/* Modal sequencial de auto-cadastro - aberto quando há CNPJs pendentes */}
      <ParceiroFormSheet
        open={aguardandoCadastro && !!fila.itemAtual}
        onOpenChange={(v) => {
          if (!v) {
            // só fecha se não está obrigatório (mas obrigatorio=true esconde Cancelar)
            setAguardandoCadastro(false);
            fila.cancelarFila();
            setNfsParaImportar(null);
          }
        }}
        categorias={categorias}
        obrigatorio
        prefill={
          fila.itemAtual
            ? {
                cnpj: fila.itemAtual.cnpj,
                razao_social: fila.itemAtual.razao_social,
              }
            : undefined
        }
        onSaved={handleParceiroCadastrado}
      />
    </Card>
  );
}
