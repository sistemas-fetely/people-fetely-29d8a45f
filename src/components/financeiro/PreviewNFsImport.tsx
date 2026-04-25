import { useMemo, useState } from "react";
import { Loader2, Download, AlertTriangle, X } from "lucide-react";
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
import { CategoriaCombobox, type CategoriaOption } from "@/components/financeiro/CategoriaCombobox";
import { CriarRegraDialog } from "@/components/financeiro/CriarRegraDialog";
import type { NFParsed } from "@/lib/financeiro/types";

interface Props {
  nfs: NFParsed[];
  categorias: CategoriaOption[];
  onChange: (nfs: NFParsed[]) => void;
  onImport: () => void | Promise<void>;
  onClear?: () => void;
  importing: boolean;
}

export function PreviewNFsImport({
  nfs,
  categorias,
  onChange,
  onImport,
  onClear,
  importing,
}: Props) {
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [regraNF, setRegraNF] = useState<NFParsed | null>(null);
  const [regraCategoriaId, setRegraCategoriaId] = useState<string | null>(null);
  const [regraCategoriaNome, setRegraCategoriaNome] = useState<string | null>(null);

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

  function setCategoria(idx: number, categoriaId: string | null) {
    const opt = categoriaId ? categorias.find((c) => c.id === categoriaId) || null : null;
    const nfAnterior = nfs[idx];
    const mudouManualmente =
      categoriaId && categoriaId !== nfAnterior._categoria_id;
    onChange(
      nfs.map((n, i) =>
        i === idx
          ? {
              ...n,
              _categoria_id: categoriaId,
              _categoria_nome: opt ? `${opt.codigo} — ${opt.nome}` : null,
              _regra_origem: null, // foi manual
            }
          : n
      )
    );
    // Após seleção manual, oferecer criar regra automática
    if (mudouManualmente && opt && (nfAnterior.fornecedor_cnpj || nfAnterior.nf_ncm)) {
      setRegraNF(nfAnterior);
      setRegraCategoriaId(categoriaId);
      setRegraCategoriaNome(`${opt.codigo} — ${opt.nome}`);
    }
  }

  if (nfs.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="outline">{nfs.length} NFs</Badge>
        {totals.dup > 0 && (
          <Badge variant="secondary">
            {totals.dup} duplicadas (já existem)
          </Badge>
        )}
        {totals.semCat > 0 && (
          <Badge variant="outline" className="gap-1 border-warning text-warning">
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
                    ? "bg-muted/40"
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
                        options={categorias}
                        value={nf._categoria_id || null}
                        onChange={(id) => setCategoria(i, id)}
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
                    <Badge variant="outline" className="border-warning text-warning">
                      Sem categoria
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-success text-success">
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
        <div className="flex items-center gap-2">
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={importing}
              className="gap-1 text-muted-foreground"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
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

      <CriarRegraDialog
        open={!!regraNF}
        onOpenChange={(v) => {
          if (!v) {
            setRegraNF(null);
            setRegraCategoriaId(null);
            setRegraCategoriaNome(null);
          }
        }}
        nf={regraNF}
        categoriaId={regraCategoriaId}
        categoriaNome={regraCategoriaNome}
        centroCusto={regraNF?._centro_custo || null}
        allNfs={nfs}
        onUpdateAllNfs={onChange}
      />
    </div>
  );
}
