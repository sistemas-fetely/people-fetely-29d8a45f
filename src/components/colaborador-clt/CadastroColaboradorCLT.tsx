import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
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
import {
  dadosPessoaisSchema,
  documentosSchema,
  dadosProfissionaisSchema,
  dadosBancariosSchema,
  dependentesSchema,
  type DadosPessoaisForm,
  type DocumentosForm,
  type DadosProfissionaisForm,
  type DadosBancariosForm,
  type DependentesForm,
} from "@/lib/validations/colaborador-clt";

const stepSchemas = [
  dadosPessoaisSchema,
  documentosSchema,
  dadosProfissionaisSchema,
  dadosBancariosSchema,
  dependentesSchema,
];

type AllFormData = DadosPessoaisForm & DocumentosForm & DadosProfissionaisForm & DadosBancariosForm & DependentesForm;

export function CadastroColaboradorCLT() {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const methods = useForm<AllFormData>({
    resolver: zodResolver(stepSchemas[currentStep - 1] as any),
    mode: "onBlur",
    defaultValues: {
      nacionalidade: "Brasileira",
      tipo_contrato: "indeterminado",
      jornada_semanal: 44,
      tipo_conta: "corrente",
      dependentes: [],
    },
  });

  const goNext = async () => {
    const valid = await methods.trigger();
    if (!valid) return;
    setCurrentStep((s) => Math.min(s + 1, 5));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: AllFormData) => {
    setSaving(true);
    try {
      const { dependentes, salario_base, jornada_semanal, ...colaboradorData } = data;

      const { data: inserted, error } = await supabase
        .from("colaboradores_clt")
        .insert({
          ...colaboradorData,
          salario_base: Number(salario_base),
          jornada_semanal: Number(jornada_semanal) || 44,
          created_by: user?.id,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

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

      toast.success("Colaborador cadastrado com sucesso!");
      navigate("/colaboradores");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao cadastrar colaborador");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    const valid = await methods.trigger();
    if (!valid) return;
    methods.handleSubmit(onSubmit)();
  };

  return (
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
          {currentStep === 5 && <StepDependentes />}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button type="button" variant="outline" onClick={currentStep === 1 ? () => navigate("/colaboradores") : goBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {currentStep === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {currentStep < 5 ? (
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
  );
}

export function CadastroColaboradorCLTWrapper() {
  const methods = useForm<AllFormData>({
    mode: "onBlur",
    defaultValues: {
      nacionalidade: "Brasileira",
      tipo_contrato: "indeterminado",
      jornada_semanal: 44,
      tipo_conta: "corrente",
      dependentes: [],
    },
  });

  return (
    <FormProvider {...methods}>
      <CadastroColaboradorCLT />
    </FormProvider>
  );
}
