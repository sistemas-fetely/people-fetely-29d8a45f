import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useForm, FormProvider, useFieldArray, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle, Clock, ChevronLeft, ChevronRight, Users, Plus, Trash2, Search, Upload } from "lucide-react";
import StepUploadDocumentos from "@/components/cadastro-publico/StepUploadDocumentos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { fetchCep } from "@/lib/viacep";

const dadosPessoaisPublicoSchema = z.object({
  nome_completo: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(200),
  cpf: z.string().min(11, "CPF é obrigatório"),
  rg: z.string().min(1, "RG é obrigatório"),
  orgao_emissor: z.string().min(1, "Órgão Emissor é obrigatório"),
  data_nascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  genero: z.string().min(1, "Gênero é obrigatório"),
  estado_civil: z.string().min(1, "Estado civil é obrigatório"),
  nacionalidade: z.string().min(1, "Nacionalidade é obrigatória").default("Brasileira"),
  etnia: z.string().min(1, "Etnia é obrigatória"),
  nome_mae: z.string().optional().or(z.literal("")),
  nome_pai: z.string().optional().or(z.literal("")),
  cep: z.string().min(1, "CEP é obrigatório"),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional().or(z.literal("")),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  uf: z.string().min(1, "UF é obrigatória"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  email_pessoal: z.string().email("Email inválido"),
  contato_emergencia_nome: z.string().min(1, "Contato de emergência é obrigatório"),
  contato_emergencia_telefone: z.string().min(1, "Telefone de emergência é obrigatório"),
});

const documentosPublicoSchema = z.object({
  pis_pasep: z.string().min(1, "PIS/PASEP é obrigatório"),
  ctps_numero: z.string().min(1, "Número da CTPS é obrigatório"),
  ctps_serie: z.string().min(1, "Série da CTPS é obrigatória"),
  ctps_uf: z.string().min(1, "UF da CTPS é obrigatória"),
  titulo_eleitor: z.string().optional().or(z.literal("")),
  zona_eleitoral: z.string().optional().or(z.literal("")),
  secao_eleitoral: z.string().optional().or(z.literal("")),
  cnh_numero: z.string().optional().or(z.literal("")),
  cnh_categoria: z.string().optional().or(z.literal("")),
  cnh_validade: z.string().optional().or(z.literal("")),
  certificado_reservista: z.string().optional().or(z.literal("")),
});

const bancariosPublicoSchema = z.object({
  banco_nome: z.string().min(1, "Banco é obrigatório"),
  banco_codigo: z.string().min(1, "Código do banco é obrigatório"),
  agencia: z.string().min(1, "Agência é obrigatória"),
  conta: z.string().min(1, "Conta é obrigatória"),
  tipo_conta: z.string().default("corrente"),
  chave_pix: z.string().min(1, "Chave PIX é obrigatória"),
});

const dependentePublicoSchema = z.object({
  nome_completo: z.string().min(3, "Nome é obrigatório"),
  cpf: z.string().optional().or(z.literal("")),
  data_nascimento: z.string().min(1, "Data é obrigatória"),
  parentesco: z.string().min(1, "Parentesco é obrigatório"),
  incluir_irrf: z.boolean().default(false),
  incluir_plano_saude: z.boolean().default(false),
});

const cltSchema = dadosPessoaisPublicoSchema.merge(documentosPublicoSchema).merge(bancariosPublicoSchema).extend({
  dependentes: z.array(dependentePublicoSchema).default([]),
});

const pjDocumentosSchema = z.object({
  titulo_eleitor: z.string().optional().or(z.literal("")),
  zona_eleitoral: z.string().optional().or(z.literal("")),
  secao_eleitoral: z.string().optional().or(z.literal("")),
  cnh_numero: z.string().optional().or(z.literal("")),
  cnh_categoria: z.string().optional().or(z.literal("")),
  cnh_validade: z.string().optional().or(z.literal("")),
  certificado_reservista: z.string().optional().or(z.literal("")),
});

const pjPessoaisSchema = z.object({
  contato_nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  contato_telefone: z.string().min(1, "Telefone é obrigatório"),
  contato_email: z.string().email("Email inválido"),
  cpf: z.string().min(11, "CPF é obrigatório"),
  rg: z.string().min(1, "RG é obrigatório"),
  orgao_emissor: z.string().min(1, "Órgão Emissor é obrigatório"),
  data_nascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  genero: z.string().min(1, "Gênero é obrigatório"),
  estado_civil: z.string().min(1, "Estado civil é obrigatório"),
  nacionalidade: z.string().min(1, "Nacionalidade é obrigatória").default("Brasileira"),
  etnia: z.string().min(1, "Etnia é obrigatória"),
  nome_mae: z.string().optional().or(z.literal("")),
  nome_pai: z.string().optional().or(z.literal("")),
  cep: z.string().min(1, "CEP é obrigatório"),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional().or(z.literal("")),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  uf: z.string().min(1, "UF é obrigatória"),
  telefone: z.string().min(1, "Telefone pessoal é obrigatório"),
  email_pessoal: z.string().email("Email inválido"),
  contato_emergencia_nome: z.string().min(1, "Nome do contato de emergência é obrigatório"),
  contato_emergencia_telefone: z.string().min(1, "Telefone de emergência é obrigatório"),
  cnpj: z.string().min(14, "CNPJ é obrigatório"),
  razao_social: z.string().min(2, "Razão Social é obrigatória"),
  nome_fantasia: z.string().min(1, "Nome Fantasia é obrigatório"),
  inscricao_municipal: z.string().optional().or(z.literal("")),
  inscricao_estadual: z.string().optional().or(z.literal("")),
});

const pjBancariosSchema = z.object({
  banco_nome: z.string().min(1, "Banco é obrigatório"),
  banco_codigo: z.string().min(1, "Código do banco é obrigatório"),
  agencia: z.string().min(1, "Agência é obrigatória"),
  conta: z.string().min(1, "Conta é obrigatória"),
  tipo_conta: z.string().default("corrente"),
  chave_pix: z.string().min(1, "Chave PIX é obrigatória"),
});

const pjSchema = pjPessoaisSchema.merge(pjDocumentosSchema).merge(pjBancariosSchema);

type CltFormData = z.infer<typeof cltSchema>;
type PjFormData = z.infer<typeof pjSchema>;

const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const bancos = [
  { codigo: "001", nome: "Banco do Brasil" }, { codigo: "033", nome: "Santander" },
  { codigo: "104", nome: "Caixa Econômica" }, { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itaú Unibanco" }, { codigo: "077", nome: "Inter" },
  { codigo: "260", nome: "Nubank" }, { codigo: "336", nome: "C6 Bank" },
  { codigo: "290", nome: "PagSeguro" }, { codigo: "380", nome: "PicPay" },
  { codigo: "756", nome: "Sicoob" }, { codigo: "422", nome: "Safra" },
];
const parentescos = ["Cônjuge", "Companheiro(a)", "Filho(a)", "Enteado(a)", "Pai", "Mãe", "Irmão(ã)", "Avô(ó)", "Outro"];

function StepPessoaisCLT() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<CltFormData>();
  const [loadingCep, setLoadingCep] = useState(false);

  const handleCepSearch = async () => {
    const cep = watch("cep");
    if (!cep) return;
    setLoadingCep(true);
    const data = await fetchCep(cep);
    if (data) {
      setValue("logradouro", data.logradouro);
      setValue("bairro", data.bairro);
      setValue("cidade", data.localidade);
      setValue("uf", data.uf);
      if (data.complemento) setValue("complemento", data.complemento);
    }
    setLoadingCep(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Informações Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="nome_completo">Nome Completo *</Label>
            <Input id="nome_completo" {...register("nome_completo")} />
            {errors.nome_completo && <p className="text-xs text-destructive mt-1">{errors.nome_completo.message}</p>}
          </div>
          <div>
            <Label htmlFor="cpf">CPF *</Label>
            <Input id="cpf" {...register("cpf")} placeholder="000.000.000-00" />
            {errors.cpf && <p className="text-xs text-destructive mt-1">{errors.cpf.message}</p>}
          </div>
          <div>
            <Label htmlFor="rg">RG *</Label>
            <Input id="rg" {...register("rg")} />
            {errors.rg && <p className="text-xs text-destructive mt-1">{errors.rg.message}</p>}
          </div>
          <div>
            <Label htmlFor="orgao_emissor">Órgão Emissor *</Label>
            <Input id="orgao_emissor" {...register("orgao_emissor")} />
            {errors.orgao_emissor && <p className="text-xs text-destructive mt-1">{errors.orgao_emissor.message}</p>}
          </div>
          <div>
            <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
            <Input id="data_nascimento" type="date" {...register("data_nascimento")} />
            {errors.data_nascimento && <p className="text-xs text-destructive mt-1">{errors.data_nascimento.message}</p>}
          </div>
          <div>
            <Label>Gênero *</Label>
            <Select value={watch("genero") || ""} onValueChange={(v) => setValue("genero", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="nao_binario">Não-binário</SelectItem>
                <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
            {errors.genero && <p className="text-xs text-destructive mt-1">{errors.genero.message}</p>}
          </div>
          <div>
            <Label>Estado Civil *</Label>
            <Select value={watch("estado_civil") || ""} onValueChange={(v) => setValue("estado_civil", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                <SelectItem value="casado">Casado(a)</SelectItem>
                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                <SelectItem value="uniao_estavel">União Estável</SelectItem>
              </SelectContent>
            </Select>
            {errors.estado_civil && <p className="text-xs text-destructive mt-1">{errors.estado_civil.message}</p>}
          </div>
          <div>
            <Label htmlFor="nacionalidade">Nacionalidade *</Label>
            <Input id="nacionalidade" {...register("nacionalidade")} />
            {errors.nacionalidade && <p className="text-xs text-destructive mt-1">{errors.nacionalidade.message}</p>}
          </div>
          <div>
            <Label>Etnia *</Label>
            <Select value={watch("etnia") || ""} onValueChange={(v) => setValue("etnia", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="branca">Branca</SelectItem>
                <SelectItem value="preta">Preta</SelectItem>
                <SelectItem value="parda">Parda</SelectItem>
                <SelectItem value="amarela">Amarela</SelectItem>
                <SelectItem value="indigena">Indígena</SelectItem>
                <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
            {errors.etnia && <p className="text-xs text-destructive mt-1">{errors.etnia.message}</p>}
          </div>
          <div><Label htmlFor="nome_mae">Nome da Mãe</Label><Input id="nome_mae" {...register("nome_mae")} /></div>
          <div><Label htmlFor="nome_pai">Nome do Pai</Label><Input id="nome_pai" {...register("nome_pai")} /></div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cep">CEP *</Label>
            <div className="flex gap-2">
              <Input id="cep" {...register("cep")} placeholder="00000-000" />
              <Button type="button" variant="outline" size="icon" onClick={handleCepSearch} disabled={loadingCep}>
                {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {errors.cep && <p className="text-xs text-destructive mt-1">{errors.cep.message}</p>}
          </div>
          <div><Label htmlFor="logradouro">Logradouro *</Label><Input id="logradouro" {...register("logradouro")} />{errors.logradouro && <p className="text-xs text-destructive mt-1">{errors.logradouro.message}</p>}</div>
          <div><Label htmlFor="numero">Número *</Label><Input id="numero" {...register("numero")} />{errors.numero && <p className="text-xs text-destructive mt-1">{errors.numero.message}</p>}</div>
          <div><Label htmlFor="complemento">Complemento</Label><Input id="complemento" {...register("complemento")} /></div>
          <div><Label htmlFor="bairro">Bairro *</Label><Input id="bairro" {...register("bairro")} />{errors.bairro && <p className="text-xs text-destructive mt-1">{errors.bairro.message}</p>}</div>
          <div><Label htmlFor="cidade">Cidade *</Label><Input id="cidade" {...register("cidade")} />{errors.cidade && <p className="text-xs text-destructive mt-1">{errors.cidade.message}</p>}</div>
          <div>
            <Label>UF *</Label>
            <Select value={watch("uf") || ""} onValueChange={(v) => setValue("uf", v)}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>{UF_LIST.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
            </Select>
            {errors.uf && <p className="text-xs text-destructive mt-1">{errors.uf.message}</p>}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Contato</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label htmlFor="telefone">Telefone *</Label><Input id="telefone" {...register("telefone")} placeholder="(00) 00000-0000" />{errors.telefone && <p className="text-xs text-destructive mt-1">{errors.telefone.message}</p>}</div>
          <div><Label htmlFor="email_pessoal">Email Pessoal *</Label><Input id="email_pessoal" type="email" {...register("email_pessoal")} />{errors.email_pessoal && <p className="text-xs text-destructive mt-1">{errors.email_pessoal.message}</p>}</div>
          <div><Label htmlFor="contato_emergencia_nome">Contato de Emergência *</Label><Input id="contato_emergencia_nome" {...register("contato_emergencia_nome")} />{errors.contato_emergencia_nome && <p className="text-xs text-destructive mt-1">{errors.contato_emergencia_nome.message}</p>}</div>
          <div><Label htmlFor="contato_emergencia_telefone">Telefone Emergência *</Label><Input id="contato_emergencia_telefone" {...register("contato_emergencia_telefone")} />{errors.contato_emergencia_telefone && <p className="text-xs text-destructive mt-1">{errors.contato_emergencia_telefone.message}</p>}</div>
        </div>
      </div>
    </div>
  );
}

function StepDocumentosCLT() {
  const { register, setValue, watch } = useFormContext<CltFormData>();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">PIS/PASEP e CTPS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label htmlFor="pis_pasep">PIS/PASEP</Label><Input id="pis_pasep" {...register("pis_pasep")} /></div>
          <div><Label htmlFor="ctps_numero">CTPS Número</Label><Input id="ctps_numero" {...register("ctps_numero")} /></div>
          <div><Label htmlFor="ctps_serie">CTPS Série</Label><Input id="ctps_serie" {...register("ctps_serie")} /></div>
          <div>
            <Label>CTPS UF</Label>
            <Select value={watch("ctps_uf") || ""} onValueChange={(v) => setValue("ctps_uf", v)}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>{UF_LIST.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Título de Eleitor</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label htmlFor="titulo_eleitor">Número</Label><Input id="titulo_eleitor" {...register("titulo_eleitor")} /></div>
          <div><Label htmlFor="zona_eleitoral">Zona</Label><Input id="zona_eleitoral" {...register("zona_eleitoral")} /></div>
          <div><Label htmlFor="secao_eleitoral">Seção</Label><Input id="secao_eleitoral" {...register("secao_eleitoral")} /></div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">CNH</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label htmlFor="cnh_numero">Número</Label><Input id="cnh_numero" {...register("cnh_numero")} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={watch("cnh_categoria") || ""} onValueChange={(v) => setValue("cnh_categoria", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{["A","B","AB","C","D","E"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="cnh_validade">Validade</Label><Input id="cnh_validade" type="date" {...register("cnh_validade")} /></div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Certificado de Reservista</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label htmlFor="certificado_reservista">Número</Label><Input id="certificado_reservista" {...register("certificado_reservista")} /></div>
        </div>
      </div>
    </div>
  );
}

function StepBancarios({ isPj = false }: { isPj?: boolean }) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<any>();
  const handleBancoChange = (codigo: string) => {
    const banco = bancos.find(b => b.codigo === codigo);
    setValue("banco_codigo", codigo);
    setValue("banco_nome", banco?.nome || "");
  };
  const r = isPj ? " *" : "";
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Dados Bancários</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Banco{r}</Label>
          <Select value={watch("banco_codigo") || ""} onValueChange={handleBancoChange}>
            <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
            <SelectContent>{bancos.map(b => <SelectItem key={b.codigo} value={b.codigo}>{b.codigo} - {b.nome}</SelectItem>)}</SelectContent>
          </Select>
          {isPj && errors.banco_codigo && <p className="text-xs text-destructive mt-1">{String(errors.banco_codigo.message)}</p>}
        </div>
        <div><Label htmlFor="agencia">Agência{r}</Label><Input id="agencia" {...register("agencia")} placeholder="0000" />{isPj && errors.agencia && <p className="text-xs text-destructive mt-1">{String(errors.agencia.message)}</p>}</div>
        <div><Label htmlFor="conta">Conta{r}</Label><Input id="conta" {...register("conta")} placeholder="00000-0" />{isPj && errors.conta && <p className="text-xs text-destructive mt-1">{String(errors.conta.message)}</p>}</div>
        <div>
          <Label>Tipo de Conta{r}</Label>
          <Select value={watch("tipo_conta") || "corrente"} onValueChange={(v) => setValue("tipo_conta", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="corrente">Conta Corrente</SelectItem>
              <SelectItem value="poupanca">Conta Poupança</SelectItem>
              <SelectItem value="salario">Conta Salário</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Label htmlFor="chave_pix">Chave PIX{r}</Label><Input id="chave_pix" {...register("chave_pix")} placeholder="CPF, email, telefone ou chave aleatória" />{isPj && errors.chave_pix && <p className="text-xs text-destructive mt-1">{String(errors.chave_pix.message)}</p>}</div>
      </div>
    </div>
  );
}

function StepDependentesCLT() {
  const { register, control, setValue, watch } = useFormContext<CltFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "dependentes" });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Dependentes</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ nome_completo: "", cpf: "", data_nascimento: "", parentesco: "", incluir_irrf: false, incluir_plano_saude: false })} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>
      {fields.length === 0 && (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Users className="h-10 w-10 mb-3" /><p className="text-sm">Nenhum dependente cadastrado</p><p className="text-xs">Clique em "Adicionar" para incluir</p>
        </CardContent></Card>
      )}
      {fields.map((field, index) => (
        <Card key={field.id}><CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Dependente {index + 1}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Nome *</Label><Input {...register(`dependentes.${index}.nome_completo`)} /></div>
            <div><Label>CPF</Label><Input {...register(`dependentes.${index}.cpf`)} /></div>
            <div><Label>Data Nascimento *</Label><Input type="date" {...register(`dependentes.${index}.data_nascimento`)} /></div>
            <div>
              <Label>Parentesco *</Label>
              <Select value={watch(`dependentes.${index}.parentesco`) || ""} onValueChange={(v) => setValue(`dependentes.${index}.parentesco`, v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{parentescos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-6 md:col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox id={`irrf-${index}`} checked={watch(`dependentes.${index}.incluir_irrf`) || false} onCheckedChange={(v) => setValue(`dependentes.${index}.incluir_irrf`, !!v)} />
                <Label htmlFor={`irrf-${index}`} className="text-sm font-normal">Incluir no IRRF</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id={`saude-${index}`} checked={watch(`dependentes.${index}.incluir_plano_saude`) || false} onCheckedChange={(v) => setValue(`dependentes.${index}.incluir_plano_saude`, !!v)} />
                <Label htmlFor={`saude-${index}`} className="text-sm font-normal">Plano de Saúde</Label>
              </div>
            </div>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function StepPessoaisPJ() {
  const { register, formState: { errors }, setValue, watch } = useFormContext<PjFormData>();
  const [loadingCep, setLoadingCep] = useState(false);

  const handleCepSearch = async () => {
    const cep = watch("cep");
    if (!cep) return;
    setLoadingCep(true);
    const data = await fetchCep(cep);
    if (data) {
      setValue("logradouro", data.logradouro);
      setValue("bairro", data.bairro);
      setValue("cidade", data.localidade);
      setValue("uf", data.uf);
      if (data.complemento) setValue("complemento", data.complemento);
    }
    setLoadingCep(false);
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  };
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Dados do Responsável</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Label>Nome Completo *</Label><Input {...register("contato_nome")} />{errors.contato_nome && <p className="text-xs text-destructive mt-1">{errors.contato_nome.message}</p>}</div>
          <div><Label>CPF *</Label><Input {...register("cpf")} placeholder="000.000.000-00" />{errors.cpf && <p className="text-xs text-destructive mt-1">{errors.cpf.message}</p>}</div>
          <div><Label>RG *</Label><Input {...register("rg")} />{errors.rg && <p className="text-xs text-destructive mt-1">{errors.rg.message}</p>}</div>
          <div><Label>Órgão Emissor *</Label><Input {...register("orgao_emissor")} />{errors.orgao_emissor && <p className="text-xs text-destructive mt-1">{errors.orgao_emissor.message}</p>}</div>
          <div><Label>Data de Nascimento *</Label><Input type="date" {...register("data_nascimento")} />{errors.data_nascimento && <p className="text-xs text-destructive mt-1">{errors.data_nascimento.message}</p>}</div>
          <div>
            <Label>Gênero *</Label>
            <Select value={watch("genero") || ""} onValueChange={(v) => setValue("genero", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="nao_binario">Não-binário</SelectItem>
                <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
            {errors.genero && <p className="text-xs text-destructive mt-1">{errors.genero.message}</p>}
          </div>
          <div>
            <Label>Estado Civil *</Label>
            <Select value={watch("estado_civil") || ""} onValueChange={(v) => setValue("estado_civil", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                <SelectItem value="casado">Casado(a)</SelectItem>
                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                <SelectItem value="uniao_estavel">União Estável</SelectItem>
              </SelectContent>
            </Select>
            {errors.estado_civil && <p className="text-xs text-destructive mt-1">{errors.estado_civil.message}</p>}
          </div>
          <div><Label>Nacionalidade *</Label><Input {...register("nacionalidade")} />{errors.nacionalidade && <p className="text-xs text-destructive mt-1">{errors.nacionalidade.message}</p>}</div>
          <div>
            <Label>Etnia *</Label>
            <Select value={watch("etnia") || ""} onValueChange={(v) => setValue("etnia", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="branca">Branca</SelectItem>
                <SelectItem value="preta">Preta</SelectItem>
                <SelectItem value="parda">Parda</SelectItem>
                <SelectItem value="amarela">Amarela</SelectItem>
                <SelectItem value="indigena">Indígena</SelectItem>
                <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
            {errors.etnia && <p className="text-xs text-destructive mt-1">{errors.etnia.message}</p>}
          </div>
          <div><Label>Nome da Mãe</Label><Input {...register("nome_mae")} /></div>
          <div><Label>Nome do Pai</Label><Input {...register("nome_pai")} /></div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>CEP *</Label>
            <div className="flex gap-2">
              <Input {...register("cep")} placeholder="00000-000" />
              <Button type="button" variant="outline" size="icon" onClick={handleCepSearch} disabled={loadingCep}>
                {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {errors.cep && <p className="text-xs text-destructive mt-1">{errors.cep.message}</p>}
          </div>
          <div><Label>Logradouro *</Label><Input {...register("logradouro")} />{errors.logradouro && <p className="text-xs text-destructive mt-1">{errors.logradouro.message}</p>}</div>
          <div><Label>Número *</Label><Input {...register("numero")} />{errors.numero && <p className="text-xs text-destructive mt-1">{errors.numero.message}</p>}</div>
          <div><Label>Complemento</Label><Input {...register("complemento")} /></div>
          <div><Label>Bairro *</Label><Input {...register("bairro")} />{errors.bairro && <p className="text-xs text-destructive mt-1">{errors.bairro.message}</p>}</div>
          <div><Label>Cidade *</Label><Input {...register("cidade")} />{errors.cidade && <p className="text-xs text-destructive mt-1">{errors.cidade.message}</p>}</div>
          <div>
            <Label>UF *</Label>
            <Select value={watch("uf") || ""} onValueChange={(v) => setValue("uf", v)}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>{UF_LIST.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
            </Select>
            {errors.uf && <p className="text-xs text-destructive mt-1">{errors.uf.message}</p>}
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Contato</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Telefone *</Label><Input {...register("contato_telefone")} placeholder="(00) 00000-0000" />{errors.contato_telefone && <p className="text-xs text-destructive mt-1">{errors.contato_telefone.message}</p>}</div>
          <div><Label>Email *</Label><Input type="email" {...register("contato_email")} />{errors.contato_email && <p className="text-xs text-destructive mt-1">{errors.contato_email.message}</p>}</div>
          <div><Label>Email Pessoal *</Label><Input type="email" {...register("email_pessoal")} />{errors.email_pessoal && <p className="text-xs text-destructive mt-1">{errors.email_pessoal.message}</p>}</div>
          <div><Label>Telefone Pessoal *</Label><Input {...register("telefone")} placeholder="(00) 00000-0000" />{errors.telefone && <p className="text-xs text-destructive mt-1">{errors.telefone.message}</p>}</div>
          <div><Label>Contato Emergência *</Label><Input {...register("contato_emergencia_nome")} placeholder="Nome" />{errors.contato_emergencia_nome && <p className="text-xs text-destructive mt-1">{errors.contato_emergencia_nome.message}</p>}</div>
          <div><Label>Telefone Emergência *</Label><Input {...register("contato_emergencia_telefone")} placeholder="(00) 00000-0000" />{errors.contato_emergencia_telefone && <p className="text-xs text-destructive mt-1">{errors.contato_emergencia_telefone.message}</p>}</div>
        </div>
      </div>
    </div>
  );
}

function StepEmpresaPJ() {
  const { register, formState: { errors }, setValue, watch } = useFormContext<PjFormData>();
  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  };
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Dados da Empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>CNPJ *</Label><Input value={watch("cnpj") || ""} onChange={(e) => setValue("cnpj", formatCNPJ(e.target.value), { shouldValidate: true })} maxLength={18} />{errors.cnpj && <p className="text-xs text-destructive mt-1">{errors.cnpj.message}</p>}</div>
          <div><Label>Razão Social *</Label><Input {...register("razao_social")} />{errors.razao_social && <p className="text-xs text-destructive mt-1">{errors.razao_social.message}</p>}</div>
          <div><Label>Nome Fantasia *</Label><Input {...register("nome_fantasia")} />{errors.nome_fantasia && <p className="text-xs text-destructive mt-1">{errors.nome_fantasia.message}</p>}</div>
          <div><Label>Inscrição Municipal</Label><Input {...register("inscricao_municipal")} /></div>
          <div><Label>Inscrição Estadual</Label><Input {...register("inscricao_estadual")} /></div>
        </div>
      </div>
    </div>
  );
}

function StepPessoaisPJPublic() {
  return <StepPessoaisPJ />;
}

function StepDocumentosPJPublic() {
  const { register, setValue, watch } = useFormContext<PjFormData>();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Título de Eleitor</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Número</Label><Input {...register("titulo_eleitor")} /></div>
          <div><Label>Zona</Label><Input {...register("zona_eleitoral")} /></div>
          <div><Label>Seção</Label><Input {...register("secao_eleitoral")} /></div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">CNH</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Número</Label><Input {...register("cnh_numero")} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={watch("cnh_categoria") || ""} onValueChange={(v) => setValue("cnh_categoria", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{["A","B","AB","C","D","E"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Validade</Label><Input type="date" {...register("cnh_validade")} /></div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Certificado de Reservista</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Número</Label><Input {...register("certificado_reservista")} /></div>
        </div>
      </div>
    </div>
  );
}

interface ConviteData {
  id: string;
  token: string;
  tipo: string;
  nome: string;
  email: string;
  cargo: string | null;
  departamento: string | null;
  status: string;
  expira_em: string;
  criado_por: string | null;
  dados_preenchidos: Record<string, any> | null;
}

const CLT_STEPS = ["Dados Pessoais", "Documentos", "Dados Bancários", "Dependentes", "Upload de Documentos"];
const PJ_STEPS = ["Dados Pessoais", "Dados da Empresa", "Documentos", "Dados Bancários", "Upload de Documentos"];

export default function CadastroPublico() {
  const { token } = useParams<{ token: string }>();
  const [convite, setConvite] = useState<ConviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ key: string; name: string; url: string }[]>([]);

  const isClt = convite?.tipo === "clt";
  const steps = isClt ? CLT_STEPS : PJ_STEPS;

  const cltMethods = useForm<CltFormData>({
    resolver: zodResolver(cltSchema),
    defaultValues: { nacionalidade: "Brasileira", tipo_conta: "corrente", dependentes: [] },
  });

  const pjMethods = useForm<PjFormData>({
    resolver: zodResolver(pjSchema),
    defaultValues: { tipo_conta: "corrente", nacionalidade: "Brasileira" },
  });

  useEffect(() => {
    if (!token) { setError("Token inválido"); setLoading(false); return; }
    const fetchConvite = async () => {
      const { data, error: err } = await supabase.rpc("get_convite_by_token", { _token: token });

      if (err || !data) { setError("Convite não encontrado"); setLoading(false); return; }

      const conviteData = data as unknown as ConviteData;

      if (conviteData.status === "cancelado") { setError("Este convite foi cancelado."); setLoading(false); return; }
      if (new Date(conviteData.expira_em) < new Date() && conviteData.status !== "preenchido") { setError("Este convite expirou."); setLoading(false); return; }

      setConvite(conviteData);

      // Pre-fill with previously saved data if available, otherwise use invite defaults
      if (conviteData.dados_preenchidos && conviteData.status === "preenchido") {
        const saved = conviteData.dados_preenchidos as Record<string, any>;
        // Restore uploaded files
        if (saved.documentos_upload && Array.isArray(saved.documentos_upload)) {
          setUploadedFiles(saved.documentos_upload);
        }
        if (conviteData.tipo === "clt") {
          Object.entries(saved).forEach(([key, value]) => {
            if (key === "documentos_upload") return;
            if (key === "dependentes" && Array.isArray(value)) {
              cltMethods.setValue("dependentes", value);
            } else {
              cltMethods.setValue(key as any, value);
            }
          });
        } else {
          Object.entries(saved).forEach(([key, value]) => {
            if (key === "documentos_upload") return;
            pjMethods.setValue(key as any, value);
          });
        }
      } else {
        if (conviteData.tipo === "clt") {
          cltMethods.setValue("nome_completo", conviteData.nome);
          cltMethods.setValue("email_pessoal", conviteData.email);
        } else {
          pjMethods.setValue("contato_nome", conviteData.nome);
          pjMethods.setValue("contato_email", conviteData.email);
        }
      }
      setLoading(false);
    };
    fetchConvite();
  }, [token]);

  const handleNext = async () => {
    const methods = isClt ? cltMethods : pjMethods;
    let fieldsToValidate: string[] = [];
    if (isClt) {
      if (step === 0) fieldsToValidate = ["nome_completo", "cpf", "rg", "orgao_emissor", "data_nascimento", "genero", "estado_civil", "nacionalidade", "etnia", "cep", "logradouro", "numero", "bairro", "cidade", "uf", "telefone", "email_pessoal", "contato_emergencia_nome", "contato_emergencia_telefone"];
      if (step === 1) fieldsToValidate = ["pis_pasep", "ctps_numero", "ctps_serie", "ctps_uf"];
      if (step === 2) fieldsToValidate = ["banco_codigo", "banco_nome", "agencia", "conta", "chave_pix"];
    } else {
      if (step === 0) fieldsToValidate = ["contato_nome", "contato_telefone", "contato_email", "cpf", "rg", "orgao_emissor", "data_nascimento", "genero", "estado_civil", "nacionalidade", "etnia", "cep", "logradouro", "numero", "bairro", "cidade", "uf", "telefone", "email_pessoal", "contato_emergencia_nome", "contato_emergencia_telefone"];
      if (step === 1) fieldsToValidate = ["cnpj", "razao_social", "nome_fantasia"];
      if (step === 3) fieldsToValidate = ["banco_codigo", "banco_nome", "agencia", "conta", "chave_pix"];
    }

    if (fieldsToValidate.length > 0) {
      const valid = await methods.trigger(fieldsToValidate as any);
      if (!valid) return;
    }

    if (step < steps.length - 1) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!convite) return;

    // Validate required uploads for PJ
    if (!isClt) {
      const requiredUploads = ["rg_cnh_frente", "contrato_social"];
      const missing = requiredUploads.filter(key => !uploadedFiles.find(f => f.key === key));
      if (missing.length > 0) {
        toast.error("Envie os documentos obrigatórios: RG/CNH (Frente) e Contrato Social.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const formData = isClt ? cltMethods.getValues() : pjMethods.getValues();
      const dataWithDocs = { ...formData, documentos_upload: uploadedFiles };

      const { error: rpcErr } = await supabase.rpc("submit_convite_cadastro", {
        _token: convite.token,
        _dados: dataWithDocs as any,
      });

      if (rpcErr) throw rpcErr;

      setSubmitted(true);
      toast.success("Cadastro enviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Link Indisponível</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mb-4" />
            <h2 className="text-xl font-bold mb-2">Cadastro Enviado!</h2>
            <p className="text-muted-foreground">
              Obrigado, {convite?.nome}! Seus dados foram enviados com sucesso. O RH entrará em contato em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((step + 1) / steps.length) * 100;
  const expiresAt = convite ? new Date(convite.expira_em) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  const methods = isClt ? cltMethods : pjMethods;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold">Formulário de Pré-Cadastro</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">
            {convite?.tipo === "clt" ? "Colaborador CLT" : "Prestador PJ"} · {convite?.cargo && `${convite.cargo} · `}{convite?.departamento}
          </p>
          <div className="flex items-center gap-2 mt-2 text-primary-foreground/70 text-xs">
            <Clock className="h-3 w-3" />
            <span>Expira em {daysLeft} dia(s)</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Etapa {step + 1} de {steps.length}: {steps[step]}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <FormProvider {...methods}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Card>
              <CardContent className="p-6">
                {isClt ? (
                  <>
                    {step === 0 && <StepPessoaisCLT />}
                    {step === 1 && <StepDocumentosCLT />}
                    {step === 2 && <StepBancarios />}
                    {step === 3 && <StepDependentesCLT />}
                    {step === 4 && <StepUploadDocumentos tipo="clt" token={convite?.token || ""} uploadedFiles={uploadedFiles} onFilesChange={setUploadedFiles} />}
                  </>
                ) : (
                  <>
                    {step === 0 && <StepPessoaisPJPublic />}
                    {step === 1 && <StepEmpresaPJ />}
                    {step === 2 && <StepDocumentosPJPublic />}
                    {step === 3 && <StepBancarios isPj />}
                    {step === 4 && <StepUploadDocumentos tipo="pj" token={convite?.token || ""} uploadedFiles={uploadedFiles} onFilesChange={setUploadedFiles} />}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mt-6">
              <Button type="button" variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={handleNext} className="gap-2">
                  Próximo <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={submitting} className="gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enviar Cadastro
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
