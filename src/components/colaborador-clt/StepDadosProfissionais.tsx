import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DadosProfissionaisForm } from "@/lib/validations/colaborador-clt";

const departamentos = ["TI", "RH", "Comercial", "Financeiro", "Marketing", "Operações", "Jurídico", "Administrativo"];

export function StepDadosProfissionais() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<DadosProfissionaisForm>();

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
          <Input id="cargo" {...register("cargo")} placeholder="Ex: Desenvolvedor Senior" />
          {errors.cargo && <p className="text-xs text-destructive mt-1">{errors.cargo.message}</p>}
        </div>
        <div>
          <Label>Departamento *</Label>
          <Select value={watch("departamento") || ""} onValueChange={(v) => setValue("departamento", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {departamentos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.departamento && <p className="text-xs text-destructive mt-1">{errors.departamento.message}</p>}
        </div>
        <div>
          <Label htmlFor="data_admissao">Data de Admissão *</Label>
          <Input id="data_admissao" type="date" {...register("data_admissao")} />
          {errors.data_admissao && <p className="text-xs text-destructive mt-1">{errors.data_admissao.message}</p>}
        </div>
        <div>
          <Label>Tipo de Contrato</Label>
          <Select value={watch("tipo_contrato") || "indeterminado"} onValueChange={(v) => setValue("tipo_contrato", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="indeterminado">Prazo Indeterminado</SelectItem>
              <SelectItem value="determinado">Prazo Determinado</SelectItem>
              <SelectItem value="experiencia">Experiência</SelectItem>
              <SelectItem value="intermitente">Intermitente</SelectItem>
              <SelectItem value="temporario">Temporário</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="salario_base">Salário Base (R$) *</Label>
          <Input id="salario_base" type="number" step="0.01" {...register("salario_base")} placeholder="0,00" />
          {errors.salario_base && <p className="text-xs text-destructive mt-1">{errors.salario_base.message}</p>}
        </div>
        <div>
          <Label htmlFor="jornada_semanal">Jornada Semanal (h)</Label>
          <Input id="jornada_semanal" type="number" {...register("jornada_semanal")} defaultValue={44} />
        </div>
        <div>
          <Label htmlFor="horario_trabalho">Horário de Trabalho</Label>
          <Input id="horario_trabalho" {...register("horario_trabalho")} placeholder="08:00 - 17:00" />
        </div>
        <div>
          <Label htmlFor="local_trabalho">Local de Trabalho</Label>
          <Input id="local_trabalho" {...register("local_trabalho")} placeholder="Escritório sede / Remoto" />
        </div>
      </div>
    </div>
  );
}
