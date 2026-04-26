import { useEffect, useState } from "react";
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
import { aplicarRegras, useRegrasCategorizacao } from "@/hooks/useRegrasCategorizacao";
import {
  importarNFs,
  verificarDuplicatas,
} from "@/lib/financeiro/import-handler";
import { buscarMatchPagamentos } from "@/lib/financeiro/match-pagamentos";
import { limparCnpj, parseDataBR, parseValorBR } from "@/lib/financeiro/parsers";
import { useAutoSaveRascunho, restaurarRascunho } from "@/hooks/useAutoSaveRascunho";
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
  const { data: regras } = useRegrasCategorizacao();

  // Auto-save no banco a cada mudança no preview (debounce 2s)
  const { clearRascunho, setRascunhoId } = useAutoSaveRascunho(preview, "pdf_danfe");

  // Fila de auto-cadastro de parceiros (CNPJs ainda não cadastrados)
  const fila = useFilaAutoCadastroParceiro();
  const [aguardandoCadastro, setAguardandoCadastro] = useState(false);
  const [nfsParaImportar, setNfsParaImportar] = useState<NFParsed[] | null>(null);

  // Restaurar rascunho ao montar
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const restaurado = await restaurarRascunho("pdf_danfe");
      if (cancelado || !restaurado) return;

      // Remove _arquivo (File não serializa) e marca para re-anexar
      const nfsRestauradas = restaurado.nfs.map((nf) => ({
        ...nf,
        _arquivo: undefined,
      }));

      setPreview(nfsRestauradas);
      setRascunhoId(restaurado.id);

      const semArquivo = nfsRestauradas.length;
      toast.info(
        `${semArquivo} NF${semArquivo === 1 ? "" : "s"} restaurada${semArquivo === 1 ? "" : "s"} da sessão anterior. ` +
          `Re-anexe os PDFs originais antes de importar para que os arquivos fiquem nas contas.`,
        { duration: 8000 },
      );
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          // Edge function devolve { success: true, data: {...} } ou objeto direto
          const payload = (data?.data || data || {}) as Record<string, any>;
          if (!payload || !payload.razao_social_prestador && !payload.emitente_nome) {
            toast.warning(`PDF ${f.name}: sem dados extraídos`);
            continue;
          }
          const nf: NFParsed = {
            nf_numero: String(payload.numero || ""),
            nf_serie: payload.serie ? String(payload.serie) : "",
            nf_data_emissao: parseDataBR(payload.data_emissao) || payload.data_emissao || null,
            nf_natureza_operacao: payload.natureza_operacao || payload.descricao || "",
            nf_chave_acesso: payload.chave_acesso || undefined,
            fornecedor_nome:
              payload.razao_social_prestador ||
              payload.emitente_nome ||
              payload.fornecedor_nome ||
              "Fornecedor",
            fornecedor_cnpj: limparCnpj(
              payload.cnpj_prestador || payload.emitente_cnpj || payload.fornecedor_cnpj || ""
            ),
            valor: parseValorBR(payload.valor || payload.valor_total),
            meio_pagamento: null,
            itens: Array.isArray(payload.itens)
              ? payload.itens.map((it: any) => ({
                  descricao: String(it.descricao || ""),
                  ncm: it.ncm ? String(it.ncm) : undefined,
                  quantidade: parseValorBR(it.quantidade),
                  valor_unitario: parseValorBR(it.valor_unitario),
                  valor_total: parseValorBR(it.valor_total),
                }))
              : [],
            _source: "pdf_nfe",
            _arquivo: f,
          };
          novas.push(nf);
        } catch (err: any) {
          toast.error(`Erro no PDF ${f.name}: ${err.message || err}`);
        }
      }
      let processadas = novas.map((n) => aplicarRegras(n, regras));
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

    // Verificar se tem CNPJs novos pra cadastrar antes
    const { nfs: nfsHidratadas, precisaCadastrar } = await fila.prepararFila(selecionadas);

    if (precisaCadastrar) {
      // Pausa importação - guarda lista hidratada e abre modal sequencial
      setNfsParaImportar(nfsHidratadas);
      setAguardandoCadastro(true);
      return;
    }

    // Não precisa cadastrar - vai direto
    await executarImportacao(nfsHidratadas);
  }

  async function executarImportacao(nfs: NFParsed[]) {
    setImporting(true);
    const result = await importarNFs(nfs);
    setImporting(false);
    if (result.sucesso > 0 || result.vinculadas > 0) {
      const partes: string[] = [];
      if (result.sucesso > 0) partes.push(`${result.sucesso} nova${result.sucesso === 1 ? "" : "s"}`);
      if (result.vinculadas > 0) partes.push(`${result.vinculadas} vinculada${result.vinculadas === 1 ? "" : "s"} a existentes`);
      if (result.erros > 0) partes.push(`${result.erros} erro${result.erros === 1 ? "" : "s"}`);
      toast.success(`Importação: ${partes.join(", ")}`);
      setPreview([]);
      await clearRascunho();
      onImported?.();
    } else if (result.erros > 0) {
      toast.error(`${result.erros} erros ao importar`);
      console.error(result.errosDetalhe);
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
          PDF (DANFE)
        </CardTitle>
        <CardDescription>
          Upload de DANFE em PDF. Lê os dados com IA — pode levar alguns segundos por arquivo.
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
