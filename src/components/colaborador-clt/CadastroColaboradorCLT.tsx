import { useState, useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const [uploadedFiles, setUploadedFiles] = useState<import("./StepUploadDocumentosCLT").UploadedFile[]>(
    (initialData?.documentos_upload as any) || []
  );
  const uploadFolderRef = useRef(initialData?.upload_folder || crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const conviteId = (location.state as any)?.conviteId || null;
  const initialData = (location.state as any)?.initialData || null;

  const methods = useForm<AllFormData>({
    mode: "onBlur",
    defaultValues: {
      nacionalidade: "Brasileira",
      tipo_contrato: "indeterminado",
      jornada_semanal: 44,
      tipo_conta: "corrente",
      departamento: "",
      dependentes: [],
      acessos_sistemas: [],
      equipamentos: [],
      ...(initialData || {}),
    },
  });

  const validateCurrentStep = async () => {
    const schema = stepSchemas[currentStep - 1];
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
    setCurrentStep((s) => Math.min(s + 1, 6));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: AllFormData) => {
    setSaving(true);
    try {
      const { dependentes, acessos_sistemas, equipamentos, salario_base, jornada_semanal, ...colaboradorData } = data;

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
    methods.handleSubmit(onSubmit)();
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
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button type="button" variant="outline" onClick={currentStep === 1 ? () => navigate("/colaboradores") : goBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {currentStep === 1 ? "Cancelar" : "Voltar"}
            </Button>
            {currentStep < 6 ? (
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
