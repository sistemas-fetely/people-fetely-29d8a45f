import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useParametros } from "@/hooks/useParametros";
import { useCargos } from "@/hooks/useCargos";
import type { DadosProfissionaisForm } from "@/lib/validations/colaborador-clt";

export function StepDadosProfissionais() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<DadosProfissionaisForm>();

  const { data: departamentos, isLoading: loadingDepts } = useParametros("departamento");
  const { data: cargos, isLoading: loadingCargos } = useCargos("clt");
  const { data: tiposContrato, isLoading: loadingTipos } = useParametros("tipo_contrato");
  const { data: jornadas, isLoading: loadingJornadas } = useParametros("jornada");
  const { data: locaisTrabalho, isLoading: loadingLocais } = useParametros("local_trabalho");
  const { data: horariosTrabalho, isLoading: loadingHorarios } = useParametros("horario_trabalho");

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
            <Select
              value={(cargos || []).find(c => c.nome.toLowerCase() === (watch("cargo") || "").toLowerCase())?.nome || watch("cargo") || ""}
              onValueChange={(v) => setValue("cargo", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
              <SelectContent>
                {(cargos || []).map((c) => (
                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.cargo && <p className="text-xs text-destructive mt-1">{errors.cargo.message}</p>}
        </div>
        <div>
          <Label>Departamento *</Label>
          {loadingDepts ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Select
              value={(departamentos || []).find(d => d.label.toLowerCase() === (watch("departamento") || "").toLowerCase())?.label || watch("departamento") || ""}
              onValueChange={(v) => setValue("departamento", v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
              <SelectContent>
                {(departamentos || []).map((d) => (
                  <SelectItem key={d.id} value={d.label}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.departamento && <p className="text-xs text-destructive mt-1">{errors.departamento.message}</p>}
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
            <Select value={watch("jornada_semanal") || "44"} onValueChange={(v) => setValue("jornada_semanal", v)}>
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
          <Label>Horário de Trabalho</Label>
          {loadingHorarios ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Select value={watch("horario_trabalho") || ""} onValueChange={(v) => setValue("horario_trabalho", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o horário" /></SelectTrigger>
              <SelectContent>
                {(horariosTrabalho || []).map((h) => (
                  <SelectItem key={h.id} value={h.valor}>
                    <div>
                      <span>{h.label}</span>
                      {h.descricao && <span className="text-muted-foreground ml-2 text-xs">— {h.descricao}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
    </div>
  );
}