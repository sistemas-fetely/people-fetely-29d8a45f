import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, Edit, Save, Loader2, X, User, FileText, Building2, CreditCard, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const statusStyles: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700 border-0",
  preenchido: "bg-emerald-100 text-emerald-700 border-0",
  expirado: "bg-muted text-muted-foreground border-0",
  cancelado: "bg-red-100 text-red-700 border-0",
};

const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const bancos = [
  { codigo: "001", nome: "Banco do Brasil" }, { codigo: "033", nome: "Santander" },
  { codigo: "104", nome: "Caixa Econômica" }, { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itaú Unibanco" }, { codigo: "077", nome: "Inter" },
  { codigo: "260", nome: "Nubank" }, { codigo: "336", nome: "C6 Bank" },
  { codigo: "290", nome: "PagSeguro" }, { codigo: "380", nome: "PicPay" },
  { codigo: "756", nome: "Sicoob" }, { codigo: "422", nome: "Safra" },
];

const fieldLabels: Record<string, string> = {
  nome_completo: "Nome Completo", cpf: "CPF", rg: "RG", orgao_emissor: "Órgão Emissor",
  data_nascimento: "Data de Nascimento", genero: "Gênero", estado_civil: "Estado Civil",
  nacionalidade: "Nacionalidade", etnia: "Etnia", nome_mae: "Nome da Mãe", nome_pai: "Nome do Pai",
  cep: "CEP", logradouro: "Logradouro", numero: "Número", complemento: "Complemento",
  bairro: "Bairro", cidade: "Cidade", uf: "UF", telefone: "Telefone",
  email_pessoal: "Email Pessoal", contato_emergencia_nome: "Contato Emergência",
  contato_emergencia_telefone: "Tel. Emergência",
  pis_pasep: "PIS/PASEP", ctps_numero: "CTPS Número", ctps_serie: "CTPS Série",
  ctps_uf: "CTPS UF", titulo_eleitor: "Título de Eleitor", zona_eleitoral: "Zona Eleitoral",
  secao_eleitoral: "Seção Eleitoral", cnh_numero: "CNH Número", cnh_categoria: "CNH Categoria",
  cnh_validade: "CNH Validade", certificado_reservista: "Certificado Reservista",
  banco_nome: "Banco", banco_codigo: "Código Banco", agencia: "Agência", conta: "Conta",
  tipo_conta: "Tipo de Conta", chave_pix: "Chave PIX",
  contato_nome: "Nome do Contato", contato_telefone: "Telefone", contato_email: "Email",
  cnpj: "CNPJ", razao_social: "Razão Social", nome_fantasia: "Nome Fantasia",
  inscricao_municipal: "Inscrição Municipal", inscricao_estadual: "Inscrição Estadual",
};

const pessoaisFields = [
  "nome_completo", "cpf", "rg", "orgao_emissor", "data_nascimento", "genero",
  "estado_civil", "nacionalidade", "etnia", "nome_mae", "nome_pai",
  "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf",
  "telefone", "email_pessoal", "contato_emergencia_nome", "contato_emergencia_telefone",
];

const documentosFields = [
  "pis_pasep", "ctps_numero", "ctps_serie", "ctps_uf",
  "titulo_eleitor", "zona_eleitoral", "secao_eleitoral",
  "cnh_numero", "cnh_categoria", "cnh_validade", "certificado_reservista",
];

const bancariosFields = ["banco_nome", "banco_codigo", "agencia", "conta", "tipo_conta", "chave_pix"];

const pjFields = [
  "contato_nome", "contato_telefone", "contato_email",
  "cnpj", "razao_social", "nome_fantasia", "inscricao_municipal", "inscricao_estadual",
];

interface Convite {
  id: string;
  token: string;
  tipo: string;
  nome: string;
  email: string;
  cargo: string | null;
  departamento: string | null;
  status: string;
  expira_em: string;
  created_at: string;
  preenchido_em: string | null;
  dados_preenchidos: Record<string, any> | null;
}

export default function ConviteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [convite, setConvite] = useState<Convite | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("convites_cadastro")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        toast.error("Convite não encontrado");
        navigate("/convites-cadastro");
        return;
      }
      setConvite(data as Convite);
      setFormData((data as Convite).dados_preenchidos || {});
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleSave = async () => {
    if (!convite) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("convites_cadastro")
        .update({ dados_preenchidos: formData, preenchido_em: new Date().toISOString() })
        .eq("id", convite.id);
      if (error) throw error;
      setConvite({ ...convite, dados_preenchidos: formData });
      setEditing(false);
      toast.success("Dados atualizados com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!convite) return null;

  const isClt = convite.tipo === "clt";
  const dados = formData;
  const hasDados = Object.keys(dados).length > 0;
  const expired = convite.status === "pendente" && new Date(convite.expira_em) <= new Date();
  const displayStatus = expired ? "expirado" : convite.status;

  const renderField = (key: string) => {
    const value = dados[key];
    const label = fieldLabels[key] || key.replace(/_/g, " ");

    if (editing) {
      if (key === "uf") {
        return (
          <div key={key}>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Select value={value || ""} onValueChange={(v) => updateField(key, v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{UF_LIST.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        );
      }
      if (key === "genero") {
        return (
          <div key={key}>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Select value={value || ""} onValueChange={(v) => updateField(key, v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="nao_binario">Não-binário</SelectItem>
                <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      }
      if (key === "estado_civil") {
        return (
          <div key={key}>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Select value={value || ""} onValueChange={(v) => updateField(key, v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                <SelectItem value="casado">Casado(a)</SelectItem>
                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                <SelectItem value="uniao_estavel">União Estável</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      }
      if (key === "tipo_conta") {
        return (
          <div key={key}>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Select value={value || "corrente"} onValueChange={(v) => updateField(key, v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Corrente</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
                <SelectItem value="salario">Salário</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      }
      if (key === "banco_nome") {
        return (
          <div key={key}>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Select value={value || ""} onValueChange={(v) => {
              const banco = bancos.find((b) => b.nome === v);
              updateField("banco_nome", v);
              if (banco) updateField("banco_codigo", banco.codigo);
            }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{bancos.map((b) => <SelectItem key={b.codigo} value={b.nome}>{b.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        );
      }
      if (key.includes("data") || key.includes("validade")) {
        return (
          <div key={key}>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input type="date" className="h-9" value={value || ""} onChange={(e) => updateField(key, e.target.value)} />
          </div>
        );
      }
      return (
        <div key={key}>
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Input className="h-9" value={value || ""} onChange={(e) => updateField(key, e.target.value)} />
        </div>
      );
    }

    // View mode
    return (
      <div key={key} className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value || "—"}</span>
      </div>
    );
  };

  const renderDependentes = () => {
    const deps = (dados.dependentes as any[]) || [];
    if (deps.length === 0 && !editing) {
      return <p className="text-sm text-muted-foreground">Nenhum dependente cadastrado</p>;
    }

    return (
      <div className="space-y-4">
        {deps.map((dep, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Dependente {i + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-7"
                      onClick={() => {
                        const newDeps = [...deps];
                        newDeps.splice(i, 1);
                        updateField("dependentes", newDeps);
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <Input className="h-9" value={dep.nome_completo || ""} onChange={(e) => {
                        const newDeps = [...deps];
                        newDeps[i] = { ...dep, nome_completo: e.target.value };
                        updateField("dependentes", newDeps);
                      }} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CPF</Label>
                      <Input className="h-9" value={dep.cpf || ""} onChange={(e) => {
                        const newDeps = [...deps];
                        newDeps[i] = { ...dep, cpf: e.target.value };
                        updateField("dependentes", newDeps);
                      }} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Data Nascimento</Label>
                      <Input type="date" className="h-9" value={dep.data_nascimento || ""} onChange={(e) => {
                        const newDeps = [...deps];
                        newDeps[i] = { ...dep, data_nascimento: e.target.value };
                        updateField("dependentes", newDeps);
                      }} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Parentesco</Label>
                      <Input className="h-9" value={dep.parentesco || ""} onChange={(e) => {
                        const newDeps = [...deps];
                        newDeps[i] = { ...dep, parentesco: e.target.value };
                        updateField("dependentes", newDeps);
                      }} />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={dep.incluir_irrf || false} onCheckedChange={(v) => {
                          const newDeps = [...deps];
                          newDeps[i] = { ...dep, incluir_irrf: !!v };
                          updateField("dependentes", newDeps);
                        }} />
                        <Label className="text-xs">IRRF</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={dep.incluir_plano_saude || false} onCheckedChange={(v) => {
                          const newDeps = [...deps];
                          newDeps[i] = { ...dep, incluir_plano_saude: !!v };
                          updateField("dependentes", newDeps);
                        }} />
                        <Label className="text-xs">Plano Saúde</Label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Nome</span>
                    <p className="text-sm font-medium">{dep.nome_completo || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">CPF</span>
                    <p className="text-sm font-medium">{dep.cpf || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Nascimento</span>
                    <p className="text-sm font-medium">{dep.data_nascimento || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Parentesco</span>
                    <p className="text-sm font-medium">{dep.parentesco || "—"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateField("dependentes", [
                ...deps,
                { nome_completo: "", cpf: "", data_nascimento: "", parentesco: "", incluir_irrf: false, incluir_plano_saude: false },
              ]);
            }}
          >
            + Adicionar Dependente
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/convites-cadastro")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{convite.nome}</h1>
              <Badge variant="outline" className={statusStyles[displayStatus] || ""}>
                {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
              </Badge>
              <Badge variant="outline" className="text-xs">{convite.tipo.toUpperCase()}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {convite.email} • {convite.cargo && `${convite.cargo} • `}{convite.departamento || ""}
              {convite.preenchido_em && ` • Preenchido em ${format(parseISO(convite.preenchido_em), "dd/MM/yyyy HH:mm")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setFormData(convite.dados_preenchidos || {}); }}>
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </>
          ) : (
            hasDados && (
              <Button onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" /> Editar Dados
              </Button>
            )
          )}
        </div>
      </div>

      {/* Content */}
      {!hasDados ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Este convite ainda não foi preenchido pelo colaborador.</p>
          </CardContent>
        </Card>
      ) : isClt ? (
        <Tabs defaultValue="pessoais">
          <TabsList>
            <TabsTrigger value="pessoais" className="gap-2"><User className="h-4 w-4" /> Dados Pessoais</TabsTrigger>
            <TabsTrigger value="documentos" className="gap-2"><FileText className="h-4 w-4" /> Documentos</TabsTrigger>
            <TabsTrigger value="bancarios" className="gap-2"><CreditCard className="h-4 w-4" /> Dados Bancários</TabsTrigger>
            <TabsTrigger value="dependentes" className="gap-2"><Users className="h-4 w-4" /> Dependentes</TabsTrigger>
          </TabsList>

          <TabsContent value="pessoais">
            <Card>
              <CardHeader><CardTitle className="text-lg">Dados Pessoais</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pessoaisFields.map(renderField)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <Card>
              <CardHeader><CardTitle className="text-lg">Documentos</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documentosFields.map(renderField)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bancarios">
            <Card>
              <CardHeader><CardTitle className="text-lg">Dados Bancários</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bancariosFields.map(renderField)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dependentes">
            <Card>
              <CardHeader><CardTitle className="text-lg">Dependentes</CardTitle></CardHeader>
              <CardContent>{renderDependentes()}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="empresa">
          <TabsList>
            <TabsTrigger value="empresa" className="gap-2"><Building2 className="h-4 w-4" /> Dados da Empresa</TabsTrigger>
            <TabsTrigger value="bancarios" className="gap-2"><CreditCard className="h-4 w-4" /> Dados Bancários</TabsTrigger>
          </TabsList>

          <TabsContent value="empresa">
            <Card>
              <CardHeader><CardTitle className="text-lg">Dados da Empresa</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pjFields.map(renderField)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bancarios">
            <Card>
              <CardHeader><CardTitle className="text-lg">Dados Bancários</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bancariosFields.map(renderField)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
