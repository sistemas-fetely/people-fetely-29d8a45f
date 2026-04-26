import { useState } from "react";
import { Receipt, Loader2 } from "lucide-react";
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
  aplicarRegras,
  useRegrasCategorizacao,
} from "@/hooks/useRegrasCategorizacao";
import {
  importarNFs,
  verificarDuplicatas,
} from "@/lib/financeiro/import-handler";
import { buscarMatchPagamentos } from "@/lib/financeiro/match-pagamentos";
import { parseValorBR } from "@/lib/financeiro/parsers";
import type { NFParsed } from "@/lib/financeiro/types";
import type { CategoriaOption } from "@/components/financeiro/CategoriaCombobox";
import { PreviewNFsImport } from "./PreviewNFsImport";

interface Props {
  categorias: CategoriaOption[];
  onImported?: () => void;
}

export function ImportadorPdfInvoice({ categorias, onImported }: Props) {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<NFParsed[]>([]);
  const { data: regras } = useRegrasCategorizacao();

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setParsing(true);
    const novas: NFParsed[] = [];

    try {
      for (const f of files) {
        try {
          toast.info(`Processando ${f.name} com IA...`);
          const formData = new FormData();
          formData.append("file", f);
          const { data, error } = await supabase.functions.invoke(
            "parse-pdf-invoice",
            { body: formData },
          );
          if (error) throw error;
          const payload = (data?.data || data || {}) as Record<string, any>;
          if (!payload || (!payload.vendor && !payload.invoice_number)) {
            toast.warning(`${f.name}: sem dados extraídos`);
            continue;
          }

          const valor = parseValorBR(payload.amount);
          // Normaliza data (espera YYYY-MM-DD)
          let dataEmissao: string | null = null;
          if (typeof payload.date === "string") {
            const m = payload.date.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) dataEmissao = `${m[1]}-${m[2]}-${m[3]}`;
          }

          const descricao = payload.description || "Serviço Internacional";
          const moeda = payload.currency && payload.currency !== "BRL"
            ? ` (${payload.currency})`
            : "";

          const nf: NFParsed = {
            nf_numero: String(payload.invoice_number || f.name),
            nf_data_emissao: dataEmissao,
            nf_natureza_operacao: descricao + moeda,
            fornecedor_nome: payload.vendor || "Fornecedor Internacional",
            fornecedor_cnpj: "",
            valor,
            nf_valor_produtos: valor,
            meio_pagamento: payload.payment_method || "Cartão Crédito",
            _source: "pdf_invoice",
          };
          novas.push(aplicarRegras(nf, regras));
        } catch (err: any) {
          toast.error(`${f.name}: ${err.message || err}`);
        }
      }

      if (novas.length > 0) {
        let processadas = await verificarDuplicatas(novas);
        processadas = await buscarMatchPagamentos(processadas);
        processadas = processadas.map((n) => ({
          ...n,
          _selecionada: !n._duplicata,
        }));
        setPreview((prev) => [...prev, ...processadas]);
        toast.success(
          `${novas.length} invoice${novas.length > 1 ? "s" : ""} processada${novas.length > 1 ? "s" : ""}.`,
        );
      }
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
          <Receipt className="h-5 w-5 text-admin" />
          PDF Invoice / Receipt (internacional)
        </CardTitle>
        <CardDescription>
          Para invoices SEM NF brasileira (Lovable, Anthropic, OpenAI, AWS, SaaS).
          Extração via IA — pode levar alguns segundos por arquivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm">
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Receipt className="h-4 w-4" />
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
    </Card>
  );
}
