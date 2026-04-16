import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface TIAtivoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ativoId: string | null;
  onSaved: () => void;
}

interface ParametroSimple {
  label: string;
  valor: string;
}

interface ColaboradorOption {
  id: string;
  nome: string;
  tipo: "clt" | "pj";
}

interface FormState {
  tipo: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  numero_patrimonio: string;
  hostname: string;
  estado: string;
  status: string;
  data_compra: string;
  valor_compra: string;
  fornecedor: string;
  nota_fiscal: string;
  garantia_ate: string;
  localizacao: string;
  observacoes: string;
  colaborador_key: string; // formato `${tipo}:${id}` ou ""
}

const initialState: FormState = {
  tipo: "",
  marca: "",
  modelo: "",
  numero_serie: "",
  numero_patrimonio: "",
  hostname: "",
  estado: "novo",
  status: "disponivel",
  data_compra: "",
  valor_compra: "",
  fornecedor: "",
  nota_fiscal: "",
  garantia_ate: "",
  localizacao: "",
  observacoes: "",
  colaborador_key: "",
};

export default function TIAtivoForm({ open, onOpenChange, ativoId, onSaved }: TIAtivoFormProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [tiposEquipamento, setTiposEquipamento] = useState<ParametroSimple[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((s) => ({ ...s, [k]: v }));

  const loadOptions = useCallback(async () => {
    const [tiposRes, cltRes, pjRes] = await Promise.all([
      supabase.from("parametros").select("label, valor").eq("categoria", "tipo_equipamento").eq("ativo", true).order("ordem"),
      supabase.from("colaboradores_clt").select("id, nome_completo").eq("status", "ativo").order("nome_completo"),
      supabase.from("contratos_pj").select("id, razao_social, contato_nome").eq("status", "ativo").order("razao_social"),
    ]);

    if (tiposRes.data) setTiposEquipamento(tiposRes.data);
    const opts: ColaboradorOption[] = [];
    if (cltRes.data) cltRes.data.forEach((c) => opts.push({ id: c.id, nome: c.nome_completo, tipo: "clt" }));
    if (pjRes.data) pjRes.data.forEach((c) => opts.push({ id: c.id, nome: c.contato_nome || c.razao_social, tipo: "pj" }));
    setColaboradores(opts);
  }, []);

  const loadAtivo = useCallback(async (id: string) => {
    const { data } = await supabase.from("ti_ativos").select("*").eq("id", id).maybeSingle();
    if (data) {
      setForm({
        tipo: data.tipo || "",
        marca: data.marca || "",
        modelo: data.modelo || "",
        numero_serie: data.numero_serie || "",
        numero_patrimonio: data.numero_patrimonio || "",
        hostname: data.hostname || "",
        estado: data.estado || "novo",
        status: data.status || "disponivel",
        data_compra: data.data_compra || "",
        valor_compra: data.valor_compra != null ? String(data.valor_compra) : "",
        fornecedor: data.fornecedor || "",
        nota_fiscal: data.nota_fiscal || "",
        garantia_ate: data.garantia_ate || "",
        localizacao: data.localizacao || "",
        observacoes: data.observacoes || "",
        colaborador_key: data.colaborador_id && data.colaborador_tipo ? `${data.colaborador_tipo}:${data.colaborador_id}` : "",
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadOptions();
    if (ativoId) {
      void loadAtivo(ativoId);
    } else {
      setForm(initialState);
    }
  }, [open, ativoId, loadOptions, loadAtivo]);

  const handleSave = async () => {
    if (!form.tipo) {
      toast({ title: "Tipo é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);

    let colaborador_id: string | null = null;
    let colaborador_tipo: string | null = null;
    let colaborador_nome: string | null = null;
    let status = form.status;
    let atribuido_em: string | null = null;

    if (form.colaborador_key) {
      const [tipo, id] = form.colaborador_key.split(":");
      const c = colaboradores.find((x) => x.id === id && x.tipo === tipo);
      if (c) {
        colaborador_id = c.id;
        colaborador_tipo = c.tipo;
        colaborador_nome = c.nome;
        status = "atribuido";
        atribuido_em = new Date().toISOString().split("T")[0];
      }
    } else if (status === "atribuido") {
      // sem colaborador → volta a disponível
      status = "disponivel";
    }

    const payload = {
      tipo: form.tipo,
      marca: form.marca || null,
      modelo: form.modelo || null,
      numero_serie: form.numero_serie || null,
      numero_patrimonio: form.numero_patrimonio || null,
      hostname: form.hostname || null,
      estado: form.estado,
      status,
      data_compra: form.data_compra || null,
      valor_compra: form.valor_compra ? Number(form.valor_compra) : null,
      fornecedor: form.fornecedor || null,
      nota_fiscal: form.nota_fiscal || null,
      garantia_ate: form.garantia_ate || null,
      localizacao: form.localizacao || null,
      observacoes: form.observacoes || null,
      colaborador_id,
      colaborador_tipo,
      colaborador_nome,
      atribuido_em,
    };

    if (ativoId) {
      const { error } = await supabase.from("ti_ativos").update(payload).eq("id", ativoId);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      await supabase.from("ti_ativos_historico").insert({
        ativo_id: ativoId,
        acao: colaborador_id ? "atribuicao" : "edicao",
        para_colaborador: colaborador_nome,
        responsavel_id: user?.id,
      });
      toast({ title: "Ativo atualizado" });
    } else {
      const { data, error } = await supabase
        .from("ti_ativos")
        .insert({ ...payload, created_by: user?.id })
        .select("id")
        .maybeSingle();
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      if (data?.id) {
        await supabase.from("ti_ativos_historico").insert({
          ativo_id: data.id,
          acao: "criacao",
          para_colaborador: colaborador_nome,
          responsavel_id: user?.id,
        });
      }
      toast({ title: "Ativo criado" });
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{ativoId ? "Editar ativo" : "Novo ativo"}</SheetTitle>
          <SheetDescription>Cadastre o equipamento e atribua a um colaborador se necessário.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {tiposEquipamento.length === 0 ? (
                    <>
                      <SelectItem value="notebook">Notebook</SelectItem>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="monitor">Monitor</SelectItem>
                      <SelectItem value="celular">Celular</SelectItem>
                      <SelectItem value="headset">Headset</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </>
                  ) : (
                    tiposEquipamento.map((t) => (
                      <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={form.marca} onChange={(e) => set("marca", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Nº Série</Label>
              <Input value={form.numero_serie} onChange={(e) => set("numero_serie", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nº Patrimônio</Label>
              <Input value={form.numero_patrimonio} onChange={(e) => set("numero_patrimonio", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Hostname</Label>
              <Input value={form.hostname} onChange={(e) => set("hostname", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="usado">Usado</SelectItem>
                  <SelectItem value="recondicionado">Recondicionado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data de compra</Label>
              <Input type="date" value={form.data_compra} onChange={(e) => set("data_compra", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor de compra (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_compra} onChange={(e) => set("valor_compra", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={form.fornecedor} onChange={(e) => set("fornecedor", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nota fiscal</Label>
              <Input value={form.nota_fiscal} onChange={(e) => set("nota_fiscal", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Garantia até</Label>
              <Input type="date" value={form.garantia_ate} onChange={(e) => set("garantia_ate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input value={form.localizacao} onChange={(e) => set("localizacao", e.target.value)} placeholder="Ex: Sala 3, Home office, Estoque" />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Atribuir a colaborador</Label>
              <Select value={form.colaborador_key || "_none"} onValueChange={(v) => set("colaborador_key", v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Não atribuído" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Não atribuído</SelectItem>
                  {colaboradores.map((c) => (
                    <SelectItem key={`${c.tipo}:${c.id}`} value={`${c.tipo}:${c.id}`}>
                      {c.nome} <span className="text-xs text-muted-foreground ml-1">({c.tipo.toUpperCase()})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Ao atribuir, o status muda automaticamente para "Atribuído".</p>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} />
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "#2563EB" }} className="text-white hover:opacity-90">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
