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

  // Salvar preview no sessionStorage sempre que mudar
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

  // Restaurar preview ao montar
  useEffect(() => {
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
          // Pré-selecionar todas as não-duplicadas
          nfs = nfs.map((n) => ({ ...n, _selecionada: !n._duplicata }));
          setPreview(nfs);
          toast.success(`${nfs.length} NFs lidas. Revise antes de importar.`);
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
    if (result.sucesso > 0) {
      toast.success(
        `${result.sucesso} NF${result.sucesso === 1 ? "" : "s"} importada${
          result.sucesso === 1 ? "" : "s"
        }${result.erros > 0 ? ` (${result.erros} com erro)` : ""}`
      );
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
