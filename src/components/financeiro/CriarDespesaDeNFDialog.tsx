import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Info } from "lucide-react";

export interface NFParaCriar {
  stageId: string;
  fornecedor: string;
  nfNumero: string | null;
  valor: number;
  dataEmissao: string | null;
  dataVencimento: string | null;
  parceiroId: string | null;
  categoriaId: string | null;
  descricao: string | null;
}

export interface BoletoFisico {
  id: string;
  valor: number | null;
  data_vencimento: string | null;
}

interface Props {
  open: boolean;
  nf: NFParaCriar;
  boletos?: BoletoFisico[];
  posicaoFila?: { atual: number; total: number };
  processando?: boolean;
  onConfirmar: (data: {
    formaPgtoId: string | null;
    cartaoId: string | null;
    parcelas: number;
    dataPrimeiraParcela: string;
  }) => Promise<void>;
  onPular: () => void;
}

interface FormaPgto {
  id: string;
  nome: string;
  codigo: string | null;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function valorDaParcela(total: number, qtdParcelas: number, indice: number): number {
  if (qtdParcelas <= 1) return total;
  const totalCentavos = Math.round(total * 100);
  const baseCentavos = Math.floor(totalCentavos / qtdParcelas);
  const restoCentavos = totalCentavos - baseCentavos * qtdParcelas;
  return (
    indice === qtdParcelas - 1 ? baseCentavos + restoCentavos : baseCentavos
  ) / 100;
}

export function CriarDespesaDeNFDialog({
  open,
  nf,
  boletos,
  posicaoFila,
  processando,
  onConfirmar,
  onPular,
}: Props) {
  const temBoletos = (boletos?.length ?? 0) > 0;
  const parcelasDefault = temBoletos ? boletos!.length : 1;

  const [formaPgtoId, setFormaPgtoId] = useState<string>("");
  const [cartaoId, setCartaoId] = useState<string>("");
  const [parcelas, setParcelas] = useState<number>(parcelasDefault);
  const [dataPrimeira, setDataPrimeira] = useState<string>(
    boletos?.[0]?.data_vencimento || nf.dataVencimento || nf.dataEmissao || "",
  );

  useEffect(() => {
    setFormaPgtoId("");
    setCartaoId("");
    setParcelas(parcelasDefault);
    setDataPrimeira(
      boletos?.[0]?.data_vencimento || nf.dataVencimento || nf.dataEmissao || "",
    );
  }, [nf.stageId, parcelasDefault, boletos, nf.dataVencimento, nf.dataEmissao]);

  const { data: formasPgto } = useQuery({
    queryKey: ["formas-pagamento"],
    enabled: open,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("formas_pagamento")
        .select("id,nome,codigo")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return (data || []) as FormaPgto[];
    },
  });

  const { data: cartoes } = useQuery({
    queryKey: ["cartoes-credito-ativos"],
    enabled: open,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("cartoes_credito")
        .select("id, nome, ultimos_digitos, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        nome: string;
        ultimos_digitos: string | null;
        ativo: boolean;
      }>;
    },
  });

  // Modelo 3D — detectar quando forma é cartão
  const formaSel = formasPgto?.find((f) => f.id === formaPgtoId);
  const codFormaPgto = formaSel?.codigo?.toLowerCase() || "";
  const exigeCartao =
    codFormaPgto === "cartao_credito" ||
    codFormaPgto === "cartao_debito" ||
    codFormaPgto.includes("cartao") ||
    codFormaPgto.includes("cartão");

  // Limpa cartão quando forma muda pra não-cartão
  useEffect(() => {
    if (!exigeCartao && cartaoId) setCartaoId("");
  }, [exigeCartao, cartaoId]);

  const valorParcelaPreview = useMemo(
    () => (parcelas > 0 ? valorDaParcela(nf.valor, parcelas, 0) : nf.valor),
    [nf.valor, parcelas],
  );

  async function handleConfirmar() {
    if (!dataPrimeira) return;
    if (exigeCartao && !cartaoId) {
      alert("Cartão é obrigatório quando forma de pagamento é Cartão");
      return;
    }
    await onConfirmar({
      formaPgtoId: formaPgtoId || null,
      cartaoId: cartaoId || null,
      parcelas,
      dataPrimeiraParcela: dataPrimeira,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !processando) onPular();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Criar despesa
            {posicaoFila && posicaoFila.total > 1 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({posicaoFila.atual} de {posicaoFila.total})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Confirme os dados de pagamento desta NF para gerar a despesa.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo da NF */}
        <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fornecedor</span>
            <span className="font-medium">{nf.fornecedor}</span>
          </div>
          {nf.nfNumero && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número da NF</span>
              <span className="font-medium">{nf.nfNumero}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor total</span>
            <span className="font-medium">{formatBRL(nf.valor)}</span>
          </div>
          {nf.dataEmissao && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Emissão</span>
              <span className="font-medium">
                {new Date(nf.dataEmissao + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}
        </div>

        {temBoletos && (
          <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 p-3 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Esta NF tem {boletos!.length} boleto(s) físico(s). Parcelas
              pré-preenchidas com base nos vencimentos. Ajuste se necessário.
            </p>
          </div>
        )}

        {/* Campos */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <Select value={formaPgtoId} onValueChange={setFormaPgtoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {(formasPgto || []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {exigeCartao && (
            <div className="space-y-1.5">
              <Label>Cartão *</Label>
              <Select value={cartaoId || "_none"} onValueChange={(v) => setCartaoId(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Selecione —</SelectItem>
                  {cartoes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}{c.ultimos_digitos ? ` ····${c.ultimos_digitos}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!cartoes || cartoes.length === 0) && (
                <p className="text-[10px] text-muted-foreground">
                  Nenhum cartão ativo cadastrado.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Parcelas</Label>
              <Input
                type="number"
                min={1}
                value={parcelas}
                onChange={(e) =>
                  setParcelas(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data 1ª parcela</Label>
              <Input
                type="date"
                value={dataPrimeira}
                onChange={(e) => setDataPrimeira(e.target.value)}
              />
            </div>
          </div>

          {parcelas > 1 && nf.valor > 0 && (
            <p className="text-sm text-muted-foreground">
              {parcelas}× de {formatBRL(valorParcelaPreview)} mensais
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onPular} disabled={processando}>
            Pular
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={processando || !dataPrimeira || parcelas < 1}
          >
            {processando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              "Criar despesa"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
