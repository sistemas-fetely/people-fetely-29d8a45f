import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, Edit, Save, Loader2, X, User, FileText, Briefcase,
  Building2, Users as UsersIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

import { StepDadosPessoais } from "@/components/colaborador-clt/StepDadosPessoais";
import { StepDocumentos } from "@/components/colaborador-clt/StepDocumentos";
import { StepDadosProfissionais } from "@/components/colaborador-clt/StepDadosProfissionais";
import { StepDadosBancarios } from "@/components/colaborador-clt/StepDadosBancarios";
import { StepDependentes } from "@/components/colaborador-clt/StepDependentes";
import { StepDadosEmpresa } from "@/components/colaborador-clt/StepDadosEmpresa";

import type {
  DadosPessoaisForm,
  DocumentosForm,
  DadosProfissionaisForm,
  DadosBancariosForm,
  DadosEmpresaForm,
  DependentesForm,
} from "@/lib/validations/colaborador-clt";

type AllFormData = DadosPessoaisForm & DocumentosForm & DadosProfissionaisForm & DadosBancariosForm & DadosEmpresaForm & DependentesForm;

type Departamento = { id: string; departamento: string; percentual_rateio: number };
type Dependente = Tables<"dependentes">;

const statusMap: Record<string, string> = {
  ativo: "Ativo",
  ferias: "Férias",
  afastado: "Afastado",
  experiencia: "Experiência",
  desligado: "Desligado",
};

const statusStyles: Record<string, string> = {
  ativo: "bg-success/10 text-success border-0",
  ferias: "bg-info/10 text-info border-0",
  afastado: "bg-warning/10 text-warning border-0",
  experiencia: "bg-primary/10 text-primary border-0",
  desligado: "bg-destructive/10 text-destructive border-0",
};

export default function ColaboradorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [saving, setSaving] = useState(false);
  const [colaborador, setColaborador] = useState<Tables<"colaboradores_clt"> | null>(null);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);

  const methods = useForm<AllFormData>({ mode: "onBlur" });

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [{ data: col }, { data: deps }, { data: depts }] = await Promise.all([
        supabase.from("colaboradores_clt").select("*").eq("id", id).maybeSingle(),
        supabase.from("dependentes").select("*").eq("colaborador_id", id),
        supabase.from("colaborador_departamentos").select("*").eq("colaborador_id", id),
      ]);
      if (!col) {
        toast.error("Colaborador não encontrado");
        navigate("/colaboradores");
        return;
      }
      setColaborador(col);
      setDepartamentos(depts || []);
      setDependentes(deps || []);
      // Set form defaults
      methods.reset({
        ...col,
        cnh_validade: col.cnh_validade || "",
        dependentes: (deps || []).map((d) => ({
          nome_completo: d.nome_completo,
          cpf: d.cpf || "",
          data_nascimento: d.data_nascimento,
          parentesco: d.parentesco,
          incluir_irrf: d.incluir_irrf || false,
          incluir_plano_saude: d.incluir_plano_saude || false,
        })),
        departamentos_rateio: (depts || []).length > 0
          ? depts!.map((d) => ({ departamento: d.departamento, percentual_rateio: d.percentual_rateio }))
          : [{ departamento: col.departamento, percentual_rateio: 100 }],
      } as any);
      setLoading(false);
    }
    load();
  }, [id]);

  const onSave = async (data: AllFormData) => {
    if (!id) return;
    setSaving(true);
    try {
      const { dependentes: formDeps, departamentos_rateio, salario_base, jornada_semanal, ...rest } = data;
      const cleaned = Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v])
      );
      const primaryDept = departamentos_rateio?.[0]?.departamento || "";

      const { error } = await supabase
        .from("colaboradores_clt")
        .update({
          ...cleaned,
          departamento: primaryDept,
          salario_base: Number(salario_base),
          jornada_semanal: Number(jornada_semanal) || 44,
        } as any)
        .eq("id", id);
      if (error) throw error;

      // Replace departamentos
      await supabase.from("colaborador_departamentos").delete().eq("colaborador_id", id);
      if (departamentos_rateio && departamentos_rateio.length > 0) {
        const { error: dErr } = await supabase.from("colaborador_departamentos").insert(
          departamentos_rateio.map((d) => ({
            colaborador_id: id,
            departamento: d.departamento,
            percentual_rateio: Number(d.percentual_rateio),
          }))
        );
        if (dErr) throw dErr;
      }

      // Replace dependentes
      await supabase.from("dependentes").delete().eq("colaborador_id", id);
      if (formDeps && formDeps.length > 0) {
        const { error: depErr } = await supabase.from("dependentes").insert(
          formDeps.map((d) => ({
            colaborador_id: id,
            nome_completo: d.nome_completo,
            cpf: d.cpf || null,
            data_nascimento: d.data_nascimento,
            parentesco: d.parentesco,
            incluir_irrf: d.incluir_irrf,
            incluir_plano_saude: d.incluir_plano_saude,
          }))
        );
        if (depErr) throw depErr;
      }

      toast.success("Colaborador atualizado com sucesso!");
      setEditing(false);
      // Reload data
      const { data: updated } = await supabase.from("colaboradores_clt").select("*").eq("id", id).maybeSingle();
      if (updated) setColaborador(updated);
      const { data: newDepts } = await supabase.from("colaborador_departamentos").select("*").eq("colaborador_id", id);
      setDepartamentos(newDepts || []);
      const { data: newDeps } = await supabase.from("dependentes").select("*").eq("colaborador_id", id);
      setDependentes(newDeps || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao atualizar colaborador");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!colaborador) return null;

  const initials = colaborador.nome_completo
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // VIEW MODE
  if (!editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/colaboradores")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={() => setEditing(true)} className="gap-2">
            <Edit className="h-4 w-4" /> Editar
          </Button>
        </div>

        {/* Header card */}
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {initials}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{colaborador.nome_completo}</h1>
                <p className="text-muted-foreground">{colaborador.cargo}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline" className={statusStyles[colaborador.status] || ""}>
                    {statusMap[colaborador.status] || colaborador.status}
                  </Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-0 capitalize">
                    {colaborador.tipo_contrato}
                  </Badge>
                  {departamentos.map((d, i) => (
                    <Badge key={i} variant="outline" className="bg-muted text-xs">
                      {d.departamento} ({d.percentual_rateio}%)
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pessoais">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="pessoais" className="gap-1"><User className="h-3.5 w-3.5" /> Dados Pessoais</TabsTrigger>
            <TabsTrigger value="documentos" className="gap-1"><FileText className="h-3.5 w-3.5" /> Documentos</TabsTrigger>
            <TabsTrigger value="profissionais" className="gap-1"><Briefcase className="h-3.5 w-3.5" /> Profissionais</TabsTrigger>
            <TabsTrigger value="bancarios" className="gap-1"><Building2 className="h-3.5 w-3.5" /> Bancários</TabsTrigger>
            <TabsTrigger value="dependentes" className="gap-1"><UsersIcon className="h-3.5 w-3.5" /> Dependentes</TabsTrigger>
          </TabsList>

          <TabsContent value="pessoais">
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoField label="CPF" value={colaborador.cpf} />
                <InfoField label="RG" value={colaborador.rg} />
                <InfoField label="Órgão Emissor" value={colaborador.orgao_emissor} />
                <InfoField label="Data de Nascimento" value={colaborador.data_nascimento ? format(parseISO(colaborador.data_nascimento), "dd/MM/yyyy") : ""} />
                <InfoField label="Gênero" value={colaborador.genero} />
                <InfoField label="Estado Civil" value={colaborador.estado_civil} />
                <InfoField label="Nacionalidade" value={colaborador.nacionalidade} />
                <InfoField label="Etnia" value={colaborador.etnia} />
                <InfoField label="Nome da Mãe" value={colaborador.nome_mae} />
                <InfoField label="Nome do Pai" value={colaborador.nome_pai} />
                <InfoField label="Telefone" value={colaborador.telefone} />
                <InfoField label="Email Pessoal" value={colaborador.email_pessoal} />
                <InfoField label="CEP" value={colaborador.cep} />
                <InfoField label="Logradouro" value={colaborador.logradouro} />
                <InfoField label="Número" value={colaborador.numero} />
                <InfoField label="Complemento" value={colaborador.complemento} />
                <InfoField label="Bairro" value={colaborador.bairro} />
                <InfoField label="Cidade" value={colaborador.cidade} />
                <InfoField label="UF" value={colaborador.uf} />
                <InfoField label="Contato Emergência" value={colaborador.contato_emergencia_nome} />
                <InfoField label="Tel. Emergência" value={colaborador.contato_emergencia_telefone} />
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="documentos">
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoField label="PIS/PASEP" value={colaborador.pis_pasep} />
                <InfoField label="CTPS Número" value={colaborador.ctps_numero} />
                <InfoField label="CTPS Série" value={colaborador.ctps_serie} />
                <InfoField label="CTPS UF" value={colaborador.ctps_uf} />
                <InfoField label="Título de Eleitor" value={colaborador.titulo_eleitor} />
                <InfoField label="Zona Eleitoral" value={colaborador.zona_eleitoral} />
                <InfoField label="Seção Eleitoral" value={colaborador.secao_eleitoral} />
                <InfoField label="CNH Número" value={colaborador.cnh_numero} />
                <InfoField label="CNH Categoria" value={colaborador.cnh_categoria} />
                <InfoField label="CNH Validade" value={colaborador.cnh_validade ? format(parseISO(colaborador.cnh_validade), "dd/MM/yyyy") : ""} />
                <InfoField label="Certificado Reservista" value={colaborador.certificado_reservista} />
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="profissionais">
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoField label="Matrícula" value={colaborador.matricula} />
                <InfoField label="Cargo" value={colaborador.cargo} />
                <InfoField label="Data de Admissão" value={format(parseISO(colaborador.data_admissao), "dd/MM/yyyy")} />
                <InfoField label="Tipo de Contrato" value={colaborador.tipo_contrato} />
                <InfoField label="Salário Base" value={`R$ ${Number(colaborador.salario_base).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                <InfoField label="Jornada Semanal" value={colaborador.jornada_semanal ? `${colaborador.jornada_semanal}h` : ""} />
                <InfoField label="Horário de Trabalho" value={colaborador.horario_trabalho} />
                <InfoField label="Local de Trabalho" value={colaborador.local_trabalho} />
              </div>
              {departamentos.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Departamentos e Rateio</h3>
                  <div className="flex flex-wrap gap-2">
                    {departamentos.map((d, i) => (
                      <Badge key={i} variant="outline" className="bg-muted px-3 py-1.5 text-sm">
                        {d.departamento} — {d.percentual_rateio}%
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="bancarios">
            <Card><CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoField label="Banco" value={colaborador.banco_nome} />
                <InfoField label="Código Banco" value={colaborador.banco_codigo} />
                <InfoField label="Agência" value={colaborador.agencia} />
                <InfoField label="Conta" value={colaborador.conta} />
                <InfoField label="Tipo de Conta" value={colaborador.tipo_conta} />
                <InfoField label="Chave PIX" value={colaborador.chave_pix} />
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="dependentes">
            <Card><CardContent className="pt-6">
              {dependentes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhum dependente cadastrado.</p>
              ) : (
                <div className="space-y-4">
                  {dependentes.map((d) => (
                    <div key={d.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <InfoField label="Nome" value={d.nome_completo} />
                        <InfoField label="CPF" value={d.cpf} />
                        <InfoField label="Nascimento" value={format(parseISO(d.data_nascimento), "dd/MM/yyyy")} />
                        <InfoField label="Parentesco" value={d.parentesco} />
                        <InfoField label="IRRF" value={d.incluir_irrf ? "Sim" : "Não"} />
                        <InfoField label="Plano de Saúde" value={d.incluir_plano_saude ? "Sim" : "Não"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // EDIT MODE — reuse wizard step components
  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setEditing(false)} className="gap-2">
            <X className="h-4 w-4" /> Cancelar Edição
          </Button>
          <Button
            onClick={() => methods.handleSubmit(onSave)()}
            disabled={saving}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Editar: {colaborador.nome_completo}</h1>

        <Tabs defaultValue="pessoais">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="pessoais">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
            <TabsTrigger value="bancarios">Bancários</TabsTrigger>
            <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
          </TabsList>

          <TabsContent value="pessoais">
            <Card><CardContent className="pt-6"><StepDadosPessoais /></CardContent></Card>
          </TabsContent>
          <TabsContent value="documentos">
            <Card><CardContent className="pt-6"><StepDocumentos /></CardContent></Card>
          </TabsContent>
          <TabsContent value="profissionais">
            <Card><CardContent className="pt-6"><StepDadosProfissionais /></CardContent></Card>
          </TabsContent>
          <TabsContent value="bancarios">
            <Card><CardContent className="pt-6"><StepDadosBancarios /></CardContent></Card>
          </TabsContent>
          <TabsContent value="dependentes">
            <Card><CardContent className="pt-6"><StepDependentes /></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </FormProvider>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
