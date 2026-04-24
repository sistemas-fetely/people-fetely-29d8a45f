import { useMemo, useState } from "react";
import { Loader2, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoriaCombobox } from "@/components/financeiro/CategoriaCombobox";
import type { NFParsed } from "@/lib/financeiro/types";

interface Props {
  nfs: NFParsed[];
  onChange: (nfs: NFParsed[]) => void;
  onImport: () => void | Promise<void>;
  importing: boolean;
}

export function PreviewNFsImport({ nfs, onChange, onImport, importing }: Props) {
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);

  const visibleIdx = useMemo(() => {
    return nfs
      .map((nf, i) => ({ nf, i }))
      .filter(({ nf }) => (showOnlyMissing ? !nf._categoria_id : true));
  }, [nfs, showOnlyMissing]);

  const totals = useMemo(() => {
    const semCat = nfs.filter((n) => !n._categoria_id && !n._duplicata).length;
    const dup = nfs.filter((n) => n._duplicata).length;
    const sel = nfs.filter((n) => n._selecionada && !n._duplicata).length;
    return { semCat, dup, sel };
  }, [nfs]);

  const allSelectableSelected =
    nfs.filter((n) => !n._duplicata).length > 0 &&
    nfs.filter((n) => !n._duplicata).every((n) => n._selecionada);

  function toggleAll() {
    const next = !allSelectableSelected;
    onChange(nfs.map((n) => (n._duplicata ? n : { ...n, _selecionada: next })));
  }

  function toggleOne(idx: number) {
    onChange(
      nfs.map((n, i) =>
        i === idx ? { ...n, _selecionada: !n._selecionada } : n
      )
    );
  }

  function setCategoria(idx: number, categoriaId: string | null, label: string | null) {
    onChange(
      nfs.map((n, i) =>
        i === idx
          ? { ...n, _categoria_id: categoriaId, _categoria_nome: label }
          : n
      )
    );
  }

  if (nfs.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="outline">{nfs.length} NFs</Badge>
        {totals.dup > 0 && (
          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
            {totals.dup} duplicadas (já existem)
          </Badge>
        )}
        {totals.semCat > 0 && (
          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
            <AlertTriangle className="h-3 w-3" />
            {totals.semCat} sem categoria
          </Badge>
        )}
        <button
          type="button"
          className="text-xs underline text-muted-foreground hover:text-foreground"
          onClick={() => setShowOnlyMissing((v) => !v)}
        >
          {showOnlyMissing ? "Ver todas" : "Ver só sem categoria"}
        </button>
      </div>

      <div className="border rounded-md max-h-[480px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={allSelectableSelected}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>NF</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="min-w-[260px]">Categoria</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleIdx.map(({ nf, i }) => (
              <TableRow
                key={`${nf.nf_chave_acesso || nf.nf_numero}-${i}`}
                className={
                  nf._duplicata
                    ? "opacity-50"
                    : !nf._categoria_id
                    ? "bg-amber-50/40"
                    : ""
                }
              >
                <TableCell>
                  <Checkbox
                    checked={!!nf._selecionada}
                    disabled={nf._duplicata}
                    onCheckedChange={() => toggleOne(i)}
                  />
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{nf.fornecedor_nome}</div>
                  {nf.fornecedor_cnpj && (
                    <div className="text-xs text-muted-foreground font-mono">
                      {nf.fornecedor_cnpj}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  <div>{nf.nf_numero || "—"}</div>
                  {nf.nf_serie && (
                    <div className="text-muted-foreground">Série {nf.nf_serie}</div>
                  )}
                </TableCell>
                <TableCell className="text-xs">{nf.nf_data_emissao || "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {nf.valor.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 min-w-0">
                      <CategoriaCombobox
                        value={nf._categoria_id || null}
                        onChange={(id, opt) =>
                          setCategoria(
                            i,
                            id,
                            opt ? `${opt.codigo} — ${opt.nome}` : null
                          )
                        }
                        placeholder="Definir conta"
                      />
                    </div>
                    {nf._regra_origem && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {nf._regra_origem === "parceiro"
                          ? "por parceiro"
                          : nf._regra_origem === "ncm"
                          ? "por NCM"
                          : "por texto"}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {nf._duplicata ? (
                    <Badge variant="secondary">Duplicada</Badge>
                  ) : !nf._categoria_id ? (
                    <Badge
                      variant="outline"
                      className="text-amber-700 border-amber-300"
                    >
                      Sem categoria
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-emerald-700 border-emerald-300"
                    >
                      Pronta
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totals.sel} selecionada{totals.sel === 1 ? "" : "s"} para importar
        </p>
        <Button
          onClick={onImport}
          disabled={importing || totals.sel === 0}
          className="bg-admin hover:bg-admin/90 text-admin-foreground gap-2"
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Importar selecionadas
        </Button>
      </div>
    </div>
  );
}
