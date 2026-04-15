import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParametros } from "@/hooks/useParametros";
import { useCargos, type Cargo } from "@/hooks/useCargos";
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
  const { data: cargosData = [] } = useCargos();

  // Auto-fill faixa from cargos table
  useEffect(() => {
    if (!titulo || !tipoContrato) return;
    const cargoMatch = cargosData.find((c) => c.nome === titulo);
    if (!cargoMatch) return;
    const tipo = tipoContrato === "pj" ? "pj" : "clt";
    const f1Min = (cargoMatch as any)[`faixa_${tipo}_f1_min`];
    const f1Max = (cargoMatch as any)[`faixa_${tipo}_f1_max`];
    if (f1Min != null) setFaixaMin(String(f1Min));
    if (f1Max != null) setFaixaMax(String(f1Max));
  }, [titulo, tipoContrato, cargosData]);

  const skillsCatalogo = SKILLS_CATALOGO;

  const { data: gestores = [] } = useQuery({
    queryKey: ["gestores-para-vaga"],
    queryFn: async () => {
      const { data: clt } = await supabase
        .from("colaboradores_clt")
        .select("id, nome_completo, cargo, departamento")
        .eq("status", "ativo")
        .order("nome_completo");
      const { data: pj } = await supabase
        .from("contratos_pj")
        .select("id, contato_nome, tipo_servico, departamento")
        .eq("status", "ativo")
        .order("contato_nome");
      const todos = [
        ...(clt ?? []).map((c) => ({ id: c.id, nome: c.nome_completo, cargo: c.cargo, tipo: "CLT" as const })),
        ...(pj ?? []).map((c) => ({ id: c.id, nome: c.contato_nome, cargo: c.tipo_servico, tipo: "PJ" as const })),
      ];
      return todos.sort((a, b) => a.nome.localeCompare(b.nome));
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
                setTitulo(v);
                // Auto-fill from cargo data
                const cargoMatch = cargosData.find((c) => c.nome === v);
                if (cargoMatch) {
                  const autoNivel = cargoMatch.nivel;
                  setNivel(autoNivel);
                  // Auto-fill Job Description & Skills from cargo
                  if (cargoMatch.missao) setMissao(cargoMatch.missao);
                  if (cargoMatch.responsabilidades?.length) setResponsabilidades(cargoMatch.responsabilidades);
                  if (cargoMatch.skills_obrigatorias?.length) setSkillsObrigatorias(cargoMatch.skills_obrigatorias);
                  if (cargoMatch.skills_desejadas?.length) setSkillsDesejadas(cargoMatch.skills_desejadas);
                  if (cargoMatch.ferramentas?.length) {
                    // Match ferramentas labels to param valores
                    const matchedIds = [...ferramentasParam, ...sistemasParam]
                      .filter((p) => cargoMatch.ferramentas.includes(p.label))
                      .map((p) => p.valor);
                    if (matchedIds.length) setFerramentasIds(matchedIds);
                    const unmatched = cargoMatch.ferramentas.filter(
                      (f) => ![...ferramentasParam, ...sistemasParam].some((p) => p.label === f)
                    );
                    if (unmatched.length) setFerramentasOutras(unmatched.join(", "));
                  }
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                <SelectContent>
                  {cargosData.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Não encontrou o cargo? Cadastre em Admin → Cargos e Salários
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
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome}{g.cargo ? ` — ${g.cargo}` : ""}{" "}
                        <span className="text-muted-foreground text-xs">({g.tipo})</span>
                      </SelectItem>
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
              {skillsObrigatorias.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {skillsObrigatorias.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: "#1A4A3A" }}>
                      {s}
                      <button type="button" onClick={() => setSkillsObrigatorias(skillsObrigatorias.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {skillsCatalogo.filter((s) => !skillsObrigatorias.includes(s) && !skillsDesejadas.includes(s)).map((s) => (
                  <button key={s} type="button"
                    onClick={() => setSkillsObrigatorias([...skillsObrigatorias, s])}
                    className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer border-border text-muted-foreground bg-background hover:bg-muted"
                  >{s}</button>
                ))}
              </div>
              <Input
                placeholder="Adicionar skill personalizada (Enter)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val && !skillsObrigatorias.includes(val)) {
                      setSkillsObrigatorias([...skillsObrigatorias, val]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
            </div>

            {/* Skills desejadas */}
            <div className="space-y-2">
              <Label>Skills desejadas</Label>
              {skillsDesejadas.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {skillsDesejadas.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: "#1A6BBF" }}>
                      {s}
                      <button type="button" onClick={() => setSkillsDesejadas(skillsDesejadas.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {skillsCatalogo.filter((s) => !skillsObrigatorias.includes(s) && !skillsDesejadas.includes(s)).map((s) => (
                  <button key={s} type="button"
                    onClick={() => setSkillsDesejadas([...skillsDesejadas, s])}
                    className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer border-border text-muted-foreground bg-background hover:bg-muted"
                  >{s}</button>
                ))}
              </div>
              <Input
                placeholder="Adicionar skill personalizada (Enter)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val && !skillsDesejadas.includes(val)) {
                      setSkillsDesejadas([...skillsDesejadas, val]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
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

                {(() => {
                  const cargoMatch = cargosData.find((c) => c.nome === titulo);
                  const tipo = tipoContrato === "pj" ? "pj" : "clt";
                  const hasFaixa = cargoMatch && (cargoMatch as any)[`faixa_${tipo}_f1_min`] != null;
                  if (hasFaixa) {
                    return (
                      <div className="border rounded-md p-3 bg-muted/30 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Tabela PPR — {titulo} ({tipoContrato.toUpperCase()})</p>
                        {["F1","F2","F3","F4","F5"].map((fk, i) => {
                          const labels = ["Entrada","Desenvolvimento","Pleno","Sênior","Referência"];
                          const min = (cargoMatch as any)[`faixa_${tipo}_${fk.toLowerCase()}_min`];
                          const max = (cargoMatch as any)[`faixa_${tipo}_${fk.toLowerCase()}_max`];
                          return (
                            <div key={fk} className="flex items-center text-xs gap-2">
                              <span className="font-semibold w-8">{fk}</span>
                              <span className="text-muted-foreground w-28">· {labels[i]}</span>
                              <span>R$ {Number(min || 0).toLocaleString("pt-BR")} – R$ {Number(max || 0).toLocaleString("pt-BR")}</span>
                            </div>
                          );
                        })}
                        <p className="text-xs text-muted-foreground mt-2">
                          Pré-preenchido com F1 (entrada recomendada). Edite se necessário.
                        </p>
                      </div>
                    );
                  }
                  if (titulo && tipoContrato && tipoContrato !== "ambos") {
                    return <p className="text-xs text-muted-foreground">Cargo sem faixa no PPR. Preencha manualmente.</p>;
                  }
                  return null;
                })()}
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
