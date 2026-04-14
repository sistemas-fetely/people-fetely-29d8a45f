import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const NIVEIS = [
  { value: "jr", label: "Júnior" },
  { value: "pl", label: "Pleno" },
  { value: "sr", label: "Sênior" },
  { value: "coordenacao", label: "Coordenação" },
  { value: "especialista", label: "Especialista" },
  { value: "c_level", label: "C-Level" },
];

const TIPOS = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "ambos", label: "CLT + PJ" },
];

const FAIXA_KEYS = ["f1", "f2", "f3", "f4", "f5"] as const;
const FAIXA_LABELS = ["F1 · Entrada", "F2 · Desenvolvimento", "F3 · Pleno", "F4 · Sênior", "F5 · Referência"];

function toNum(v: string | number | null | undefined): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function toStr(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

interface FormState {
  nome: string;
  nivel: string;
  departamento: string;
  tipo_contrato: string;
  is_clevel: boolean;
  protege_salario: boolean;
  missao: string;
  [key: string]: string | boolean | number | null;
}

function buildInitial(): FormState {
  const base: FormState = {
    nome: "", nivel: "jr", departamento: "", tipo_contrato: "ambos",
    is_clevel: false, protege_salario: false, missao: "",
  };
  for (const f of FAIXA_KEYS) {
    base[`faixa_clt_${f}_min`] = "";
    base[`faixa_clt_${f}_max`] = "";
    base[`faixa_pj_${f}_min`] = "";
    base[`faixa_pj_${f}_max`] = "";
  }
  return base;
}

function FaixaRow({ label, minKey, maxKey, form, setField }: {
  label: string; minKey: string; maxKey: string;
  form: FormState; setField: (k: string, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-xs">{label} mín</Label>
        <Input type="number" value={String(form[minKey] ?? "")} onChange={(e) => setField(minKey, e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">{label} máx</Label>
        <Input type="number" value={String(form[maxKey] ?? "")} onChange={(e) => setField(maxKey, e.target.value)} />
      </div>
    </div>
  );
}

export default function CargoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNovo = !id || id === "novo";
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(buildInitial);

  const { data: cargo } = useQuery({
    queryKey: ["cargo", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cargos").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNovo,
  });

  useEffect(() => {
    if (!cargo) return;
    const state = buildInitial();
    state.nome = cargo.nome ?? "";
    state.nivel = cargo.nivel ?? "jr";
    state.departamento = cargo.departamento ?? "";
    state.tipo_contrato = cargo.tipo_contrato ?? "ambos";
    state.is_clevel = cargo.is_clevel ?? false;
    state.protege_salario = cargo.protege_salario ?? false;
    state.missao = cargo.missao ?? "";
    for (const f of FAIXA_KEYS) {
      state[`faixa_clt_${f}_min`] = toStr((cargo as any)[`faixa_clt_${f}_min`]);
      state[`faixa_clt_${f}_max`] = toStr((cargo as any)[`faixa_clt_${f}_max`]);
      state[`faixa_pj_${f}_min`] = toStr((cargo as any)[`faixa_pj_${f}_min`]);
      state[`faixa_pj_${f}_max`] = toStr((cargo as any)[`faixa_pj_${f}_max`]);
    }
    setForm(state);
  }, [cargo]);

  function setField(k: string, v: string | boolean) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  const salvar = useMutation({
    mutationFn: async () => {
      const payload: any = {
        nome: form.nome,
        nivel: form.nivel,
        departamento: form.departamento || null,
        tipo_contrato: form.tipo_contrato,
        is_clevel: form.is_clevel,
        protege_salario: form.protege_salario,
        missao: form.missao || null,
      };
      for (const f of FAIXA_KEYS) {
        payload[`faixa_clt_${f}_min`] = toNum(form[`faixa_clt_${f}_min`] as string);
        payload[`faixa_clt_${f}_max`] = toNum(form[`faixa_clt_${f}_max`] as string);
        payload[`faixa_pj_${f}_min`] = toNum(form[`faixa_pj_${f}_min`] as string);
        payload[`faixa_pj_${f}_max`] = toNum(form[`faixa_pj_${f}_max`] as string);
      }
      if (isNovo) {
        const { error } = await supabase.from("cargos").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cargos").update(payload).eq("id", id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cargos"] });
      toast.success(isNovo ? "Cargo criado!" : "Cargo atualizado!");
      navigate("/cargos");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/cargos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">{isNovo ? "Novo Cargo" : "Editar Cargo"}</h1>
      </div>

      <div className="space-y-6">
        <div>
          <Label>Nome do cargo *</Label>
          <Input value={form.nome} onChange={(e) => setField("nome", e.target.value)} placeholder="Ex: Analista Design Jr" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nível *</Label>
            <Select value={form.nivel} onValueChange={(v) => setField("nivel", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NIVEIS.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de contrato *</Label>
            <Select value={form.tipo_contrato} onValueChange={(v) => setField("tipo_contrato", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Departamento</Label>
          <Input value={form.departamento} onChange={(e) => setField("departamento", e.target.value)} placeholder="Ex: Design" />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_clevel} onChange={(e) => { setField("is_clevel", e.target.checked); if (e.target.checked) setField("protege_salario", true); }} />
            Cargo C-Level
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.protege_salario} onChange={(e) => setField("protege_salario", e.target.checked)} />
            Proteger salário
          </label>
        </div>

        <div>
          <Label>Missão da posição</Label>
          <Textarea value={form.missao} onChange={(e) => setField("missao", e.target.value)} placeholder="O que essa pessoa vai resolver?" />
        </div>

        <div className="space-y-3">
          <p className="font-medium text-sm">Faixas salariais CLT</p>
          {FAIXA_KEYS.map((f, i) => (
            <FaixaRow key={`clt-${f}`} label={FAIXA_LABELS[i]} minKey={`faixa_clt_${f}_min`} maxKey={`faixa_clt_${f}_max`} form={form} setField={setField} />
          ))}
        </div>

        <div className="space-y-3">
          <p className="font-medium text-sm">Faixas salariais PJ</p>
          {FAIXA_KEYS.map((f, i) => (
            <FaixaRow key={`pj-${f}`} label={FAIXA_LABELS[i]} minKey={`faixa_pj_${f}_min`} maxKey={`faixa_pj_${f}_max`} form={form} setField={setField} />
          ))}
        </div>

        <Button className="w-full" disabled={!form.nome || salvar.isPending} onClick={() => salvar.mutate()}>
          {salvar.isPending ? "Salvando..." : isNovo ? "Criar cargo" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
