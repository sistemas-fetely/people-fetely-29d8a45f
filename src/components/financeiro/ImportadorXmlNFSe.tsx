import { useState } from "react";
import { FileCode2, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { parseNFSeXml } from "@/lib/financeiro/xml-nfse-parser";
import {
  aplicarRegras,
  useRegrasCategorizacao,
} from "@/hooks/useRegrasCategorizacao";
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

export function ImportadorXmlNFSe({ categorias, onImported }: Props) {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<NFParsed[]>([]);
  const { data: regras } = useRegrasCategorizacao();

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setParsing(true);
    const nfs: NFParsed[] = [];

    try {
      for (const file of files) {
        const texto = await file.text();
        try {
          const nf = parseNFSeXml(texto);
          if (nf) {
            nfs.push(aplicarRegras(nf, regras));
          }
        } catch (err: any) {
          toast.error(`${file.name}: ${err.message}`);
        }
      }

      if (nfs.length > 0) {
        let processadas = await verificarDuplicatas(nfs);
        processadas = await buscarMatchPagamentos(processadas);
        processadas = processadas.map((n) => ({
          ...n,
          _selecionada: !n._duplicata,
        }));
        setPreview((prev) => [...prev, ...processadas]);
        toast.success(
          `${nfs.length} NFS-e lida${nfs.length > 1 ? "s" : ""}. Revise antes de importar.`,
        );
      }
    } catch (err: any) {
      toast.error("Erro ao processar XMLs: " + (err.message || err));
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  async function doImport() {
    setImporting(true);
    const selecionadas = preview.filter(
      (n) => n._selecionada && !n._duplicata,
    );
    const result = await importarNFs(selecionadas);
    setImporting(false);

    if (result.sucesso > 0 || result.vinculadas > 0) {
      const partes: string[] = [];
      if (result.sucesso > 0)
        partes.push(`${result.sucesso} nova${result.sucesso === 1 ? "" : "s"}`);
      if (result.vinculadas > 0)
        partes.push(
          `${result.vinculadas} vinculada${result.vinculadas === 1 ? "" : "s"}`,
        );
      if (result.erros > 0)
        partes.push(`${result.erros} erro${result.erros === 1 ? "" : "s"}`);
      toast.success(`Importação: ${partes.join(", ")}`);
      setPreview([]);
      onImported?.();
    } else if (result.erros > 0) {
      toast.error(`${result.erros} erros ao importar`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileCode2 className="h-5 w-5 text-admin" />
          XML NFS-e
        </CardTitle>
        <CardDescription>
          Upload de um ou vários XMLs de NFS-e (Solides e outros — padrão ABRASF).
          Extração 100% automática no navegador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm">
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileCode2 className="h-4 w-4" />
            )}
            Selecionar XML(s)
            <input
              type="file"
              accept=".xml,application/xml,text/xml"
              multiple
              className="hidden"
              onChange={handleFiles}
              disabled={parsing || importing}
            />
          </label>
          <span className="text-xs text-muted-foreground">
            Múltiplos arquivos suportados
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
    </Card>
  );
}
