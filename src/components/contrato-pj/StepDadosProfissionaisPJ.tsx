import { useFormContext, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useParametros } from "@/hooks/useParametros";
import type { DadosProfissionaisPJForm } from "@/lib/validations/contrato-pj";

const statusMap: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  renovado: "Renovado",
};

export function StepDadosProfissionaisPJ() {
  const { register, setValue, watch, control, formState: { errors } } = useFormContext<DadosProfissionaisPJForm>();

  const { data: departamentos, isLoading: loadingDepts } = useParametros("departamento");
  const { data: cargos, isLoading: loadingCargos } = useParametros("cargo");
  const { data: formasPagamento, isLoading: loadingFormas } = useParametros("forma_pagamento");

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
      <h3 className="text-lg font-semibold mb-4">Dados do Contrato</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label>Cargo / Tipo de Serviço *</Label>
          {loadingCargos ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Select value={watch("tipo_servico") || ""} onValueChange={(v) => setValue("tipo_servico", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(cargos || []).map((c) => (
                  <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.tipo_servico && <p className="text-xs text-destructive mt-1">{errors.tipo_servico.message}</p>}
        </div>
        <div>
          <Label>Valor Mensal (R$) *</Label>
          <Input type="number" step="0.01" {...register("valor_mensal")} placeholder="0,00" />
          {errors.valor_mensal && <p className="text-xs text-destructive mt-1">{errors.valor_mensal.message}</p>}
        </div>
        <div>
          <Label>Forma de Pagamento</Label>
          {loadingFormas ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Select value={watch("forma_pagamento") || "transferencia"} onValueChange={(v) => setValue("forma_pagamento", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(formasPagamento || []).map((f) => (
                  <SelectItem key={f.id} value={f.valor}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label>Data de Início *</Label>
          <Input type="date" {...register("data_inicio")} />
          {errors.data_inicio && <p className="text-xs text-destructive mt-1">{errors.data_inicio.message}</p>}
        </div>
        <div>
          <Label>Data de Fim</Label>
          <Input type="date" {...register("data_fim")} />
        </div>
        <div>
          <Label>Dia do Vencimento</Label>
          <Input type="number" min="1" max="31" {...register("dia_vencimento")} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={watch("status") || "rascunho"} onValueChange={(v) => setValue("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusMap).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch checked={watch("renovacao_automatica")} onCheckedChange={(v) => setValue("renovacao_automatica", v)} />
          <Label className="cursor-pointer">Renovação automática</Label>
        </div>
      </div>

      {/* Multi-department with cost allocation */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Departamentos e Rateio</h3>
            <p className="text-sm text-muted-foreground">
              Associe o prestador a um ou mais departamentos com percentual de rateio de custos
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
