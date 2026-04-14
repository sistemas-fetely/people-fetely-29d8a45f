import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParametros } from "@/hooks/useParametros";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowRight, ArrowLeft, Loader2, X } from "lucide-react";

const SKILLS_CATALOGO = [
  "React / TypeScript","Node.js","Python","SQL / PostgreSQL","APIs REST","Git",
  "Design Gráfico","UX/UI","Motion Design","Design de Produto",
  "Identidade Visual","Design de Embalagem","Direção de Arte",
  "Marketing Digital","SEO","Copywriting","Gestão de Mídias Sociais",
  "Tráfego Pago","Branding","Email Marketing",
  "Vendas B2B","Negociação","Key Account Management","Trade Marketing",
  "Supply Chain","Logística","Importação / Exportação","Gestão de Estoque",
  "Controle de Qualidade","Gestão de Times","Planejamento Estratégico",
  "Análise de Dados","Recrutamento & Seleção","Folha de Pagamento",
  "Legislação CLT","eSocial","HRBP","Gestão de Projetos","OKRs / KPIs",
];

const NIVEIS = [
  { value: "jr", label: "Jr" },
  { value: "pl", label: "Pl" },
  { value: "sr", label: "Sr" },
  { value: "coordenacao", label: "Coordenação" },
  { value: "especialista", label: "Especialista" },
  { value: "c-level", label: "C-Level" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovaVagaDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isSuperAdmin, isAdminRH } = usePermissions();
  const canSeeFaixa = isSuperAdmin || isAdminRH;

  const [step, setStep] = useState(1);

  // Step 1
  const [titulo, setTitulo] = useState("");
  const [area, setArea] = useState("");
  const [tipoContrato, setTipoContrato] = useState("");
  const [nivel, setNivel] = useState("");
  const [gestorId, setGestorId] = useState("");
  const [localTrabalho, setLocalTrabalho] = useState("");
  const [jornada, setJornada] = useState("");
  const [beneficiosIds, setBeneficiosIds] = useState<string[]>([]);
  const [beneficiosOutros, setBeneficiosOutros] = useState("");
  const [vigenciaFim, setVigenciaFim] = useState("");

  // Step 2
  const [missao, setMissao] = useState("");
  const [responsabilidades, setResponsabilidades] = useState<string[]>([""]);
  const [skillsObrigatorias, setSkillsObrigatorias] = useState<string[]>([]);
  const [skillsDesejadas, setSkillsDesejadas] = useState<string[]>([]);
  const [ferramentasIds, setFerramentasIds] = useState<string[]>([]);
  const [ferramentasOutras, setFerramentasOutras] = useState("");
  const [faixaMin, setFaixaMin] = useState("");
  const [faixaMax, setFaixaMax] = useState("");

  const { data: departamentos = [] } = useParametros("departamento");
  const { data: locais = [] } = useParametros("local_trabalho");
  const { data: jornadas = [] } = useParametros("jornada");
  const { data: beneficiosParam = [] } = useParametros("beneficio");
  const { data: ferramentasParam = [] } = useParametros("ferramenta");
  const { data: sistemasParam = [] } = useParametros("sistema");
  const { data: cargos = [] } = useParametros("cargo");

  // PCS faixas salariais
  const { data: faixasPCS } = useQuery({
    queryKey: ["pcs-faixas", titulo, tipoContrato],
    queryFn: async () => {
      if (!titulo || !tipoContrato || tipoContrato === "ambos") return null;
      const { data } = await supabase
        .from("pcs_faixas")
        .select("*")
        .eq("cargo", titulo)
        .eq("tipo", tipoContrato)
        .eq("ativo", true)
        .maybeSingle();
      return data;
    },
    enabled: !!titulo && !!tipoContrato && tipoContrato !== "ambos",
  });

  // Auto-fill faixa when PCS data loads
  useEffect(() => {
    if (faixasPCS) {
      setFaixaMin(String(faixasPCS.f1_min ?? ""));
      setFaixaMax(String(faixasPCS.f1_max ?? ""));
    }
  }, [faixasPCS]);

  const skillsCatalogo = SKILLS_CATALOGO;

  const { data: gestores = [] } = useQuery({
    queryKey: ["gestores-para-vaga"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, user_id")
        .order("full_name");
      if (error) throw error;
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["gestor_direto", "admin_rh", "gestor_rh", "super_admin"]);
      const gestorUserIds = new Set((rolesData || []).map((r) => r.user_id));
      return (data || []).filter((p) => gestorUserIds.has(p.user_id));
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        titulo,
        area,
        tipo_contrato: tipoContrato,
        nivel,
        status: "rascunho",
        local_trabalho: localTrabalho || null,
        jornada: jornada || null,
        beneficios: beneficiosParam.filter(b => beneficiosIds.includes(b.valor)).map(b => b.label).join(", ") + (beneficiosOutros ? (beneficiosIds.length > 0 ? ", " : "") + beneficiosOutros : "") || null,
        beneficios_ids: beneficiosIds.length > 0 ? beneficiosIds : null,
        beneficios_outros: beneficiosOutros || null,
        vigencia_fim: vigenciaFim || null,
        vigencia_inicio: new Date().toISOString().split("T")[0],
        missao: missao || null,
        responsabilidades: responsabilidades.filter(Boolean),
        skills_obrigatorias: skillsObrigatorias.filter(Boolean),
        skills_desejadas: skillsDesejadas.filter(Boolean),
        ferramentas: [...ferramentasParam, ...sistemasParam].filter(p => ferramentasIds.includes(p.valor)).map(p => p.label).concat(ferramentasOutras ? [ferramentasOutras] : []),
        ferramentas_ids: ferramentasIds.length > 0 ? ferramentasIds : null,
        gestor_id: gestorId || null,
        criado_por: user?.id || null,
      };
      if (canSeeFaixa) {
        if (faixaMin) payload.faixa_min = Number(faixaMin);
        if (faixaMax) payload.faixa_max = Number(faixaMax);
      }
      const { error } = await supabase.from("vagas").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vaga criada! Revise e publique quando estiver pronto.");
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      resetAndClose();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar vaga"),
  });

  function resetAndClose() {
    setStep(1);
    setTitulo(""); setArea(""); setTipoContrato(""); setNivel("");
    setGestorId(""); setLocalTrabalho(""); setJornada(""); setBeneficiosIds([]); setBeneficiosOutros("");
    setVigenciaFim(""); setMissao(""); setResponsabilidades([""]);
    setSkillsObrigatorias([]); setSkillsDesejadas([]); setFerramentasIds([]); setFerramentasOutras("");
    setFaixaMin(""); setFaixaMax("");
    onOpenChange(false);
  }

  const step1Valid = titulo.trim() && area && tipoContrato && nivel;

  // Dynamic list helpers
  const addItem = (list: string[], setList: (v: string[]) => void) => setList([...list, ""]);
  const removeItem = (list: string[], setList: (v: string[]) => void, i: number) =>
    setList(list.filter((_, idx) => idx !== i));
  const updateItem = (list: string[], setList: (v: string[]) => void, i: number, val: string) =>
    setList(list.map((v, idx) => (idx === i ? val : v)));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nova Vaga — Etapa {step} de 2
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {step === 1 ? "Dados da vaga" : "Perfil e requisitos"}
          </p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Título da vaga *</Label>
              <Select value={titulo} onValueChange={(v) => {
                const autoNivel = v.includes("Jr") ? "jr"
                  : (v.includes("Pl") || v.includes("Pleno")) ? "pl"
                  : (v.includes("Sr") || v.includes("Sênior")) ? "sr"
                  : v.includes("Coord") ? "coordenacao"
                  : ["CEO","COO","CFO","CMO","CPO","CTO","CHRO"].some(c => v.includes(c)) ? "c-level"
                  : nivel;
                setTitulo(v);
                setNivel(autoNivel);
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                <SelectContent>
                  {cargos.map((c) => (
                    <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Não encontrou o cargo? Verifique Parâmetros → CLT → Cargos / Funções
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área *</Label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {departamentos.map((d) => (
                      <SelectItem key={d.id} value={d.valor}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de contrato *</Label>
                <Select value={tipoContrato} onValueChange={setTipoContrato}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clt">CLT</SelectItem>
                    <SelectItem value="pj">PJ</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível *</Label>
                <Select value={nivel} onValueChange={setNivel}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {NIVEIS.map((n) => (
                      <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gestor responsável</Label>
                <Select value={gestorId} onValueChange={setGestorId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {gestores.map((g) => (
                      <SelectItem key={g.id} value={g.user_id}>{g.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Local de trabalho</Label>
                <Select value={localTrabalho} onValueChange={setLocalTrabalho}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {locais.map((l) => (
                      <SelectItem key={l.id} value={l.valor}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vigência até</Label>
                <Input type="date" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Jornada</Label>
              <Select value={jornada} onValueChange={setJornada}>
                <SelectTrigger><SelectValue placeholder="Selecione a jornada" /></SelectTrigger>
                <SelectContent>
                  {jornadas.map((j) => (
                    <SelectItem key={j.id} value={j.valor}>{j.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Benefícios</Label>
              <div className="flex flex-wrap gap-2">
                {beneficiosParam.map((b) => {
                  const selected = beneficiosIds.includes(b.valor);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        setBeneficiosIds(selected
                          ? beneficiosIds.filter((v) => v !== b.valor)
                          : [...beneficiosIds, b.valor])
                      }
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                        selected
                          ? "border-transparent text-white"
                          : "border-border text-muted-foreground bg-background hover:bg-muted"
                      )}
                      style={selected ? { backgroundColor: "#C2185B" } : undefined}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
              <Input
                value={beneficiosOutros}
                onChange={(e) => setBeneficiosOutros(e.target.value)}
                placeholder="Outros benefícios não listados"
                className="mt-2"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>
                Avançar <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Missão da posição</Label>
              <Textarea value={missao} onChange={(e) => setMissao(e.target.value)}
                placeholder="O que essa pessoa vai resolver de verdade por aqui?" rows={3} />
            </div>

            {/* Responsabilidades */}
            <div className="space-y-2">
              <Label>Responsabilidades</Label>
              {responsabilidades.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={r} onChange={(e) => updateItem(responsabilidades, setResponsabilidades, i, e.target.value)}
                    placeholder={`Responsabilidade ${i + 1}`} />
                  {responsabilidades.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(responsabilidades, setResponsabilidades, i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addItem(responsabilidades, setResponsabilidades)}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>

            {/* Skills obrigatórias */}
            <div className="space-y-2">
              <Label>Skills obrigatórias</Label>
              <div className="flex flex-wrap gap-2">
                {skillsCatalogo.map((s) => (
                  <Button key={s} variant={skillsObrigatorias.includes(s) ? "default" : "outline"} size="sm"
                    className="text-xs h-7"
                    onClick={() => setSkillsObrigatorias(
                      skillsObrigatorias.includes(s)
                        ? skillsObrigatorias.filter((x) => x !== s)
                        : [...skillsObrigatorias, s]
                    )}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {/* Skills desejadas */}
            <div className="space-y-2">
              <Label>Skills desejadas</Label>
              <div className="flex flex-wrap gap-2">
                {skillsCatalogo.filter((s) => !skillsObrigatorias.includes(s)).map((s) => (
                  <Button key={s} variant={skillsDesejadas.includes(s) ? "secondary" : "outline"} size="sm"
                    className="text-xs h-7"
                    onClick={() => setSkillsDesejadas(
                      skillsDesejadas.includes(s)
                        ? skillsDesejadas.filter((x) => x !== s)
                        : [...skillsDesejadas, s]
                    )}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {/* Ferramentas */}
            <div className="space-y-2">
              <Label>Ferramentas / Sistemas</Label>
              <div className="flex flex-wrap gap-2">
                {[...ferramentasParam, ...sistemasParam].map((f) => {
                  const selected = ferramentasIds.includes(f.valor);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setFerramentasIds(selected
                          ? ferramentasIds.filter((v) => v !== f.valor)
                          : [...ferramentasIds, f.valor])
                      }
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                        selected
                          ? "border-transparent text-white"
                          : "border-border text-muted-foreground bg-background hover:bg-muted"
                      )}
                      style={selected ? { backgroundColor: "#5E35B1" } : undefined}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <Input
                value={ferramentasOutras}
                onChange={(e) => setFerramentasOutras(e.target.value)}
                placeholder="Outras ferramentas não listadas"
                className="mt-2"
              />
            </div>

            {/* Faixa salarial — only for super_admin and admin_rh */}
            {canSeeFaixa && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Faixa salarial mín.</Label>
                    <Input type="number" value={faixaMin} onChange={(e) => setFaixaMin(e.target.value)} placeholder="R$" />
                  </div>
                  <div className="space-y-2">
                    <Label>Faixa salarial máx.</Label>
                    <Input type="number" value={faixaMax} onChange={(e) => setFaixaMax(e.target.value)} placeholder="R$" />
                  </div>
                </div>

                {faixasPCS ? (
                  <div className="border rounded-md p-3 bg-muted/30 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Tabela PCS — {titulo} ({tipoContrato.toUpperCase()})</p>
                    {[
                      { key: "F1", label: "Entrada", min: faixasPCS.f1_min, max: faixasPCS.f1_max },
                      { key: "F2", label: "Desenvolvimento", min: faixasPCS.f2_min, max: faixasPCS.f2_max },
                      { key: "F3", label: "Pleno", min: faixasPCS.f3_min, max: faixasPCS.f3_max },
                      { key: "F4", label: "Sênior", min: faixasPCS.f4_min, max: faixasPCS.f4_max },
                      { key: "F5", label: "Referência", min: faixasPCS.f5_min, max: faixasPCS.f5_max },
                    ].map((f) => (
                      <div key={f.key} className="flex items-center text-xs gap-2">
                        <span className="font-semibold w-8">{f.key}</span>
                        <span className="text-muted-foreground w-28">· {f.label}</span>
                        <span>R$ {Number(f.min).toLocaleString("pt-BR")} – R$ {Number(f.max).toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-2">
                      Pré-preenchido com F1 (entrada recomendada). Edite se necessário.
                    </p>
                  </div>
                ) : titulo && tipoContrato && tipoContrato !== "ambos" ? (
                  <p className="text-xs text-muted-foreground">
                    Cargo sem faixa no PPR. Preencha manualmente.
                  </p>
                ) : null}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Vaga
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
