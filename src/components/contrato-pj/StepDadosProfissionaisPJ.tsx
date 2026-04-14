import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useParametros } from "@/hooks/useParametros";
import { useCargos } from "@/hooks/useCargos";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DadosProfissionaisPJForm } from "@/lib/validations/contrato-pj";

const statusMap: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  renovado: "Renovado",
};

function formatBRL(value: number): string {
  if (!value) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function StepDadosProfissionaisPJ() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<DadosProfissionaisPJForm>();

  const { data: departamentos, isLoading: loadingDepts } = useParametros("departamento");
  const { data: cargos, isLoading: loadingCargos } = useCargos("pj");
  const { data: formasPagamento, isLoading: loadingFormas } = useParametros("forma_pagamento");

  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["profiles-for-gestor"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      return data || [];
    },
  });

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
                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.tipo_servico && <p className="text-xs text-destructive mt-1">{errors.tipo_servico.message}</p>}
        </div>
        <div>
          <Label>Departamento *</Label>
          {loadingDepts ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Select value={watch("departamento") || ""} onValueChange={(v) => setValue("departamento", v)}>
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
          <Label>Valor Mensal (R$) *</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={watch("valor_mensal") ? formatBRL(watch("valor_mensal")) : ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              const cents = parseInt(digits || "0", 10);
              setValue("valor_mensal", cents / 100);
            }}
            placeholder="R$ 0,00"
          />
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
          <Label>Gestor Direto / Líder</Label>
          {loadingProfiles ? (
            <div className="flex items-center h-10"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Select
              value={watch("gestor_direto_id") || "none"}
              onValueChange={(v) => setValue("gestor_direto_id", v === "none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione o gestor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(profiles || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
    </div>
  );
}