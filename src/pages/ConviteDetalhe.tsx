import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, Edit, Save, Loader2, X, User, FileText, Building2, CreditCard, Users, UserPlus, Mail, Briefcase, Building, Paperclip, CheckCircle2, ExternalLink,
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
import { ConviteDadosPessoaisPJ } from "@/components/convite-detalhe/ConviteDadosPessoaisPJ";
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

function ConviteAnexos({ documentos }: { documentos?: { key: string; name: string; url: string }[] }) {
  if (!documentos || documentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Paperclip className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum documento anexado pelo candidato.</p>
        </CardContent>
      </Card>
    );
  }

  const labelMap: Record<string, string> = {
    rg_cnh_frente: "RG ou CNH (Frente)",
    rg_cnh_verso: "RG ou CNH (Verso)",
    contrato_social: "Contrato Social",
    cartao_cnpj: "Cartão CNPJ",
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <h3 className="text-lg font-semibold mb-4">Documentos Anexados</h3>
        {documentos.map((doc) => (
          <div key={doc.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">{labelMap[doc.key] || doc.key}</p>
                <p className="text-xs text-muted-foreground">{doc.name}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Visualizar
              </a>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function ConviteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [convite, setConvite] = useState<Convite | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting] = useState(false);
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
          templateName: "convite-cadastro",
          recipientEmail: convite.email,
          idempotencyKey: `convite-resend-${convite.id}-${Date.now()}`,
          templateData: {
            nome: convite.nome,
            tipo: convite.tipo,
            cargo: convite.cargo || "",
            departamento: convite.departamento || "",
            link: `${window.location.origin}/cadastro/${convite.token}`,
          },
        },
      });
      if (error) throw error;

      // Update status to email_enviado if still pendente
      if (convite.status === "pendente") {
        await supabase
          .from("convites_cadastro")
          .update({ status: "email_enviado" })
          .eq("id", convite.id);
        setConvite({ ...convite, status: "email_enviado" });
      }

      toast.success("Email enviado para " + convite.email);
    } catch (err: any) {
      toast.error("Erro ao enviar email: " + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportToCadastro = () => {
    if (!convite || !formData) return;
    const { dependentes, documentos_upload, ...rest } = formData;

    if (convite.tipo === "clt") {
      navigate("/colaboradores/novo", {
        state: {
          conviteId: convite.id,
          initialData: {
            ...rest,
            nome_completo: rest.nome_completo || convite.nome,
            cpf: rest.cpf || "",
            data_nascimento: rest.data_nascimento || "",
            cargo: rest.cargo || convite.cargo || "",
            departamento: rest.departamento || convite.departamento || "",
            data_admissao: rest.data_admissao || new Date().toISOString().split("T")[0],
            salario_base: rest.salario_base || 0,
            tipo_contrato: rest.tipo_contrato || "indeterminado",
            jornada_semanal: rest.jornada_semanal || 44,
            dependentes: dependentes || [],
            documentos_upload: documentos_upload || [],
            upload_folder: convite.token,
          },
        },
      });
    } else {
      navigate("/contratos-pj/novo", {
        state: {
          conviteId: convite.id,
          initialData: {
            ...rest,
            contato_nome: rest.contato_nome || convite.nome,
            contato_email: rest.contato_email || convite.email,
            cnpj: rest.cnpj || "",
            razao_social: rest.razao_social || "",
            tipo_servico: rest.tipo_servico || convite.cargo || "",
            departamento: rest.departamento || convite.departamento || "",
            valor_mensal: rest.valor_mensal || 0,
            forma_pagamento: rest.forma_pagamento || "transferencia",
            dia_vencimento: rest.dia_vencimento || 10,
            data_inicio: rest.data_inicio || new Date().toISOString().split("T")[0],
            status: rest.status || "ativo",
            documentos_upload: documentos_upload || [],
            upload_folder: convite.token,
          },
        },
      });
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
  const isCadastrado = convite.status === "cadastrado";
  const canExport = hasDados && !convite.colaborador_id && !convite.contrato_pj_id && !isCadastrado;
  const canEdit = !isCadastrado;

  const statusLabels: Record<string, string> = {
    pendente: "Pendente",
    email_enviado: "Email Enviado",
    preenchido: "Preenchido",
    cadastrado: "Cadastrado com Sucesso",
    expirado: "Expirado",
    cancelado: "Cancelado",
  };

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
                {statusLabels[displayStatus] || displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
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
            <>
              {hasDados && !isCadastrado && (
                <Button variant="outline" size="sm" onClick={handleResendEmail} disabled={sendingEmail}>
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Reenviar Email
                </Button>
              )}
              {canEdit && hasDados && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" /> Editar Dados
                </Button>
              )}
              {canExport && (
                <Button onClick={handleExportToCadastro}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isClt ? "Criar Colaborador CLT" : "Criar Contrato PJ"}
                </Button>
              )}
            </>
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
          <TabsList className="flex-wrap">
            <TabsTrigger value="pessoais" className="gap-2"><User className="h-4 w-4" /> Dados Pessoais</TabsTrigger>
            <TabsTrigger value="documentos" className="gap-2"><FileText className="h-4 w-4" /> Documentos</TabsTrigger>
            <TabsTrigger value="profissionais" className="gap-2"><Briefcase className="h-4 w-4" /> Profissionais</TabsTrigger>
            <TabsTrigger value="empresa" className="gap-2"><Building className="h-4 w-4" /> Empresa</TabsTrigger>
            <TabsTrigger value="bancarios" className="gap-2"><CreditCard className="h-4 w-4" /> Dados Bancários</TabsTrigger>
            <TabsTrigger value="dependentes" className="gap-2"><Users className="h-4 w-4" /> Dependentes</TabsTrigger>
            <TabsTrigger value="anexos" className="gap-2"><Paperclip className="h-4 w-4" /> Anexos</TabsTrigger>
          </TabsList>
          <TabsContent value="pessoais">
            <ConviteDadosPessoaisCLT dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="documentos">
            <ConviteDocumentosCLT dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="profissionais">
            <ConviteDadosProfissionaisCLT dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="empresa">
            <ConviteDadosEmpresaCLT dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="bancarios">
            <ConviteDadosBancarios dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="dependentes">
            <ConviteDependentes dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="anexos">
            <ConviteAnexos documentos={formData.documentos_upload} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="pessoais">
          <TabsList className="flex-wrap">
            <TabsTrigger value="pessoais" className="gap-2"><User className="h-4 w-4" /> Dados Pessoais</TabsTrigger>
            <TabsTrigger value="empresa" className="gap-2"><Building2 className="h-4 w-4" /> Dados da Empresa</TabsTrigger>
            <TabsTrigger value="profissionais" className="gap-2"><Briefcase className="h-4 w-4" /> Dados do Contrato</TabsTrigger>
            <TabsTrigger value="bancarios" className="gap-2"><CreditCard className="h-4 w-4" /> Dados Bancários</TabsTrigger>
            <TabsTrigger value="anexos" className="gap-2"><Paperclip className="h-4 w-4" /> Anexos</TabsTrigger>
          </TabsList>
          <TabsContent value="pessoais">
            <ConviteDadosPessoaisPJ dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="empresa">
            <ConviteDadosEmpresaPJ dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="profissionais">
            <ConviteDadosProfissionaisPJ dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="bancarios">
            <ConviteDadosBancarios dados={formData} editing={editing} updateField={updateField} />
          </TabsContent>
          <TabsContent value="anexos">
            <ConviteAnexos documentos={formData.documentos_upload} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
