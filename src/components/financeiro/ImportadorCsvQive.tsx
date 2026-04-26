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
import { restaurarRascunho, useAutoSaveRascunho } from "@/hooks/useAutoSaveRascunho";

const STORAGE_KEY = "import_preview_nfs";
const STORAGE_TS_KEY = "import_preview_timestamp";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 min

interface Props {
  categorias: CategoriaOption[];
  onImported?: () => void;
}

export function ImportadorCsvQive({ categorias, onImported }: Props) {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreviewState] = useState<NFParsed[]>([]);
  const { data: regras } = useRegrasCategorizacao();

  // Auto-save no banco (proteção principal)
  const { clearRascunho, setRascunhoId } = useAutoSaveRascunho(preview, "csv_qive");

  // Mantém sessionStorage como fallback rápido
  function setPreview(nfs: NFParsed[]) {
    setPreviewState(nfs);
    try {
      if (nfs.length === 0) {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_TS_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nfs));
        sessionStorage.setItem(STORAGE_TS_KEY, Date.now().toString());
      }
    } catch {
      // sessionStorage cheio ou indisponível — segue sem persistência
    }
  }

  // Restaurar rascunho ao montar (banco primeiro, depois sessionStorage)
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const rascunho = await restaurarRascunho("csv_qive");
      if (cancelado) return;
      if (rascunho) {
        setRascunhoId(rascunho.id);
        setPreviewState(rascunho.nfs);
        toast.info(`📦 Rascunho restaurado: ${rascunho.nfs.length} NFs`, {
          description: "Você pode continuar de onde parou!",
          duration: 5000,
        });
        return;
      }
      // Fallback: sessionStorage
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        const ts = sessionStorage.getItem(STORAGE_TS_KEY);
        if (saved && ts) {
          const idade = Date.now() - parseInt(ts, 10);
          if (idade < MAX_AGE_MS) {
            const parsed = JSON.parse(saved) as NFParsed[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPreviewState(parsed);
              toast.info("Preview restaurado da sessão anterior");
            }
          } else {
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_TS_KEY);
          }
        }
      } catch {
        // ignore
      }
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
      await clearRascunho();
      setPreview([]);
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
