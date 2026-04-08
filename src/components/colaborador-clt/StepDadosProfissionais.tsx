import { useFormContext, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useParametros } from "@/hooks/useParametros";
import type { DadosProfissionaisForm } from "@/lib/validations/colaborador-clt";

export function StepDadosProfissionais() {
  const { register, setValue, watch, control, formState: { errors } } = useFormContext<DadosProfissionaisForm>();

  const { data: departamentos, isLoading: loadingDepts } = useParametros("departamento");
  const { data: cargos, isLoading: loadingCargos } = useParametros("cargo");
  const { data: tiposContrato, isLoading: loadingTipos } = useParametros("tipo_contrato");
  const { data: jornadas, isLoading: loadingJornadas } = useParametros("jornada");
  const { data: locaisTrabalho, isLoading: loadingLocais } = useParametros("local_trabalho");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "departamentos_rateio",
  });

  const totalPercentual = (watch("departamentos_rateio") || []).reduce(
    (sum, d) => sum + (Number(d.percentual_rateio) || 0), 0
  );

  const addDepartamento = () => {
    const remaining = 100 - totalPercentual;
    append({ departamento: "", percentual_rateio: remaining > 0 ? remaining : 0 });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Dados Profissionais</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="matricula">Matrícula</Label>
          <Input id="matricula" {...register("matricula")} placeholder="Gerada automaticamente se vazio" />
        </div>
        <div>
          <Label htmlFor="cargo">Cargo *</Label>
          {loadingCargos ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Select value={watch("cargo") || ""} onValueChange={(v) => setValue("cargo", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
              <SelectContent>
                {(cargos || []).map((c) => (
                  <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.cargo && <p className="text-xs text-destructive mt-1">{errors.cargo.message}</p>}
        </div>
        <div>
          <Label htmlFor="data_admissao">Data de Admissão *</Label>
          <Input id="data_admissao" type="date" {...register("data_admissao")} />
          {errors.data_admissao && <p className="text-xs text-destructive mt-1">{errors.data_admissao.message}</p>}
        </div>
        <div>
          <Label htmlFor="data_desligamento">Data de Desligamento</Label>
          <Input id="data_desligamento" type="date" {...register("data_desligamento" as any)} />
        </div>
        <div>
          <Label>Tipo de Contrato</Label>
          {loadingTipos ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Select value={watch("tipo_contrato") || "indeterminado"} onValueChange={(v) => setValue("tipo_contrato", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(tiposContrato || []).map((t) => (
                  <SelectItem key={t.id} value={t.valor}>
                    <div>
                      <span>{t.label}</span>
                      {t.descricao && <span className="text-muted-foreground ml-2 text-xs">— {t.descricao}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label htmlFor="salario_base">Salário Base (R$) *</Label>
          <Input id="salario_base" type="number" step="0.01" {...register("salario_base")} placeholder="0,00" />
          {errors.salario_base && <p className="text-xs text-destructive mt-1">{errors.salario_base.message}</p>}
        </div>
        <div>
          <Label>Jornada Semanal</Label>
          {loadingJornadas ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Select value={watch("jornada_semanal")?.toString() || "44"} onValueChange={(v) => setValue("jornada_semanal", Number(v) || 44)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(jornadas || []).map((j) => (
                  <SelectItem key={j.id} value={j.valor}>
                    <div>
                      <span>{j.label}</span>
                      {j.descricao && <span className="text-muted-foreground ml-2 text-xs">— {j.descricao}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label htmlFor="horario_trabalho">Horário de Trabalho</Label>
          <Input id="horario_trabalho" {...register("horario_trabalho")} placeholder="08:00 - 17:00" />
        </div>
        <div>
          <Label>Local de Trabalho</Label>
          {loadingLocais ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Select value={watch("local_trabalho") || ""} onValueChange={(v) => setValue("local_trabalho", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o local" /></SelectTrigger>
              <SelectContent>
                {(locaisTrabalho || []).map((l) => (
                  <SelectItem key={l.id} value={l.label}>
                    <div>
                      <span>{l.label}</span>
                      {l.descricao && <span className="text-muted-foreground ml-2 text-xs">— {l.descricao}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Multi-department with cost allocation */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Departamentos e Rateio</h3>
            <p className="text-sm text-muted-foreground">
              Associe o colaborador a um ou mais departamentos com percentual de rateio de custos
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addDepartamento} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar Departamento
          </Button>
        </div>

        {(errors as any).departamentos_rateio?.message && (
          <p className="text-xs text-destructive mb-3">{(errors as any).departamentos_rateio.message}</p>
        )}

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
            Nenhum departamento adicionado. Clique em "Adicionar Departamento" acima.
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-3 p-3 rounded-lg bg-muted/30 border">
              <div className="flex-1">
                <Label>Departamento *</Label>
                {loadingDepts ? (
                  <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
                ) : (
                  <Select
                    value={watch(`departamentos_rateio.${index}.departamento`) || ""}
                    onValueChange={(v) => setValue(`departamentos_rateio.${index}.departamento`, v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(departamentos || []).map((d) => (
                        <SelectItem key={d.id} value={d.label}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {(errors as any).departamentos_rateio?.[index]?.departamento && (
                  <p className="text-xs text-destructive mt-1">
                    {(errors as any).departamentos_rateio[index].departamento.message}
                  </p>
                )}
              </div>
              <div className="w-32">
                <Label>Rateio (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register(`departamentos_rateio.${index}.percentual_rateio`, { valueAsNumber: true })}
                />
                {(errors as any).departamentos_rateio?.[index]?.percentual_rateio && (
                  <p className="text-xs text-destructive mt-1">
                    {(errors as any).departamentos_rateio[index].percentual_rateio.message}
                  </p>
                )}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive h-10 w-10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {fields.length > 0 && (
          <div className={`flex justify-end mt-3 text-sm font-medium ${
            Math.abs(totalPercentual - 100) < 0.01 ? "text-success" : "text-warning"
          }`}>
            Total: {totalPercentual.toFixed(2)}%
            {Math.abs(totalPercentual - 100) >= 0.01 && (
              <span className="ml-2 text-xs text-muted-foreground">(deve somar 100%)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
