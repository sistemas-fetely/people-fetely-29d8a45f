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
import { Plus, ChevronsUpDown, Check, Paperclip } from "lucide-react";
import { NfStageVinculadaCard } from "@/components/financeiro/NfStageVinculadaCard";
import { NfStageBuscadorModal } from "@/components/financeiro/NfStageBuscadorModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CategoriaCombobox,
  CategoriaOption,
} from "@/components/financeiro/CategoriaCombobox";
import { ParceiroFormSheet, Parceiro } from "@/components/financeiro/ParceiroFormSheet";
import { CategoriaFormDialog } from "@/components/financeiro/CategoriaFormDialog";
import { formatBRL } from "@/lib/format-currency";

type FormaPgto = { id: string; nome: string; codigo: string };
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
  const [valor, setValor] = useState("");
  const [dataVenc, setDataVenc] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [centroCusto, setCentroCusto] = useState("");
  const [unidade, setUnidade] = useState("matriz_sp");
  const [formaPgtoId, setFormaPgtoId] = useState<string>("");
  const [parcelas, setParcelas] = useState(1);

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

  const { data: formasPgto } = useQuery({
    queryKey: ["formas-pagamento"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .select("id,nome,codigo")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as FormaPgto[];
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
      setValor("");
      setDataVenc("");
      setDataEmissao("");
      setCategoriaId(null);
      setCentroCusto("");
      setUnidade("matriz_sp");
      setFormaPgtoId("");
      setParcelas(1);
    }
  }, [open]);

  const valorNum = Number(valor.replace(/\./g, "").replace(",", ".")) || 0;
  const valorParcela = parcelas > 0 ? valorNum / parcelas : valorNum;

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
          valor: valorParcela,
          data_vencimento: venc.toISOString().slice(0, 10),
          nf_data_emissao: dataEmissao || null,
          conta_id: categoriaId,
          parceiro_id: parceiroId,
          fornecedor_id: parceiroId,
          fornecedor_cliente: fornecedorNome,
          centro_custo: centroCusto || null,
          unidade,
          forma_pagamento_id: formaPgtoId || null,
          parcelas,
          parcela_atual: i + 1,
          parcela_grupo_id: grupoId,
          status: "aberto",
          origem: "manual",
        });
      }
      const { error } = await supabase.from("contas_pagar_receber").insert(rows);
      if (error) throw error;
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
              <Label>Observação</Label>
              <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Valor *</Label>
                <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={dataVenc} onChange={(e) => setDataVenc(e.target.value)} />
              </div>
              <div>
                <Label>Emissão</Label>
                <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
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
                  <Label>Forma de pagamento</Label>
                  <Select value={formaPgtoId || "_none"} onValueChange={(v) => setFormaPgtoId(v === "_none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">—</SelectItem>
                      {(formasPgto || []).map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
