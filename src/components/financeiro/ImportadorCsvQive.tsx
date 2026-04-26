import { useEffect, useState } from "react";
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
import { aplicarRegras, useRegrasCategorizacao } from "@/hooks/useRegrasCategorizacao";
import {
  importarNFs,
  verificarDuplicatas,
} from "@/lib/financeiro/import-handler";
import { buscarMatchPagamentos } from "@/lib/financeiro/match-pagamentos";
import type { NFParsed } from "@/lib/financeiro/types";
import type { CategoriaOption } from "@/components/financeiro/CategoriaCombobox";
import { PreviewNFsImport } from "./PreviewNFsImport";
import { useAutoSaveRascunho, restaurarRascunho } from "@/hooks/useAutoSaveRascunho";

interface Props {
  categorias: CategoriaOption[];
  onImported?: () => void;
}

export function ImportadorCsvQive({ categorias, onImported }: Props) {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<NFParsed[]>([]);
  const { data: regras } = useRegrasCategorizacao();

  // Auto-save no banco a cada mudança no preview (debounce 2s)
  const { clearRascunho, setRascunhoId } = useAutoSaveRascunho(preview, "csv_qive");

  // Restaurar rascunho ao montar
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const restaurado = await restaurarRascunho("csv_qive");
      if (cancelado || !restaurado) return;
      setPreview(restaurado.nfs);
      setRascunhoId(restaurado.id);
      toast.info(
        `${restaurado.nfs.length} NF${restaurado.nfs.length === 1 ? "" : "s"} restaurada${restaurado.nfs.length === 1 ? "" : "s"} da sessão anterior.`,
      );
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          nfs = nfs.map((n) => aplicarRegras(n, regras));
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
    setImporting(true);
    const selecionadas = preview.filter((n) => n._selecionada && !n._duplicata);
    const result = await importarNFs(selecionadas);
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
    </Card>
  );
}
