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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";
import { fetchCep } from "@/lib/viacep";
import { CategoriaCombobox, CategoriaOption } from "@/components/financeiro/CategoriaCombobox";

export type Parceiro = {
  id: string;
  cnpj: string | null;
  cpf: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  tipo: string | null;
  tipos: string[] | null;
  canal: string | null;
  segmento: string | null;
  categoria_padrao_id: string | null;
  centro_custo_padrao: string | null;
  tags: string[] | null;
  ativo: boolean | null;
  observacao: string | null;
  origem: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Parceiro | null;
  categorias: CategoriaOption[];
  onSaved?: (id: string) => void;
  /** Pré-preenche os campos ao abrir em modo criação. */
  prefill?: {
    razao_social?: string;
    cnpj?: string;
    nome_fantasia?: string;
  };
  /**
   * Quando true, desativa o botão Cancelar e exige completar campos críticos
   * (Razão Social, CNPJ, Nome Fantasia). Usado no auto-cadastro vindo de NF.
   */
  obrigatorio?: boolean;
}

const CENTROS = ["comercial", "administrativo", "rh", "ti", "fiscal", "financeiro", "fabrica", "geral"];

function maskCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
function maskCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

export function ParceiroFormSheet({ open, onOpenChange, editing, categorias, onSaved, prefill, obrigatorio }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editing;

  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>(["fornecedor"]);
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [canal, setCanal] = useState("");
  const [segmento, setSegmento] = useState("");
  const [categoriaPadrao, setCategoriaPadrao] = useState<string | null>(null);
  const [centroCusto, setCentroCusto] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [observacao, setObservacao] = useState("");
  const [duplicateWarn, setDuplicateWarn] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTiposSelecionados(editing.tipos?.length ? editing.tipos : ["fornecedor"]);
      setCnpj(editing.cnpj ? maskCnpj(editing.cnpj) : "");
      setRazaoSocial(editing.razao_social || "");
      setNomeFantasia(editing.nome_fantasia || "");
      setCep(editing.cep ? maskCep(editing.cep) : "");
      setLogradouro(editing.logradouro || "");
      setNumero(editing.numero || "");
      setBairro(editing.bairro || "");
      setCidade(editing.cidade || "");
      setUf(editing.uf || "");
      setTelefone(editing.telefone || "");
      setEmail(editing.email || "");
      setCanal(editing.canal || "");
      setSegmento(editing.segmento || "");
      setCategoriaPadrao(editing.categoria_padrao_id);
      setCentroCusto(editing.centro_custo_padrao || "");
      setTags(editing.tags || []);
      setObservacao(editing.observacao || "");
    } else {
      setTiposSelecionados(["fornecedor"]);
      setCnpj(prefill?.cnpj ? maskCnpj(prefill.cnpj) : "");
      setRazaoSocial(prefill?.razao_social || "");
      // Nome Fantasia: usa o valor explícito do prefill OU adota a razão social como default
      // (evita travar o fluxo de importação - usuário pode editar depois no cadastro)
      setNomeFantasia(prefill?.nome_fantasia || prefill?.razao_social || "");
      setCep("");
      setLogradouro("");
      setNumero("");
      setBairro("");
      setCidade("");
      setUf("");
      setTelefone("");
      setEmail("");
      setCanal("");
      setSegmento("");
      setCategoriaPadrao(null);
      setCentroCusto("");
      setTags([]);
      setObservacao("");
    }
    setDuplicateWarn(null);
    setTagInput("");
  }, [open, editing]);

  // Check duplicate CNPJ on blur
  const checkDuplicate = async () => {
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return;
    if (editing && editing.cnpj === clean) return;
    const { data } = await supabase
      .from("parceiros_comerciais")
      .select("id, razao_social")
      .eq("cnpj", clean)
      .maybeSingle();
    if (data) {
      setDuplicateWarn(`Já cadastrado: ${data.razao_social}`);
    } else {
      setDuplicateWarn(null);
    }
  };

  // ViaCEP autocomplete
  const handleCepBlur = async () => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    const result = await fetchCep(clean);
    if (result) {
      setLogradouro(result.logradouro);
      setBairro(result.bairro);
      setCidade(result.localidade);
      setUf(result.uf);
    }
  };

  const toggleTipo = (tipo: string) => {
    setTiposSelecionados((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!razaoSocial.trim()) throw new Error("Razão social é obrigatória");
      if (tiposSelecionados.length === 0) throw new Error("Selecione ao menos um tipo");
      // Validações reforçadas em modo auto-cadastro
      if (obrigatorio) {
        if (!cnpj.replace(/\D/g, "")) throw new Error("CNPJ é obrigatório");
        if (cnpj.replace(/\D/g, "").length !== 14) throw new Error("CNPJ inválido (14 dígitos)");
        if (!nomeFantasia.trim()) throw new Error("Nome fantasia é obrigatório");
      }
      const payload = {
        tipos: tiposSelecionados,
        cnpj: cnpj.replace(/\D/g, "") || null,
        razao_social: razaoSocial.trim(),
        nome_fantasia: nomeFantasia.trim() || null,
        cep: cep.replace(/\D/g, "") || null,
        logradouro: logradouro.trim() || null,
        numero: numero.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        uf: uf.trim() || null,
        telefone: telefone.trim() || null,
        email: email.trim() || null,
        canal: canal || null,
        segmento: segmento.trim() || null,
        categoria_padrao_id: categoriaPadrao,
        centro_custo_padrao: centroCusto || null,
        tags: tags.length ? tags : null,
        observacao: observacao.trim() || null,
        ativo: true,
        origem: editing?.origem || "manual",
      };
      if (isEdit && editing) {
        const { data, error } = await supabase
          .from("parceiros_comerciais")
          .update(payload)
          .eq("id", editing.id)
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      } else {
        const { data, error } = await supabase
          .from("parceiros_comerciais")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: (id) => {
      toast.success(isEdit ? "Parceiro atualizado" : "Parceiro cadastrado");
      qc.invalidateQueries({ queryKey: ["parceiros"] });
      qc.invalidateQueries({ queryKey: ["parceiros-fornecedores"] });
      onSaved?.(id);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Editar parceiro" : obrigatorio ? "Completar cadastro do fornecedor" : "Novo parceiro"}
          </SheetTitle>
          <SheetDescription>
            {obrigatorio
              ? "Este fornecedor não está cadastrado. Complete os campos obrigatórios (*) antes de prosseguir com o pagamento."
              : "Cadastro unificado de fornecedores, clientes e parceiros da Fetely."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {/* Tipo */}
          <div>
            <Label className="mb-2 block">Tipo de parceiro</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={tiposSelecionados.includes("fornecedor")}
                  onCheckedChange={() => toggleTipo("fornecedor")}
                />
                <span className="text-sm">Fornecedor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={tiposSelecionados.includes("cliente")}
                  onCheckedChange={() => toggleTipo("cliente")}
                />
                <span className="text-sm">Cliente</span>
              </label>
            </div>
          </div>

          {/* CNPJ */}
          <div>
            <Label>CNPJ {obrigatorio && "*"}</Label>
            <Input
              value={cnpj}
              onChange={(e) => setCnpj(maskCnpj(e.target.value))}
              onBlur={checkDuplicate}
              placeholder="00.000.000/0000-00"
            />
            {duplicateWarn && (
              <p className="text-xs text-amber-600 mt-1">⚠️ {duplicateWarn}</p>
            )}
          </div>

          <div>
            <Label>Razão social *</Label>
            <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
          </div>
          <div>
            <Label>Nome fantasia {obrigatorio && "*"}</Label>
            <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
          </div>

          {/* Endereço */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Endereço</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>CEP</Label>
                <Input
                  value={cep}
                  onChange={(e) => setCep(maskCep(e.target.value))}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                />
              </div>
              <div className="col-span-2">
                <Label>Logradouro</Label>
                <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <Label>Número</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Bairro</Label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="col-span-2">
                <Label>Cidade</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div>
                <Label>UF</Label>
                <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} />
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Contato</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Classificação */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Classificação</p>
            {tiposSelecionados.includes("cliente") && (
              <div className="mb-3">
                <Label>Canal (cliente)</Label>
                <Select value={canal || "_none"} onValueChange={(v) => setCanal(v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    <SelectItem value="b2b">B2B</SelectItem>
                    <SelectItem value="b2c">B2C</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="parceiro">Parceiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="mb-3">
              <Label>Segmento</Label>
              <Input value={segmento} onChange={(e) => setSegmento(e.target.value)} placeholder="ex: TI, Logística..." />
            </div>
            <div className="mb-3">
              <Label>Categoria padrão (toda compra desse parceiro)</Label>
              <CategoriaCombobox
                options={categorias}
                value={categoriaPadrao}
                onChange={setCategoriaPadrao}
                allowNull
                placeholder="Sem categoria padrão"
              />
            </div>
            <div className="mb-3">
              <Label>Centro de custo padrão</Label>
              <Select value={centroCusto || "_none"} onValueChange={(v) => setCentroCusto(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {CENTROS.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="ex: recorrente, importação"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Observação</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} />
          </div>
        </div>

        <SheetFooter>
          {!obrigatorio && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : isEdit ? "Salvar" : "Cadastrar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
