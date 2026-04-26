import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Check, ChevronsUpDown, ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCriarConta,
  useEditarConta,
  useFornecedores,
  useUnidades,
  CENTROS_CUSTO,
  type ContaPagarComRelacionados,
} from "@/hooks/useContasPagar";
import { useCategoriasPlano } from "@/hooks/useCategoriasPlano";
import { CategoriaCombobox } from "@/components/financeiro/CategoriaCombobox";
import { FORMAS_PAGAMENTO } from "@/lib/financeiro/formas-pagamento";

interface NovaContaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta?: ContaPagarComRelacionados | null; // se enviado: modo edição
}

interface FormState {
  parceiro_id: string | null;
  fornecedor: string;
  descricao: string;
  valor: number;
  data_emissao: string;
  vencimento: string;
  parcelas: number;
  categoria_id: string | null;
  centro_custo: string;
  unidade: string;
  forma_pagamento: string;
  nf_numero: string;
  nf_serie: string;
  nf_chave: string;
  nf_arquivo: File | null;
  observacoes: string;
}

const INITIAL_STATE: FormState = {
  parceiro_id: null,
  fornecedor: "",
  descricao: "",
  valor: 0,
  data_emissao: "",
  vencimento: "",
  parcelas: 1,
  categoria_id: null,
  centro_custo: "",
  unidade: "",
  forma_pagamento: "",
  nf_numero: "",
  nf_serie: "",
  nf_chave: "",
  nf_arquivo: null,
  observacoes: "",
};

function contaToFormState(conta: ContaPagarComRelacionados): FormState {
  return {
    parceiro_id: conta.parceiro_id ?? null,
    fornecedor: conta.fornecedor ?? "",
    descricao: conta.descricao ?? "",
    valor: Number(conta.valor) || 0,
    data_emissao: conta.data_emissao ?? "",
    vencimento: conta.vencimento ?? "",
    parcelas: conta.parcelas ?? 1,
    categoria_id: conta.categoria_id ?? null,
    centro_custo: conta.centro_custo ?? "",
    unidade: conta.unidade ?? "",
    forma_pagamento: conta.forma_pagamento ?? "",
    nf_numero: conta.nf_numero ?? "",
    nf_serie: conta.nf_serie ?? "",
    nf_chave: conta.nf_chave ?? "",
    nf_arquivo: null,
    observacoes: conta.observacoes ?? "",
  };
}

export function NovaContaSheet({ open, onOpenChange, conta }: NovaContaSheetProps) {
  const isEdit = !!conta;
  const criarConta = useCriarConta();
  const editarConta = useEditarConta();
  const { data: fornecedores = [] } = useFornecedores();
  const { data: categorias = [] } = useCategoriasPlano();
  const { data: unidades = [] } = useUnidades();
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [parceiroOpen, setParceiroOpen] = useState(false);
  const [nfOpen, setNfOpen] = useState(false);

  // Hidrata form ao abrir em modo edição (ou reseta ao criar)
  useEffect(() => {
    if (!open) return;
    if (conta) {
      setFormData(contaToFormState(conta));
      // abre seção NF se já existem dados
      setNfOpen(!!(conta.nf_numero || conta.nf_serie || conta.nf_chave || conta.nf_path));
    } else {
      setFormData(INITIAL_STATE);
      setNfOpen(false);
    }
  }, [open, conta]);

  const parceiroSelecionado = fornecedores.find((f) => f.id === formData.parceiro_id);
  const isPending = criarConta.isPending || editarConta.isPending;

  const handleSelectParceiro = (id: string) => {
    const fornecedor = fornecedores.find((f) => f.id === id);
    if (!fornecedor) return;
    setFormData((prev) => ({
      ...prev,
      parceiro_id: id,
      fornecedor: fornecedor.razao_social,
      categoria_id: prev.categoria_id || fornecedor.categoria_padrao_id,
      centro_custo: prev.centro_custo || fornecedor.centro_custo_padrao || "",
    }));
    setParceiroOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, nf_arquivo: f }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      parceiro_id: formData.parceiro_id,
      fornecedor: formData.fornecedor,
      descricao: formData.descricao,
      valor: formData.valor,
      data_emissao: formData.data_emissao || null,
      vencimento: formData.vencimento,
      parcelas: formData.parcelas || 1,
      categoria_id: formData.categoria_id,
      centro_custo: formData.centro_custo || null,
      unidade: formData.unidade || null,
      forma_pagamento: formData.forma_pagamento || null,
      nf_numero: formData.nf_numero || null,
      nf_serie: formData.nf_serie || null,
      nf_chave: formData.nf_chave || null,
      nf_arquivo: formData.nf_arquivo,
      observacoes: formData.observacoes || null,
    };

    try {
      if (isEdit && conta) {
        await editarConta.mutateAsync({ contaId: conta.id, dados: payload });
      } else {
        await criarConta.mutateAsync(payload);
      }
      setFormData(INITIAL_STATE);
      setNfOpen(false);
      onOpenChange(false);
    } catch {
      // erro tratado no hook
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Atualize os dados da conta selecionada."
              : "Cadastre uma nova conta. Ela será criada como rascunho."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Parceiro / Fornecedor *</Label>
            <Popover open={parceiroOpen} onOpenChange={setParceiroOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={parceiroOpen}
                  className="w-full justify-between font-normal"
                >
                  {parceiroSelecionado ? (
                    <span className="truncate">
                      {parceiroSelecionado.razao_social}
                      {parceiroSelecionado.nome_fantasia && (
                        <span className="text-muted-foreground ml-2">
                          ({parceiroSelecionado.nome_fantasia})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Buscar fornecedor...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por razão social, fantasia ou CNPJ..." />
                  <CommandList>
                    <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                    <CommandGroup>
                      {fornecedores.map((f) => (
                        <CommandItem
                          key={f.id}
                          value={`${f.razao_social} ${f.nome_fantasia ?? ""} ${f.cnpj ?? ""}`}
                          onSelect={() => handleSelectParceiro(f.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.parceiro_id === f.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex-1 truncate">
                            <div className="truncate">{f.razao_social}</div>
                            {f.nome_fantasia && (
                              <div className="text-xs text-muted-foreground truncate">
                                {f.nome_fantasia}
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição da conta"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor || ""}
                onChange={(e) =>
                  setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })
                }
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_emissao">Data Emissão *</Label>
              <Input
                id="data_emissao"
                type="date"
                value={formData.data_emissao}
                onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Vencimento sozinho na linha */}
          <div className="space-y-2">
            <Label htmlFor="vencimento">Vencimento *</Label>
            <Input
              id="vencimento"
              type="date"
              value={formData.vencimento}
              onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <CategoriaCombobox
              options={categorias}
              value={formData.categoria_id}
              onChange={(id) => setFormData({ ...formData, categoria_id: id })}
              placeholder="Selecione uma categoria"
              allowNull
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              {/* TODO: migrar para dimensão administrável em Parâmetros > Financeiro */}
              <Select
                value={formData.centro_custo}
                onValueChange={(v) => setFormData({ ...formData, centro_custo: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CENTROS_CUSTO.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select
                value={formData.unidade}
                onValueChange={(v) => setFormData({ ...formData, unidade: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES_CONTA.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Forma de Pagamento + Parcelas lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((fp) => (
                    <SelectItem key={fp} value={fp}>
                      {fp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parcelas">Parcelas</Label>
              <Input
                id="parcelas"
                type="number"
                min="1"
                value={formData.parcelas}
                onChange={(e) =>
                  setFormData({ ...formData, parcelas: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          <Collapsible open={nfOpen} onOpenChange={setNfOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  NF ou Recibo (opcional)
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", nfOpen && "rotate-180")}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4 px-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nf_numero">Número da NF ou Recibo</Label>
                  <Input
                    id="nf_numero"
                    value={formData.nf_numero}
                    onChange={(e) => setFormData({ ...formData, nf_numero: e.target.value })}
                    placeholder="000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nf_serie">Série da NF ou Recibo</Label>
                  <Input
                    id="nf_serie"
                    value={formData.nf_serie}
                    onChange={(e) => setFormData({ ...formData, nf_serie: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nf_chave">Chave de Acesso da NF</Label>
                <Input
                  id="nf_chave"
                  value={formData.nf_chave}
                  onChange={(e) => setFormData({ ...formData, nf_chave: e.target.value })}
                  placeholder="44 dígitos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nf_arquivo">Arquivo da NF ou Recibo (PDF, JPG ou PNG)</Label>
                <Input
                  id="nf_arquivo"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/jpg"
                  onChange={handleFileChange}
                />
                {formData.nf_arquivo && (
                  <p className="text-xs text-muted-foreground">
                    Selecionado: {formData.nf_arquivo.name} (
                    {(formData.nf_arquivo.size / 1024).toFixed(0)} KB)
                  </p>
                )}
                {isEdit && conta?.nf_nome && !formData.nf_arquivo && (
                  <p className="text-xs text-muted-foreground">
                    Arquivo atual: {conta.nf_nome}
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais (opcional)"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Salvando..."
                  : "Criando..."
                : isEdit
                  ? "Salvar Alterações"
                  : "Criar Conta"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
