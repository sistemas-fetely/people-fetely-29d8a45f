import { useState } from "react";
import { FileCode, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { parseNFeXml } from "@/lib/financeiro/xml-nfe-parser";
import { aplicarRegras, useRegrasCategorizacao } from "@/hooks/useRegrasCategorizacao";
import {
  importarNFs,
  verificarDuplicatas,
} from "@/lib/financeiro/import-handler";
import { buscarMatchPagamentos } from "@/lib/financeiro/match-pagamentos";
import type { NFParsed } from "@/lib/financeiro/types";
import type { CategoriaOption } from "@/components/financeiro/CategoriaCombobox";
import { PreviewNFsImport } from "./PreviewNFsImport";

interface Props {
  categorias: CategoriaOption[];
  onImported?: () => void;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function ImportadorXmlNFe({ categorias, onImported }: Props) {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<NFParsed[]>([]);
  const { data: regras } = useRegrasCategorizacao();

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setParsing(true);
    try {
      const parsed: NFParsed[] = [];
      for (const f of files) {
        try {
          const xml = await readFileAsText(f);
          const nf = parseNFeXml(xml);
          if (nf) parsed.push(nf);
          else toast.warning(`Não foi possível ler ${f.name}`);
        } catch {
          toast.warning(`Erro lendo ${f.name}`);
        }
      }
      let nfs = parsed.map((n) => aplicarRegras(n, regras));
      nfs = await verificarDuplicatas(nfs);
      nfs = await buscarMatchPagamentos(nfs);
      nfs = nfs.map((n) => ({ ...n, _selecionada: !n._duplicata }));
      setPreview((prev) => [...prev, ...nfs]);
      if (nfs.length > 0) {
        toast.success(`${nfs.length} NF${nfs.length === 1 ? "" : "s"} processada${nfs.length === 1 ? "" : "s"}`);
      }
    } finally {
      setParsing(false);
      e.target.value = "";
    }
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
          <FileCode className="h-5 w-5 text-admin" />
          XML NF-e
        </CardTitle>
        <CardDescription>
          Upload de um ou vários XMLs de NF-e (v4.00). Extração 100% automática no navegador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm">
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileCode className="h-4 w-4" />
            )}
            Selecionar XML(s)
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              multiple
              className="hidden"
              onChange={handleFiles}
              disabled={parsing || importing}
            />
          </label>
          <span className="text-xs text-muted-foreground">Múltiplos arquivos suportados</span>
        </div>

        <PreviewNFsImport
          nfs={preview}
          categorias={categorias}
          onChange={setPreview}
          onImport={doImport}
          importing={importing}
        />
      </CardContent>
    </Card>
  );
}
