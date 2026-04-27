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

  // Fila de auto-cadastro de parceiros
  const fila = useFilaAutoCadastroParceiro();
  const [aguardandoCadastro, setAguardandoCadastro] = useState(false);
  const [nfsParaImportar, setNfsParaImportar] = useState<NFParsed[] | null>(null);

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
          if (nf) {
            // Anexa o File pra ir pro stage também
            nf._arquivo = f;
            parsed.push(nf);
          } else {
            toast.warning(`Não foi possível ler ${f.name}`);
          }
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
    const selecionadas = preview.filter((n) => n._selecionada && !n._duplicata);
    if (selecionadas.length === 0) return;

    // Cadastro automático de parceiro acontece no Stage > Contas a Pagar
    await executarImportacao(selecionadas);
  }

  async function executarImportacao(nfs: NFParsed[]) {
    setImporting(true);
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

    if (fila.posicao + 1 >= fila.totalFila) {
      setAguardandoCadastro(false);
      executarImportacao(nfsAtualizadas);
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
