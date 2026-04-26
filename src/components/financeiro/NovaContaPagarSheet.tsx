import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, ChevronsUpDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CategoriaCombobox,
  CategoriaOption,
} from "@/components/financeiro/CategoriaCombobox";
import { ParceiroFormSheet, Parceiro } from "@/components/financeiro/ParceiroFormSheet";
import { CategoriaFormDialog } from "@/components/financeiro/CategoriaFormDialog";
import { formatBRL } from "@/lib/format-currency";

const CENTROS = ["comercial", "administrativo", "rh", "ti", "fiscal", "financeiro", "fabrica", "geral"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NovaContaPagarSheet({ open, onOpenChange }: Props) {
  const qc = useQueryClient();

  const [parceiroId, setParceiroId] = useState<string | null>(null);
  const [parceiroOpen, setParceiroOpen] = useState(false);
  const [parceiroFormOpen, setParceiroFormOpen] = useState(false);
  const [categoriaFormOpen, setCategoriaFormOpen] = useState(false);

  const [descricao, setDescricao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [obsFinanceiro, setObsFinanceiro] = useState("");
  const [valor, setValor] = useState("");
  const [dataVenc, setDataVenc] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [centroCusto, setCentroCusto] = useState("");
  const [unidade, setUnidade] = useState("matriz_sp");
  const [parcelas, setParcelas] = useState(1);

  // NF
  const [nfNumero, setNfNumero] = useState("");
  const [nfSerie, setNfSerie] = useState("");
  const [nfChave, setNfChave] = useState("");

  // Itens (multi)
  type ItemForm = {
    id: string;
    descricao: string;
    ncm: string;
    quantidade: string;
    valorUnitario: string;
    categoriaId: string | null;
  };
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [mostrarItens, setMostrarItens] = useState(false);

  // Uploads
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [reciboFile, setReciboFile] = useState<File | null>(null);

  const { data: parceiros } = useQuery({
    queryKey: ["parceiros-fornecedores"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parceiros_comerciais")
        .select("id,razao_social,nome_fantasia,cnpj,categoria_padrao_id,centro_custo_padrao,tipos,tipo,cpf,cep,logradouro,numero,bairro,cidade,uf,telefone,email,canal,segmento,tags,ativo,observacao,origem")
        .contains("tipos", ["fornecedor"])
        .eq("ativo", true)
        .order("razao_social");
      if (error) throw error;
      return data as Parceiro[];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["plano-contas-flat"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_contas")
        .select("id,codigo,nome,nivel,parent_id")
        .eq("ativo", true)
        .order("codigo");
      if (error) throw error;
      return data as CategoriaOption[];
    },
  });

  // Auto preenche categoria/centro se parceiro tem padrão
  useEffect(() => {
    if (!parceiroId || !parceiros) return;
    const p = parceiros.find((x) => x.id === parceiroId);
    if (!p) return;
    if (p.categoria_padrao_id && !categoriaId) setCategoriaId(p.categoria_padrao_id);
    if (p.centro_custo_padrao && !centroCusto) setCentroCusto(p.centro_custo_padrao);
  }, [parceiroId, parceiros]); // eslint-disable-line

  useEffect(() => {
    if (!open) {
      setParceiroId(null);
      setDescricao("");
      setObservacao("");
      setObsFinanceiro("");
      setValor("");
      setDataVenc("");
      setDataEmissao("");
      setCategoriaId(null);
      setCentroCusto("");
      setUnidade("matriz_sp");
      setParcelas(1);
      setNfNumero("");
      setNfSerie("");
      setNfChave("");
      setItens([]);
      setMostrarItens(false);
      setNfFile(null);
      setReciboFile(null);
    }
  }, [open]);

  const valorNum = Number(valor.replace(/\./g, "").replace(",", ".")) || 0;
  const valorParcela = parcelas > 0 ? valorNum / parcelas : valorNum;

  const handleNfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setNfFile(file);
  };

  const handleReciboUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setReciboFile(file);
  };

  async function uploadDoc(contaId: string, file: File, tipo: string, userId: string | null) {
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `cp/${contaId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("financeiro-docs").upload(path, file);
    if (upErr) throw upErr;
    const { error: insErr } = await supabase.from("contas_pagar_documentos").insert({
      conta_id: contaId,
      tipo,
      nome_arquivo: file.name,
      storage_path: path,
      tamanho_bytes: file.size,
      uploaded_por: userId,
    });
    if (insErr) throw insErr;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!descricao.trim()) throw new Error("Descrição é obrigatória");
      if (!valorNum || valorNum <= 0) throw new Error("Valor inválido");
      if (!dataVenc) throw new Error("Data de vencimento obrigatória");

      const parceiro = parceiros?.find((p) => p.id === parceiroId);
      const fornecedorNome = parceiro?.razao_social || null;
      const baseDate = new Date(dataVenc + "T00:00:00");
      const grupoId = parcelas > 1 ? crypto.randomUUID() : null;

      const rows = [];
      for (let i = 0; i < parcelas; i++) {
        const venc = new Date(baseDate);
        venc.setMonth(venc.getMonth() + i);
        rows.push({
          tipo: "pagar",
          descricao: parcelas > 1 ? `${descricao.trim()} (${i + 1}/${parcelas})` : descricao.trim(),
          observacao: observacao.trim() || null,
          observacao_pagamento: obsFinanceiro.trim() || null,
          valor: valorParcela,
          data_vencimento: venc.toISOString().slice(0, 10),
          conta_id: categoriaId,
          parceiro_id: parceiroId,
          fornecedor_id: parceiroId,
          fornecedor_cliente: fornecedorNome,
          centro_custo: centroCusto || null,
          unidade,
          parcelas,
          parcela_atual: i + 1,
          parcela_grupo_id: grupoId,
          status: "aberto",
          origem: "manual",
          nf_numero: nfNumero.trim() || null,
          nf_serie: nfSerie.trim() || null,
          nf_chave_acesso: nfChave.trim() || null,
          nf_data_emissao: dataEmissao || null,
        });
      }
      const { data: inserted, error } = await supabase
        .from("contas_pagar_receber")
        .insert(rows)
        .select("id");
      if (error) throw error;

      const firstId = inserted?.[0]?.id;
      if (firstId) {
        // Itens (somente na 1ª parcela)
        if (itens.length > 0) {
          const itensValidos = itens.filter((it) => it.descricao.trim());
          if (itensValidos.length > 0) {
            const itensPayload = itensValidos.map((it) => {
              const qtd = parseFloat(it.quantidade.replace(",", ".")) || 1;
              const vlrUnit =
                parseFloat(it.valorUnitario.replace(/\./g, "").replace(",", ".")) || 0;
              return {
                conta_id: firstId,
                descricao: it.descricao.trim(),
                ncm: it.ncm.trim() || null,
                quantidade: qtd,
                valor_unitario: vlrUnit,
                valor_total: qtd * vlrUnit,
                conta_plano_id: it.categoriaId || null,
              };
            });
            const { error: errItens } = await supabase
              .from("contas_pagar_itens")
              .insert(itensPayload);
            if (errItens) throw errItens;
          }
        }

        // Uploads
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id || null;
        if (nfFile) {
          try {
            await uploadDoc(firstId, nfFile, "nf", uid);
          } catch (e) {
            console.error("Erro upload NF:", e);
            toast.error("Conta criada, mas falhou upload da NF");
          }
        }
        if (reciboFile) {
          try {
            await uploadDoc(firstId, reciboFile, "comprovante", uid);
          } catch (e) {
            console.error("Erro upload recibo:", e);
            toast.error("Conta criada, mas falhou upload do recibo");
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(parcelas > 1 ? `${parcelas} parcelas registradas!` : "Conta registrada!");
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const parceiroSelected = parceiros?.find((p) => p.id === parceiroId);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nova conta a pagar</SheetTitle>
            <SheetDescription>Registre um novo compromisso financeiro.</SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-4">
            {/* Parceiro */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Parceiro / Fornecedor</Label>
                <button
                  type="button"
                  onClick={() => setParceiroFormOpen(true)}
                  className="text-xs text-admin hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Novo
                </button>
              </div>
              <Popover open={parceiroOpen} onOpenChange={setParceiroOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {parceiroSelected ? parceiroSelected.razao_social : (
                      <span className="text-muted-foreground">Selecione um parceiro</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nome ou CNPJ..." />
                    <CommandList>
                      <CommandEmpty>Nenhum parceiro encontrado.</CommandEmpty>
                      <CommandGroup>
                        {(parceiros || []).map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.razao_social} ${p.cnpj || ""}`}
                            onSelect={() => {
                              setParceiroId(p.id);
                              setParceiroOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", parceiroId === p.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex-1">
                              <div className="text-sm">{p.razao_social}</div>
                              {p.cnpj && <div className="text-xs text-muted-foreground font-mono">{p.cnpj}</div>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Descrição *</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div>
              <Label>Observação Interna</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={2}
                placeholder="Notas internas sobre este pagamento..."
              />
            </div>
            <div>
              <Label>Observação para o Financeiro</Label>
              <Textarea
                value={obsFinanceiro}
                onChange={(e) => setObsFinanceiro(e.target.value)}
                rows={2}
                placeholder="Ex: NF será encaminhada depois, aguardar confirmação de entrega, etc."
                className="border-warning/40 bg-warning/5"
              />
              <p className="text-xs text-warning mt-1">
                💡 Esta observação será vista pela equipe do financeiro
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor *</Label>
                <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={dataVenc} onChange={(e) => setDataVenc(e.target.value)} />
              </div>
            </div>

            {/* Dados da NF */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Dados da Nota Fiscal (opcional)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Número NF</Label>
                  <Input value={nfNumero} onChange={(e) => setNfNumero(e.target.value)} placeholder="123456" />
                </div>
                <div>
                  <Label>Série</Label>
                  <Input value={nfSerie} onChange={(e) => setNfSerie(e.target.value)} placeholder="1" />
                </div>
                <div>
                  <Label>Data Emissão</Label>
                  <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <Label>Chave de Acesso (44 dígitos)</Label>
                <Input
                  value={nfChave}
                  onChange={(e) => setNfChave(e.target.value)}
                  placeholder="00000000000000000000000000000000000000000000"
                  maxLength={44}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Itens da Conta (multi) */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Itens da Conta (opcional)</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!mostrarItens && itens.length === 0) {
                      // Abre e já adiciona o primeiro item
                      setItens([
                        {
                          id: crypto.randomUUID(),
                          descricao: "",
                          ncm: "",
                          quantidade: "1",
                          valorUnitario: "",
                          categoriaId: null,
                        },
                      ]);
                    }
                    setMostrarItens(!mostrarItens);
                  }}
                  className="text-xs"
                >
                  {mostrarItens ? "Ocultar" : "Adicionar"} itens
                </Button>
              </div>

              {mostrarItens && (
                <div className="space-y-3">
                  {itens.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded-lg bg-muted/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Item {idx + 1}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setItens(itens.filter((i) => i.id !== item.id))
                          }
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div>
                        <Label className="text-xs">Descrição *</Label>
                        <Input
                          value={item.descricao}
                          onChange={(e) =>
                            setItens(
                              itens.map((i) =>
                                i.id === item.id
                                  ? { ...i, descricao: e.target.value }
                                  : i
                              )
                            )
                          }
                          placeholder="Ex: Kit Teclado e Mouse sem fio"
                          className="h-8"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">NCM</Label>
                          <Input
                            value={item.ncm}
                            onChange={(e) =>
                              setItens(
                                itens.map((i) =>
                                  i.id === item.id
                                    ? { ...i, ncm: e.target.value }
                                    : i
                                )
                              )
                            }
                            placeholder="12345678"
                            maxLength={8}
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Qtd *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantidade}
                            onChange={(e) =>
                              setItens(
                                itens.map((i) =>
                                  i.id === item.id
                                    ? { ...i, quantidade: e.target.value }
                                    : i
                                )
                              )
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Vlr Unit *</Label>
                          <Input
                            value={item.valorUnitario}
                            onChange={(e) =>
                              setItens(
                                itens.map((i) =>
                                  i.id === item.id
                                    ? { ...i, valorUnitario: e.target.value }
                                    : i
                                )
                              )
                            }
                            placeholder="0,00"
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Categoria (opcional)</Label>
                        <CategoriaCombobox
                          options={categorias || []}
                          value={item.categoriaId}
                          onChange={(v) =>
                            setItens(
                              itens.map((i) =>
                                i.id === item.id ? { ...i, categoriaId: v } : i
                              )
                            )
                          }
                          placeholder="Categoria específica para este item"
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setItens([
                        ...itens,
                        {
                          id: crypto.randomUUID(),
                          descricao: "",
                          ncm: "",
                          quantidade: "1",
                          valorUnitario: "",
                          categoriaId: null,
                        },
                      ])
                    }
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>

                  {itens.length > 0 && (() => {
                    const totalItens = itens.reduce((acc, it) => {
                      const qtd = parseFloat(it.quantidade.replace(",", ".")) || 0;
                      const vu =
                        parseFloat(
                          it.valorUnitario.replace(/\./g, "").replace(",", ".")
                        ) || 0;
                      return acc + qtd * vu;
                    }, 0);
                    const diff = Math.abs(totalItens - valorNum) > 0.01;
                    return (
                      <div className="p-2 bg-muted/40 rounded border">
                        <p className="text-xs">
                          <strong>Total dos itens:</strong>{" "}
                          {formatBRL(totalItens)}
                        </p>
                        {diff && valorNum > 0 && (
                          <p className="text-xs text-warning mt-1">
                            ⚠️ Difere do valor total da conta (
                            {formatBRL(valorNum)})
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Documentos */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Documentos</p>
              <div className="space-y-3">
                <div>
                  <Label>Anexar NF (PDF/XML)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.xml"
                    onChange={handleNfUpload}
                    className="cursor-pointer"
                  />
                  {nfFile && (
                    <p className="text-xs text-muted-foreground mt-1">📄 {nfFile.name}</p>
                  )}
                </div>
                <div>
                  <Label>Anexar Recibo/Documento Adicional (PDF/imagem)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleReciboUpload}
                    className="cursor-pointer"
                  />
                  {reciboFile && (
                    <p className="text-xs text-muted-foreground mt-1">📎 {reciboFile.name}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Classificação</p>
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <Label>Categoria / Conta</Label>
                  <button
                    type="button"
                    onClick={() => setCategoriaFormOpen(true)}
                    className="text-xs text-admin hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Nova
                  </button>
                </div>
                <CategoriaCombobox
                  options={categorias || []}
                  value={categoriaId}
                  onChange={setCategoriaId}
                  placeholder="Selecione uma categoria"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Centro de custo</Label>
                  <Select value={centroCusto || "_none"} onValueChange={(v) => setCentroCusto(v === "_none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nenhum</SelectItem>
                      {CENTROS.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select value={unidade} onValueChange={setUnidade}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matriz_sp">Matriz SP</SelectItem>
                      <SelectItem value="joinville">Joinville</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Pagamento</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Parcelas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={36}
                    value={parcelas}
                    onChange={(e) => setParcelas(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>
              {parcelas > 1 && valorNum > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {parcelas}× de <strong>{formatBRL(valorParcela)}</strong> mensais
                </p>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ParceiroFormSheet
        open={parceiroFormOpen}
        onOpenChange={setParceiroFormOpen}
        categorias={categorias || []}
        onSaved={(id) => setParceiroId(id)}
      />
      <CategoriaFormDialog
        open={categoriaFormOpen}
        onOpenChange={setCategoriaFormOpen}
        options={categorias || []}
        onSaved={(id) => setCategoriaId(id)}
      />
    </>
  );
}
