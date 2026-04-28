import { useState } from "react";
import Papa from "papaparse";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  isCsvDetalhado,
  processarCsvDetalhado,
  processarCsvResumo,
} from "@/lib/financeiro/csv-qive-parser";

import {
  verificarDuplicatas,
} from "@/lib/financeiro/import-handler";
import { moverParaStage } from "@/lib/financeiro/stage-handler";
import { buscarMatchPagamentos } from "@/lib/financeiro/match-pagamentos";
import { useFilaAutoCadastroParceiro } from "@/hooks/useFilaAutoCadastroParceiro";
import { ParceiroFormSheet } from "@/components/financeiro/ParceiroFormSheet";
import type { NFParsed } from "@/lib/financeiro/types";
import type { CategoriaOption } from "@/components/financeiro/CategoriaCombobox";
import { PreviewNFsImport } from "./PreviewNFsImport";

interface Props {
  categorias: CategoriaOption[];
  onImported?: () => void;
}

export function ImportadorCsvQive({ categorias, onImported }: Props) {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<NFParsed[]>([]);
  

  // Fila de auto-cadastro de parceiros
  const fila = useFilaAutoCadastroParceiro();
  const [aguardandoCadastro, setAguardandoCadastro] = useState(false);
  const [nfsParaImportar, setNfsParaImportar] = useState<NFParsed[] | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      complete: async (results) => {
        try {
          const rows = (results.data || []).filter(
            (r) => r && Object.keys(r).length > 0
          );
          if (rows.length === 0) {
            toast.error("CSV vazio ou sem dados.");
            setParsing(false);
            return;
          }
          let nfs = isCsvDetalhado(rows)
            ? processarCsvDetalhado(rows)
            : processarCsvResumo(rows);
          // Engine de regras agora roda no banco via trigger AFTER INSERT em nfs_stage
          nfs = await verificarDuplicatas(nfs);
          // Buscar matches com pagamentos existentes (sem NF)
          nfs = await buscarMatchPagamentos(nfs);
          // Pré-selecionar todas as não-duplicadas
          nfs = nfs.map((n) => ({ ...n, _selecionada: !n._duplicata }));
          setPreview(nfs);
          const nVinc = nfs.filter((n) => n._match_pagamento).length;
          const msg = nVinc > 0
            ? `${nfs.length} NFs lidas — ${nVinc} vão vincular a pagamentos existentes.`
            : `${nfs.length} NFs lidas. Revise antes de importar.`;
          toast.success(msg);
        } catch (err: any) {
          toast.error("Erro ao processar CSV: " + (err.message || err));
        } finally {
          setParsing(false);
          // Permitir reupload do mesmo arquivo
          e.target.value = "";
        }
      },
      error: (err) => {
        toast.error("Erro ao ler CSV: " + err.message);
        setParsing(false);
      },
    });
  }

  async function doImport() {
    const selecionadas = preview.filter((n) => n._selecionada && !n._duplicata);
    if (selecionadas.length === 0) return;

    // Cadastro automático de parceiro acontece no Stage > Contas a Pagar
    await executarImportacao(selecionadas);
  }

  async function executarImportacao(nfs: NFParsed[]) {
    setImporting(true);
    // CSV não tem arquivo individual por NF (linhas), então não passa arquivos
    const result = await moverParaStage(nfs);
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

    if (fila.posicao + 1 >= fila.totalFila) {
      setAguardandoCadastro(false);
      executarImportacao(nfsAtualizadas);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-admin" />
          CSV do Qive
        </CardTitle>
        <CardDescription>
          Exporte o relatório avançado e importe aqui. Aceita formato resumo (1 linha por NF)
          ou detalhado (1 linha por item).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm">
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Selecionar CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
              disabled={parsing || importing}
            />
          </label>
          <span className="text-xs text-muted-foreground">
            Encoding UTF-8, separador vírgula
          </span>
        </div>

        <PreviewNFsImport
          nfs={preview}
          categorias={categorias}
          onChange={setPreview}
          onImport={doImport}
          onClear={() => setPreview([])}
          importing={importing}
        />
      </CardContent>

      {/* Modal sequencial de auto-cadastro */}
      <ParceiroFormSheet
        open={aguardandoCadastro && !!fila.itemAtual}
        onOpenChange={(v) => {
          if (!v) {
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
