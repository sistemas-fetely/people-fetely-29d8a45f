import { useState, useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { StepUploadDocumentos, type UploadedFile } from "./StepUploadDocumentosCLT";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getTarefasDinamicas } from "@/lib/onboarding-tarefas";
import { WizardSteps } from "./WizardSteps";
import { StepDadosPessoais } from "./StepDadosPessoais";
import { StepDocumentos } from "./StepDocumentos";
import { StepDadosProfissionais } from "./StepDadosProfissionais";
import { StepDadosBancarios } from "./StepDadosBancarios";
import { StepDependentes } from "./StepDependentes";
import { StepDadosEmpresa } from "./StepDadosEmpresa";
import {
  dadosPessoaisSchema,
  documentosSchema,
  dadosProfissionaisSchema,
  dadosBancariosSchema,
  dadosEmpresaSchema,
  dependentesSchema,
  type DadosPessoaisForm,
  type DocumentosForm,
  type DadosProfissionaisForm,
  type DadosBancariosForm,
  type DadosEmpresaForm,
  type DependentesForm,
} from "@/lib/validations/colaborador-clt";

const stepSchemas = [
  dadosPessoaisSchema,
  documentosSchema,
  dadosProfissionaisSchema,
  dadosBancariosSchema,
  dadosEmpresaSchema,
  dependentesSchema,
];

type AllFormData = DadosPessoaisForm & DocumentosForm & DadosProfissionaisForm & DadosBancariosForm & DadosEmpresaForm & DependentesForm;

export function CadastroColaboradorCLT() {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const conviteId = (location.state as any)?.conviteId || null;
  const initialData = (location.state as any)?.initialData || null;

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    () => (initialData?.documentos_upload as any) || []
  );
  const uploadFolderRef = useRef(initialData?.upload_folder || crypto.randomUUID());

  const methods = useForm<AllFormData>({
    mode: "onBlur",
    defaultValues: {
      nacionalidade: "Brasileira",
      tipo_contrato: "indeterminado",
      jornada_semanal: "44",
      tipo_conta: "corrente",
      departamento: "",
      dependentes: [],
      acessos_sistemas: [],
      equipamentos: [],
      ...(initialData || {}),
    },
  });

  const isSuperAdmin = useAuth().roles.includes("super_admin");

  const validateCurrentStep = async () => {
    if (isSuperAdmin) return true; // Super admin bypasses validation
    const schema = stepSchemas[currentStep - 1];
    if (!schema) return true; // Upload step has no schema
    const values = methods.getValues();
    const result = schema.safeParse(values);
    if (!result.success) {
      result.error.errors.forEach((err) => {
        const field = err.path.join(".") as any;
        methods.setError(field, { type: "manual", message: err.message });
      });
      return false;
    }
    return true;
  };

  const goNext = async () => {
    const valid = await validateCurrentStep();
    if (!valid) return;
    setCurrentStep((s) => Math.min(s + 1, 7));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: AllFormData) => {
    setSaving(true);
    try {
      const { dependentes, acessos_sistemas, equipamentos, salario_base, jornada_semanal, documentos_upload, upload_folder, celular_corporativo, ...colaboradorData } = data as any;

      const cleaned = Object.fromEntries(
        Object.entries(colaboradorData).map(([k, v]) => [k, v === "" ? null : v])
      );

      const { data: inserted, error } = await supabase
        .from("colaboradores_clt")
        .insert({
          ...cleaned,
          salario_base: Number(salario_base),
          jornada_semanal: Number(jornada_semanal) || 44,
          created_by: user?.id,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      // Insert system access records
      if (acessos_sistemas && acessos_sistemas.length > 0) {
        const acessosToInsert = acessos_sistemas
          .filter((a) => a.tem_acesso)
          .map((a) => ({
            colaborador_id: inserted.id,
            sistema: a.sistema,
            tem_acesso: true,
            usuario: a.usuario || null,
            observacoes: a.observacoes || null,
            data_concessao: new Date().toISOString().split("T")[0],
          }));
        if (acessosToInsert.length > 0) {
          const { error: aErr } = await supabase.from("colaborador_acessos_sistemas").insert(acessosToInsert);
          if (aErr) throw aErr;
        }
      }

      // Insert equipment records
      if (equipamentos && equipamentos.length > 0) {
        const equipToInsert = equipamentos.map((e) => ({
          colaborador_id: inserted.id,
          tipo: e.tipo,
          marca: e.marca || null,
          modelo: e.modelo || null,
          numero_patrimonio: e.numero_patrimonio || null,
          numero_serie: e.numero_serie || null,
          data_entrega: e.data_entrega || null,
          estado: e.estado || "novo",
          observacoes: e.observacoes || null,
        }));
        const { error: eErr } = await supabase.from("colaborador_equipamentos").insert(equipToInsert);
        if (eErr) throw eErr;
      }

      // Insert dependents
      if (dependentes && dependentes.length > 0) {
        const depsToInsert = dependentes.map((d) => ({
          colaborador_id: inserted.id,
          nome_completo: d.nome_completo,
          cpf: d.cpf || null,
          data_nascimento: d.data_nascimento,
          parentesco: d.parentesco,
          incluir_irrf: d.incluir_irrf,
          incluir_plano_saude: d.incluir_plano_saude,
        }));

        const { error: depError } = await supabase.from("dependentes").insert(depsToInsert);
        if (depError) throw depError;
      }

      // Update convite status if created from invitation
      if (conviteId) {
        await supabase
          .from("convites_cadastro")
          .update({ colaborador_id: inserted.id, status: "cadastrado" })
          .eq("id", conviteId);
      }

      // Gerar onboarding automático
      try {
        let provisionamento = null;
        if (conviteId) {
          const { data: conviteData } = await supabase
            .from("convites_cadastro")
            .select("dados_contratacao, data_inicio_prevista, lider_direto_id")
            .eq("id", conviteId)
            .single();
          provisionamento = (conviteData as any)?.dados_contratacao || null;
        }

        const { data: newChecklist } = await supabase
          .from("onboarding_checklists")
          .insert({
            colaborador_id: inserted.id,
            colaborador_tipo: "clt",
            convite_id: conviteId || null,
          } as any)
          .select("id")
          .single();

        if (newChecklist) {
          const dataAdmissao = data.data_admissao ? new Date(data.data_admissao + "T12:00:00") : new Date();

          let gestorUserId: string | null = null;
          const gestorId = (data as any).lider_direto_id || (initialData as any)?.lider_direto_id;
          if (gestorId) {
            const { data: gp } = await supabase.from("profiles").select("user_id").eq("id", gestorId).single();
            gestorUserId = gp?.user_id || null;
          }

          const tarefaTemplates = getTarefasDinamicas("clt", provisionamento);
          const tarefas = tarefaTemplates.map((t) => {
            const prazoDate = new Date(dataAdmissao);
            prazoDate.setDate(prazoDate.getDate() + t.prazo_dias);
            return {
              checklist_id: newChecklist.id,
              titulo: t.titulo,
              descricao: t.descricao || null,
              responsavel_role: t.responsavel_role,
              responsavel_user_id:
                t.responsavel_role === "gestor_direto" && gestorUserId ? gestorUserId : null,
              prazo_dias: t.prazo_dias,
              prazo_data: prazoDate.toISOString().slice(0, 10),
            };
          });

          if (tarefas.length > 0) {
            await supabase.from("onboarding_tarefas").insert(tarefas as any);
          }
        }
      } catch (onbErr) {
        console.error("Erro ao criar onboarding:", onbErr);
      }

      toast.success("Colaborador cadastrado com sucesso!");
      navigate(`/colaboradores/${inserted.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao cadastrar colaborador");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    const valid = await validateCurrentStep();
    if (!valid) return;
    if (isSuperAdmin) {
      // Super admin: submit directly without react-hook-form validation
      await onSubmit(methods.getValues());
    } else {
      methods.handleSubmit(onSubmit)();
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Colaborador CLT</h1>
          <p className="text-muted-foreground text-sm mt-1">Preencha os dados para cadastrar um novo colaborador</p>
        </div>

        <WizardSteps currentStep={currentStep} />

        <Card className="card-shadow">
          <CardContent className="pt-6">
            {currentStep === 1 && <StepDadosPessoais />}
            {currentStep === 2 && <StepDocumentos />}
            {currentStep === 3 && <StepDadosProfissionais />}
            {currentStep === 4 && <StepDadosBancarios />}
            {currentStep === 5 && <StepDadosEmpresa />}
            {currentStep === 6 && <StepDependentes />}
            {currentStep === 7 && (
              <StepUploadDocumentos
                tipo="clt"
                folderKey={uploadFolderRef.current}
                uploadedFiles={uploadedFiles}
                onFilesChange={setUploadedFiles}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button type="button" variant="outline" onClick={currentStep === 1 ? () => navigate("/colaboradores") : goBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {currentStep === 1 ? "Cancelar" : "Voltar"}
            </Button>
            {currentStep < 7 ? (
              <Button type="button" onClick={goNext} className="gap-2">
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleFinalSubmit} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Colaborador
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </FormProvider>
  );
}

export { CadastroColaboradorCLT as CadastroColaboradorCLTWrapper };
