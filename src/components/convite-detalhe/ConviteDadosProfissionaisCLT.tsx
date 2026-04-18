import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useParametros } from "@/hooks/useParametros";
import { useCargos } from "@/hooks/useCargos";
import { SelectDepartamentoHierarquico } from "@/components/shared/SelectDepartamentoHierarquico";

interface Props {
  dados: Record<string, any>;
  editing: boolean;
  updateField: (key: string, value: any) => void;
}

export function ConviteDadosProfissionaisCLT({ dados, editing, updateField }: Props) {
  const { data: cargosData, isLoading: loadingCargos } = useCargos("clt");
  const cargos = (cargosData || []).map((c) => ({ id: c.id, valor: c.nome, label: c.nome }));
  const { data: tiposContrato, isLoading: loadingTipos } = useParametros("tipo_contrato");
  const { data: jornadas, isLoading: loadingJornadas } = useParametros("jornada");
  const { data: locaisTrabalho, isLoading: loadingLocais } = useParametros("local_trabalho");
  const { data: horariosTrabalho, isLoading: loadingHorarios } = useParametros("horario_trabalho");
  const { data: sistemas, isLoading: loadingSistemas } = useParametros("sistema");

  // sistemas selecionados ficam em dados.acessos_sistemas como array de { sistema: string, tem_acesso: boolean }
  const acessosSistemas: { sistema: string; tem_acesso: boolean }[] = dados.acessos_sistemas || [];

  const isSistemaChecked = (valor: string) =>
    acessosSistemas.some((a) => a.sistema === valor && a.tem_acesso);

  const toggleSistema = (valor: string, checked: boolean) => {
    const current = [...acessosSistemas];
    const idx = current.findIndex((a) => a.sistema === valor);
    if (checked) {
      if (idx === -1) {
        current.push({ sistema: valor, tem_acesso: true });
      } else {
        current[idx] = { ...current[idx], tem_acesso: true };
      }
    } else {
      if (idx !== -1) {
        current.splice(idx, 1);
      }
    }
    updateField("acessos_sistemas", current);
  };

  const renderField = (label: string, key: string, type = "text", placeholder = "") => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        <Input
          type={type}
          value={dados[key] || ""}
          onChange={(e) => updateField(key, type === "number" ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <p className="text-sm font-medium">{dados[key] || "—"}</p>
      )}
    </div>
  );

  const renderSelect = (label: string, key: string, options: { value: string; label: string }[], loading: boolean) => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        loading ? (
          <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : (
          <Select value={dados[key] || ""} onValueChange={(v) => updateField(key, v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : (
        <p className="text-sm font-medium">{dados[key] || "—"}</p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Dados Profissionais</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderField("Matrícula", "matricula", "text", "Gerada automaticamente se vazio")}
          {renderSelect(
            "Cargo *",
            "cargo",
            (cargos || []).map((c) => ({ value: c.label, label: c.label })),
            loadingCargos
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Departamento *</Label>
            {editing ? (
              <SelectDepartamentoHierarquico
                valueId={dados.departamento_id || null}
                valueTexto={dados.departamento || ""}
                onChange={(dep) => {
                  updateField("departamento_id", dep?.id || null);
                  updateField("departamento", dep?.label || "");
                }}
              />
            ) : (
              <p className="text-sm font-medium">{dados.departamento || "—"}</p>
            )}
          </div>
          {renderField("Data de Admissão *", "data_admissao", "date")}
          {renderField("Data de Desligamento", "data_desligamento", "date")}
          {renderSelect(
            "Tipo de Contrato",
            "tipo_contrato",
            (tiposContrato || []).map((t) => ({ value: t.valor, label: t.label })),
            loadingTipos
          )}
          {renderField("Salário Base (R$) *", "salario_base", "number", "0,00")}
          {renderSelect(
            "Jornada Semanal",
            "jornada_semanal",
            (jornadas || []).map((j) => ({ value: j.valor, label: j.label })),
            loadingJornadas
          )}
          {renderSelect(
            "Horário de Trabalho",
            "horario_trabalho",
            (horariosTrabalho || []).map((h) => ({ value: h.valor, label: h.label })),
            loadingHorarios
          )}
          {renderSelect(
            "Local de Trabalho",
            "local_trabalho",
            (locaisTrabalho || []).map((l) => ({ value: l.label, label: l.label })),
            loadingLocais
          )}
        </div>

        <div className="mt-6">
          <Label className="text-xs text-muted-foreground mb-2 block">Sistemas de Acesso</Label>
          {loadingSistemas ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(sistemas || []).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={isSistemaChecked(s.valor)}
                      onCheckedChange={(checked) => toggleSistema(s.valor, !!checked)}
                    />
                    <span className="text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Outros sistemas</Label>
                <Input
                  value={dados.outros_sistemas || ""}
                  onChange={(e) => updateField("outros_sistemas", e.target.value)}
                  placeholder="Sistemas não listados acima, separados por vírgula"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {acessosSistemas.filter((a) => a.tem_acesso).length === 0 && !dados.outros_sistemas ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <>
                  {acessosSistemas
                    .filter((a) => a.tem_acesso)
                    .map((a) => {
                      const param = (sistemas || []).find((s) => s.valor === a.sistema);
                      return (
                        <span key={a.sistema} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {param?.label || a.sistema}
                        </span>
                      );
                    })}
                  {dados.outros_sistemas && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {dados.outros_sistemas}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
