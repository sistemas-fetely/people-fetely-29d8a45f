import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParametros } from "@/hooks/useParametros";
import { useCargos, type Cargo } from "@/hooks/useCargos";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useSkillsCatalogo, salvarNovaSkill } from "@/hooks/useSkillsCatalogo";
import { useFerramentasCatalogo, salvarNovaFerramenta } from "@/hooks/useFerramentasCatalogo";
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
  const [ferramentasSelecionadas, setFerramentasSelecionadas] = useState<string[]>([]);
  const [novaFerramenta, setNovaFerramenta] = useState("");
  const [faixaMin, setFaixaMin] = useState("");
  const [faixaMax, setFaixaMax] = useState("");
  const [novaSkillObrig, setNovaSkillObrig] = useState("");
  const [novaSkillDesej, setNovaSkillDesej] = useState("");

  const { data: departamentos = [] } = useParametros("departamento");
  const { data: locais = [] } = useParametros("local_trabalho");
  const { data: jornadas = [] } = useParametros("jornada");
  const { data: beneficiosParam = [] } = useParametros("beneficio");
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

  // Skills from database
  const niveisMap: Record<string, string> = {
    jr: "jr", pl: "pl", sr: "sr",
    coordenacao: "coordenacao", especialista: "especialista", "c-level": "c_level"
  };
  const nivelNormalizado = niveisMap[nivel] || "todos";

  const { data: skillsCatalogo = [] } = useSkillsCatalogo(area || undefined, nivelNormalizado !== "todos" ? nivelNormalizado : undefined);

  const skillsPorNivel = {
    especificas: skillsCatalogo.filter(s => s.nivel === nivelNormalizado && s.nivel !== "todos"),
    gerais: skillsCatalogo.filter(s => s.nivel === "todos"),
  };

  // Ferramentas from database
  const { data: ferramentasCatalogo = [] } = useFerramentasCatalogo(area || undefined);
  const ferramentasEspecificas = ferramentasCatalogo.filter(f => f.area !== "todos");
  const ferramentasTransversais = ferramentasCatalogo.filter(f => f.area === "todos");

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
        ferramentas: ferramentasSelecionadas,
        ferramentas_ids: ferramentasSelecionadas.length > 0 ? ferramentasSelecionadas : null,
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
    setSkillsObrigatorias([]); setSkillsDesejadas([]);
    setFerramentasSelecionadas([]); setNovaFerramenta("");
    setFaixaMin(""); setFaixaMax("");
    setNovaSkillObrig(""); setNovaSkillDesej("");
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
                const cargoMatch = cargosData.find((c) => c.nome === v);
                if (cargoMatch) {
                  const autoNivel = cargoMatch.nivel;
                  setNivel(autoNivel);
                  if (cargoMatch.missao) setMissao(cargoMatch.missao);
                  if (cargoMatch.responsabilidades?.length) setResponsabilidades(cargoMatch.responsabilidades);
                  if (cargoMatch.skills_obrigatorias?.length) setSkillsObrigatorias(cargoMatch.skills_obrigatorias);
                  if (cargoMatch.skills_desejadas?.length) setSkillsDesejadas(cargoMatch.skills_desejadas);
                  if (cargoMatch.ferramentas?.length) {
                    setFerramentasSelecionadas(cargoMatch.ferramentas);
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
              <Label className="text-sm font-medium">Responsabilidades</Label>
              <p className="text-xs text-muted-foreground">Liste as principais atividades desta posição</p>
              {responsabilidades.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-[#1A4A3A] flex-shrink-0" />
                  <Input
                    value={r}
                    onChange={(e) => updateItem(responsabilidades, setResponsabilidades, i, e.target.value)}
                    placeholder={`Responsabilidade ${i + 1}`}
                    className="flex-1 border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#1A4A3A] bg-transparent"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => removeItem(responsabilidades, setResponsabilidades, i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-[#1A4A3A] hover:text-[#1A4A3A] hover:bg-[#1A4A3A]/5 pl-0 mt-1"
                onClick={() => addItem(responsabilidades, setResponsabilidades)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar responsabilidade
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

              {area && nivel && skillsCatalogo.length > 0 && (
                <div className="space-y-2">
                  {skillsPorNivel.especificas.filter(s =>
                    !skillsObrigatorias.includes(s.skill) && !skillsDesejadas.includes(s.skill)
                  ).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Sugeridas para {NIVEIS.find(n => n.value === nivel)?.label} em {area}:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {skillsPorNivel.especificas
                          .filter(s => !skillsObrigatorias.includes(s.skill) && !skillsDesejadas.includes(s.skill))
                          .map(s => (
                            <button key={s.id} type="button"
                              onClick={() => setSkillsObrigatorias([...skillsObrigatorias, s.skill])}
                              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer border-[#1A4A3A]/30 text-[#1A4A3A] bg-[#1A4A3A]/5 hover:bg-[#1A4A3A]/10">
                              + {s.skill}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {skillsPorNivel.gerais.filter(s =>
                    !skillsObrigatorias.includes(s.skill) && !skillsDesejadas.includes(s.skill)
                  ).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Gerais de {area}:</p>
                      <div className="flex flex-wrap gap-1">
                        {skillsPorNivel.gerais
                          .filter(s => !skillsObrigatorias.includes(s.skill) && !skillsDesejadas.includes(s.skill))
                          .map(s => (
                            <button key={s.id} type="button"
                              onClick={() => setSkillsObrigatorias([...skillsObrigatorias, s.skill])}
                              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer border-border text-muted-foreground bg-background hover:bg-muted">
                              + {s.skill}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar skill personalizada"
                  value={novaSkillObrig}
                  onChange={(e) => setNovaSkillObrig(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = novaSkillObrig.trim();
                      if (val && !skillsObrigatorias.includes(val)) {
                        setSkillsObrigatorias([...skillsObrigatorias, val]);
                        if (area) await salvarNovaSkill(val, area, nivelNormalizado, "obrigatoria");
                        setNovaSkillObrig("");
                      }
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" className="shrink-0"
                  onClick={async () => {
                    const val = novaSkillObrig.trim();
                    if (val && !skillsObrigatorias.includes(val)) {
                      setSkillsObrigatorias([...skillsObrigatorias, val]);
                      if (area) await salvarNovaSkill(val, area, nivelNormalizado, "obrigatoria");
                      setNovaSkillObrig("");
                    }
                  }}>
                  Confirmar
                </Button>
              </div>
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

              {area && nivel && skillsCatalogo.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {skillsCatalogo
                    .filter(s =>
                      (s.tipo === "desejada" || s.tipo === "ambos") &&
                      !skillsObrigatorias.includes(s.skill) &&
                      !skillsDesejadas.includes(s.skill)
                    )
                    .map(s => (
                      <button key={s.id} type="button"
                        onClick={() => setSkillsDesejadas([...skillsDesejadas, s.skill])}
                        className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
                        + {s.skill}
                      </button>
                    ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar skill personalizada"
                  value={novaSkillDesej}
                  onChange={(e) => setNovaSkillDesej(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = novaSkillDesej.trim();
                      if (val && !skillsDesejadas.includes(val)) {
                        setSkillsDesejadas([...skillsDesejadas, val]);
                        if (area) await salvarNovaSkill(val, area, nivelNormalizado, "desejada");
                        setNovaSkillDesej("");
                      }
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" className="shrink-0"
                  onClick={async () => {
                    const val = novaSkillDesej.trim();
                    if (val && !skillsDesejadas.includes(val)) {
                      setSkillsDesejadas([...skillsDesejadas, val]);
                      if (area) await salvarNovaSkill(val, area, nivelNormalizado, "desejada");
                      setNovaSkillDesej("");
                    }
                  }}>
                  Confirmar
                </Button>
              </div>
            </div>

            {/* Ferramentas / Sistemas */}
            <div className="space-y-2">
              <Label>Ferramentas / Sistemas</Label>

              {/* Tags selecionadas */}
              {ferramentasSelecionadas.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {ferramentasSelecionadas.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: "#5E35B1" }}>
                      {f}
                      <button type="button" onClick={() => setFerramentasSelecionadas(ferramentasSelecionadas.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Sugestões específicas da área */}
              {ferramentasEspecificas.filter(f => !ferramentasSelecionadas.includes(f.ferramenta)).length > 0 && (
                <div>
                  {area && (
                    <p className="text-xs text-muted-foreground mb-1">Usadas em {area}:</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {ferramentasEspecificas
                      .filter(f => !ferramentasSelecionadas.includes(f.ferramenta))
                      .map(f => (
                        <button key={f.id} type="button"
                          onClick={() => setFerramentasSelecionadas([...ferramentasSelecionadas, f.ferramenta])}
                          className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100">
                          + {f.ferramenta}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Ferramentas transversais */}
              {ferramentasTransversais.filter(f => !ferramentasSelecionadas.includes(f.ferramenta)).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ferramentas gerais:</p>
                  <div className="flex flex-wrap gap-1">
                    {ferramentasTransversais
                      .filter(f => !ferramentasSelecionadas.includes(f.ferramenta))
                      .map(f => (
                        <button key={f.id} type="button"
                          onClick={() => setFerramentasSelecionadas([...ferramentasSelecionadas, f.ferramenta])}
                          className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer border-border text-muted-foreground bg-background hover:bg-muted">
                          + {f.ferramenta}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Input nova ferramenta */}
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar ferramenta personalizada"
                  value={novaFerramenta}
                  onChange={(e) => setNovaFerramenta(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = novaFerramenta.trim();
                      if (val && !ferramentasSelecionadas.includes(val)) {
                        setFerramentasSelecionadas([...ferramentasSelecionadas, val]);
                        await salvarNovaFerramenta(val, area || "todos");
                        setNovaFerramenta("");
                      }
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" className="shrink-0"
                  onClick={async () => {
                    const val = novaFerramenta.trim();
                    if (val && !ferramentasSelecionadas.includes(val)) {
                      setFerramentasSelecionadas([...ferramentasSelecionadas, val]);
                      await salvarNovaFerramenta(val, area || "todos");
                      setNovaFerramenta("");
                    }
                  }}>
                  Confirmar
                </Button>
              </div>
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
