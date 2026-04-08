import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, Edit, Save, Loader2, X, User, FileText, Building2, CreditCard, Users, UserPlus, Mail, Briefcase, Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { statusStyles } from "@/components/convite-detalhe/constants";
import { ConviteDadosPessoaisCLT } from "@/components/convite-detalhe/ConviteDadosPessoaisCLT";
import { ConviteDocumentosCLT } from "@/components/convite-detalhe/ConviteDocumentosCLT";
import { ConviteDadosBancarios } from "@/components/convite-detalhe/ConviteDadosBancarios";
import { ConviteDependentes } from "@/components/convite-detalhe/ConviteDependentes";
import { ConviteDadosEmpresaPJ } from "@/components/convite-detalhe/ConviteDadosEmpresaPJ";
import { ConviteDadosProfissionaisCLT } from "@/components/convite-detalhe/ConviteDadosProfissionaisCLT";
import { ConviteDadosEmpresaCLT } from "@/components/convite-detalhe/ConviteDadosEmpresaCLT";
import { ConviteDadosProfissionaisPJ } from "@/components/convite-detalhe/ConviteDadosProfissionaisPJ";

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
  colaborador_id: string | null;
  contrato_pj_id: string | null;
}

export default function ConviteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [convite, setConvite] = useState<Convite | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
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
    fetchData();
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

  const handleResendEmail = async () => {
    if (!convite) return;
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "cadastro-recebido",
          recipientEmail: convite.email,
          idempotencyKey: `cadastro-recebido-resend-${convite.id}-${Date.now()}`,
          templateData: {
            nome: convite.nome,
            tipo: convite.tipo,
            cargo: convite.cargo || "",
            departamento: convite.departamento || "",
          },
        },
      });
      if (error) throw error;
      toast.success("Email de confirmação reenviado para " + convite.email);
    } catch (err: any) {
      toast.error("Erro ao reenviar email: " + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportToCadastro = async () => {
    if (!convite || !formData) return;
    setExporting(true);
    try {
      if (convite.tipo === "clt") {
        const { dependentes, ...rest } = formData;
        const cltFields = [
          "nome_completo","cpf","rg","orgao_emissor","data_nascimento","genero","estado_civil",
          "nacionalidade","etnia","nome_mae","nome_pai","cep","logradouro","numero","complemento",
          "bairro","cidade","uf","telefone","email_pessoal","contato_emergencia_nome",
          "contato_emergencia_telefone","pis_pasep","ctps_numero","ctps_serie","ctps_uf",
          "titulo_eleitor","zona_eleitoral","secao_eleitoral","cnh_numero","cnh_categoria",
          "cnh_validade","certificado_reservista","banco_nome","banco_codigo","agencia",
          "conta","tipo_conta","chave_pix",
        ];
        const dadosClt: Record<string, any> = {};
        for (const k of cltFields) {
          if (rest[k] !== undefined && rest[k] !== "") dadosClt[k] = rest[k];
        }
        const insertData = {
          ...dadosClt,
          nome_completo: dadosClt.nome_completo || convite.nome,
          cpf: dadosClt.cpf || "000.000.000-00",
          data_nascimento: dadosClt.data_nascimento || "2000-01-01",
          cargo: convite.cargo || "A definir",
          departamento: convite.departamento || "A definir",
          data_admissao: rest.data_admissao || new Date().toISOString().split("T")[0],
          salario_base: Number(rest.salario_base) || 0,
          status: "ativo",
        } as any;
        const { data: colaborador, error } = await supabase
          .from("colaboradores_clt")
          .insert(insertData)
          .select("id")
          .single();
        if (error) throw error;

        if (dependentes && dependentes.length > 0) {
          const depsInsert = dependentes
            .filter((d: any) => d.nome_completo && d.data_nascimento && d.parentesco)
            .map((d: any) => ({
              colaborador_id: colaborador.id,
              nome_completo: d.nome_completo,
              cpf: d.cpf || null,
              data_nascimento: d.data_nascimento,
              parentesco: d.parentesco,
              incluir_irrf: d.incluir_irrf || false,
              incluir_plano_saude: d.incluir_plano_saude || false,
            }));
          if (depsInsert.length > 0) {
            const { error: depsError } = await supabase.from("dependentes").insert(depsInsert);
            if (depsError) console.error("Erro ao inserir dependentes:", depsError);
          }
        }

        await supabase
          .from("convites_cadastro")
          .update({ colaborador_id: colaborador.id, status: "cadastrado" })
          .eq("id", convite.id);
        setConvite({ ...convite, colaborador_id: colaborador.id, status: "cadastrado" });

        toast.success("Colaborador CLT criado com sucesso!");
        navigate(`/colaboradores/${colaborador.id}`);
      } else {
        const insertData = {
          contato_nome: formData.contato_nome || convite.nome,
          contato_telefone: formData.contato_telefone || null,
          contato_email: formData.contato_email || convite.email,
          cpf: formData.cpf || null,
          rg: formData.rg || null,
          orgao_emissor: formData.orgao_emissor || null,
          data_nascimento: formData.data_nascimento || null,
          genero: formData.genero || null,
          estado_civil: formData.estado_civil || null,
          nacionalidade: formData.nacionalidade || null,
          etnia: formData.etnia || null,
          nome_mae: formData.nome_mae || null,
          nome_pai: formData.nome_pai || null,
          cep: formData.cep || null,
          logradouro: formData.logradouro || null,
          numero: formData.numero || null,
          complemento: formData.complemento || null,
          bairro: formData.bairro || null,
          cidade: formData.cidade || null,
          uf: formData.uf || null,
          telefone: formData.telefone || null,
          email_pessoal: formData.email_pessoal || null,
          contato_emergencia_nome: formData.contato_emergencia_nome || null,
          contato_emergencia_telefone: formData.contato_emergencia_telefone || null,
          cnpj: formData.cnpj,
          razao_social: formData.razao_social,
          nome_fantasia: formData.nome_fantasia || null,
          inscricao_municipal: formData.inscricao_municipal || null,
          inscricao_estadual: formData.inscricao_estadual || null,
          banco_nome: formData.banco_nome || null,
          banco_codigo: formData.banco_codigo || null,
          agencia: formData.agencia || null,
          conta: formData.conta || null,
          tipo_conta: formData.tipo_conta || "corrente",
          chave_pix: formData.chave_pix || null,
          tipo_servico: convite.cargo || "Consultoria",
          departamento: convite.departamento || "A definir",
          valor_mensal: formData.valor_mensal || 0,
          data_inicio: formData.data_inicio || new Date().toISOString().split("T")[0],
          status: "ativo",
        };

        const { data: contrato, error } = await supabase
          .from("contratos_pj")
          .insert(insertData)
          .select("id")
          .single();
        if (error) throw error;

        await supabase
          .from("convites_cadastro")
          .update({ contrato_pj_id: contrato.id, status: "cadastrado" })
          .eq("id", convite.id);
        setConvite({ ...convite, contrato_pj_id: contrato.id, status: "cadastrado" });

        toast.success("Contrato PJ criado com sucesso!");
        navigate(`/contratos-pj/${contrato.id}`);
      }
    } catch (err: any) {
      toast.error("Erro ao exportar: " + err.message);
    } finally {
      setExporting(false);
    }
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
  const hasDados = Object.keys(formData).length > 0;
  const expired = convite.status === "pendente" && new Date(convite.expira_em) <= new Date();
  const displayStatus = expired ? "expirado" : convite.status;
  const canExport = hasDados && !convite.colaborador_id && !convite.contrato_pj_id && convite.status !== "cadastrado";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/convites-cadastro")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
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
        <div className="flex items-center gap-2 flex-wrap">
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
              <>
                <Button variant="outline" size="sm" onClick={handleResendEmail} disabled={sendingEmail}>
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Reenviar Email
                </Button>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" /> Editar Dados
                </Button>
                {canExport && (
                  <Button onClick={handleExportToCadastro} disabled={exporting}>
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    {isClt ? "Criar Colaborador CLT" : "Criar Contrato PJ"}
                  </Button>
                )}
              </>
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
            <ConviteDadosPessoaisCLT dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="documentos">
            <ConviteDocumentosCLT dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="bancarios">
            <ConviteDadosBancarios dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="dependentes">
            <ConviteDependentes dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="empresa">
          <TabsList>
            <TabsTrigger value="empresa" className="gap-2"><Building2 className="h-4 w-4" /> Dados da Empresa</TabsTrigger>
            <TabsTrigger value="bancarios" className="gap-2"><CreditCard className="h-4 w-4" /> Dados Bancários</TabsTrigger>
          </TabsList>
          <TabsContent value="empresa">
            <ConviteDadosEmpresaPJ dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="bancarios">
            <ConviteDadosBancarios dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
