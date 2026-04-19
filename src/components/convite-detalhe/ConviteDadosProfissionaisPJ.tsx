import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useParametros } from "@/hooks/useParametros";
import { useCargos } from "@/hooks/useCargos";
import { SelectDepartamentoHierarquico } from "@/components/shared/SelectDepartamentoHierarquico";
import { SalarioMasked } from "@/components/SalarioMasked";

interface Props {
  dados: Record<string, any>;
  editing: boolean;
  updateField: (key: string, value: any) => void;
}

const statusMap: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  renovado: "Renovado",
};

export function ConviteDadosProfissionaisPJ({ dados, editing, updateField }: Props) {
  const { data: cargosData, isLoading: loadingCargos } = useCargos("pj");
  const cargos = (cargosData || []).map((c) => ({ id: c.id, valor: c.nome, label: c.nome }));
  const { data: formasPagamento, isLoading: loadingFormas } = useParametros("forma_pagamento");

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
      <CardHeader><CardTitle className="text-lg">Dados do Contrato</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderSelect(
            "Cargo / Tipo de Serviço *",
            "tipo_servico",
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
          <div>
            <Label className="text-xs text-muted-foreground">Valor Mensal (R$) *</Label>
            {editing ? (
              <Input
                type="number"
                value={dados.valor_mensal || ""}
                onChange={(e) => updateField("valor_mensal", Number(e.target.value))}
                placeholder="0,00"
              />
            ) : (
              <p className="text-sm font-medium">
                {dados.valor_mensal ? (
                  <SalarioMasked valor={Number(dados.valor_mensal)} userId={null} contexto="convite" />
                ) : "—"}
              </p>
            )}
          </div>
          {renderSelect(
            "Forma de Pagamento",
            "forma_pagamento",
            (formasPagamento || []).map((f) => ({ value: f.valor, label: f.label })),
            loadingFormas
          )}
          {renderField("Data de Início *", "data_inicio", "date")}
          {renderField("Data de Fim", "data_fim", "date")}
          {renderField("Dia do Vencimento", "dia_vencimento", "number")}
          {renderSelect(
            "Status",
            "status",
            Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v })),
            false
          )}
          <div className="flex items-end gap-2 pb-1">
            <Label className="text-xs text-muted-foreground">Renovação Automática</Label>
            {editing ? (
              <Switch
                checked={!!dados.renovacao_automatica}
                onCheckedChange={(v) => updateField("renovacao_automatica", v)}
              />
            ) : (
              <p className="text-sm font-medium">{dados.renovacao_automatica ? "Sim" : "Não"}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
