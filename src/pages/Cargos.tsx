import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAllCargos, type Cargo } from "@/hooks/useCargos";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Plus, Search, Trash2, Save, Loader2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const nivelLabels: Record<string, string> = {
  jr: "Júnior", pl: "Pleno", sr: "Sênior",
  coordenacao: "Coordenação", especialista: "Especialista", c_level: "C-Level",
};
const tipoLabels: Record<string, string> = {
  clt: "CLT", pj: "PJ", ambos: "CLT + PJ",
};

function fmt(val: number | null) {
  if (val == null) return "—";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

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

const FERRAMENTAS_CATALOGO = [
  "Figma","Adobe Creative Suite","Slack","Jira","Confluence","Google Workspace",
  "Microsoft 365","Notion","Miro","Trello","HubSpot","Salesforce","SAP",
  "TOTVS","Power BI","Tableau","Excel Avançado","VS Code","GitHub","Docker",
];

/* ─── Drawer Component ─── */
function CargoDrawer({ cargo, onClose }: { cargo: Cargo; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Job Description state
  const [missao, setMissao] = useState(cargo.missao || "");
  const [responsabilidades, setResponsabilidades] = useState<string[]>(
    cargo.responsabilidades?.length ? cargo.responsabilidades : [""]
  );

  // Skills state
  const [skillsObrigatorias, setSkillsObrigatorias] = useState<string[]>(cargo.skills_obrigatorias || []);
  const [skillsDesejadas, setSkillsDesejadas] = useState<string[]>(cargo.skills_desejadas || []);
  const [ferramentas, setFerramentas] = useState<string[]>(cargo.ferramentas || []);

  const saveJobDescription = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("cargos")
      .update({
        missao: missao || null,
        responsabilidades: responsabilidades.filter(Boolean),
      } as any)
      .eq("id", cargo.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Job Description salva");
    queryClient.invalidateQueries({ queryKey: ["cargos"] });
  };

  const saveSkills = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("cargos")
      .update({
        skills_obrigatorias: skillsObrigatorias,
        skills_desejadas: skillsDesejadas,
        ferramentas,
      } as any)
      .eq("id", cargo.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Skills salvas");
    queryClient.invalidateQueries({ queryKey: ["cargos"] });
  };

  const faixas = [
    { key: "F1", label: "Entrada" },
    { key: "F2", label: "Desenvolvimento" },
    { key: "F3", label: "Pleno" },
    { key: "F4", label: "Sênior" },
    { key: "F5", label: "Referência" },
  ];

  const toggleBadge = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  return (
    <Sheet open onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {cargo.nome}
            {cargo.protege_salario && (
              <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0">
                <Lock className="h-3 w-3" /> Protegido
              </Badge>
            )}
          </SheetTitle>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{nivelLabels[cargo.nivel] || cargo.nivel}</Badge>
            <Badge variant="secondary" className="text-xs">{cargo.departamento || "—"}</Badge>
            <Badge variant="secondary" className="text-xs">{tipoLabels[cargo.tipo_contrato]}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="remuneracao" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="remuneracao" className="flex-1">Remuneração</TabsTrigger>
            <TabsTrigger value="jd" className="flex-1">Job Description</TabsTrigger>
            <TabsTrigger value="skills" className="flex-1">Skills</TabsTrigger>
          </TabsList>

          {/* Tab: Remuneração */}
          <TabsContent value="remuneracao" className="space-y-4 mt-4">
            {cargo.tipo_contrato !== "pj" && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Faixas CLT</h4>
                <div className="border rounded-md divide-y text-sm">
                  {faixas.map((f) => {
                    const min = (cargo as any)[`faixa_clt_${f.key.toLowerCase()}_min`];
                    const max = (cargo as any)[`faixa_clt_${f.key.toLowerCase()}_max`];
                    return (
                      <div key={f.key} className="flex items-center px-3 py-2 gap-2">
                        <span className="font-semibold w-8 text-xs">{f.key}</span>
                        <span className="text-muted-foreground text-xs w-28">{f.label}</span>
                        <span className="text-xs tabular-nums">{fmt(min)} – {fmt(max)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {cargo.tipo_contrato !== "clt" && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Faixas PJ</h4>
                <div className="border rounded-md divide-y text-sm">
                  {faixas.map((f) => {
                    const min = (cargo as any)[`faixa_pj_${f.key.toLowerCase()}_min`];
                    const max = (cargo as any)[`faixa_pj_${f.key.toLowerCase()}_max`];
                    return (
                      <div key={f.key} className="flex items-center px-3 py-2 gap-2">
                        <span className="font-semibold w-8 text-xs">{f.key}</span>
                        <span className="text-muted-foreground text-xs w-28">{f.label}</span>
                        <span className="text-xs tabular-nums">{fmt(min)} – {fmt(max)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab: Job Description */}
          <TabsContent value="jd" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Missão</Label>
              <Textarea
                value={missao}
                onChange={(e) => setMissao(e.target.value)}
                placeholder="O que essa pessoa vai resolver de verdade por aqui?"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Responsabilidades</Label>
              {responsabilidades.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={r}
                    onChange={(e) => {
                      const copy = [...responsabilidades];
                      copy[i] = e.target.value;
                      setResponsabilidades(copy);
                    }}
                    placeholder={`Responsabilidade ${i + 1}`}
                  />
                  {responsabilidades.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setResponsabilidades(responsabilidades.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setResponsabilidades([...responsabilidades, ""])}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
            <Button onClick={saveJobDescription} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Job Description
            </Button>
          </TabsContent>

          {/* Tab: Skills */}
          <TabsContent value="skills" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Skills Obrigatórias</Label>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS_CATALOGO.map((s) => {
                  const selected = skillsObrigatorias.includes(s);
                  return (
                    <button key={s} type="button"
                      onClick={() => toggleBadge(skillsObrigatorias, setSkillsObrigatorias, s)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                        selected ? "border-transparent text-white bg-emerald-700" : "border-border text-muted-foreground bg-background hover:bg-muted"
                      }`}
                    >{s}</button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Skills Desejadas</Label>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS_CATALOGO.filter((s) => !skillsObrigatorias.includes(s)).map((s) => {
                  const selected = skillsDesejadas.includes(s);
                  return (
                    <button key={s} type="button"
                      onClick={() => toggleBadge(skillsDesejadas, setSkillsDesejadas, s)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                        selected ? "border-transparent text-white bg-blue-600" : "border-border text-muted-foreground bg-background hover:bg-muted"
                      }`}
                    >{s}</button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ferramentas / Sistemas</Label>
              <div className="flex flex-wrap gap-1.5">
                {FERRAMENTAS_CATALOGO.map((f) => {
                  const selected = ferramentas.includes(f);
                  return (
                    <button key={f} type="button"
                      onClick={() => toggleBadge(ferramentas, setFerramentas, f)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                        selected ? "border-transparent text-white bg-purple-600" : "border-border text-muted-foreground bg-background hover:bg-muted"
                      }`}
                    >{f}</button>
                  );
                })}
              </div>
            </div>
            <Button onClick={saveSkills} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Skills
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Main Page ─── */
export default function Cargos() {
  const navigate = useNavigate();
  const { data: cargos, isLoading } = useAllCargos();
  const [search, setSearch] = useState("");
  const [filtroDepartamento, setFiltroDepartamento] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [selected, setSelected] = useState<Cargo | null>(null);

  const departamentos = useMemo(() => {
    if (!cargos) return [];
    const set = new Set(cargos.map((c) => c.departamento).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [cargos]);

  const filtered = useMemo(() => {
    if (!cargos) return [];
    return cargos.filter((c) => {
      if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false;
      if (filtroDepartamento !== "todos" && c.departamento !== filtroDepartamento) return false;
      if (filtroTipo !== "todos" && c.tipo_contrato !== filtroTipo) return false;
      return true;
    });
  }, [cargos, search, filtroDepartamento, filtroTipo]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cargos e Salários</h1>
          <p className="text-sm text-muted-foreground">Plano de Posições e Remuneração</p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/cargos/novo")}>
          <Plus className="h-4 w-4" /> Novo Cargo
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cargo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroDepartamento} onValueChange={setFiltroDepartamento}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Departamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {departamentos.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="clt">CLT</SelectItem>
            <SelectItem value="pj">PJ</SelectItem>
            <SelectItem value="ambos">Ambos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Faixa F1 (CLT)</TableHead>
              <TableHead className="text-right">Faixa F1 (PJ)</TableHead>
              <TableHead className="text-center">C-Level</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum cargo encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((cargo) => (
                <TableRow key={cargo.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(cargo)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {cargo.nome}
                      {cargo.protege_salario && (
                        <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0">
                          <Lock className="h-3 w-3" /> Protegido
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{nivelLabels[cargo.nivel] || cargo.nivel}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{cargo.departamento || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{tipoLabels[cargo.tipo_contrato] || cargo.tipo_contrato}</Badge></TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {cargo.faixa_clt_f1_min != null ? `${fmt(cargo.faixa_clt_f1_min)} – ${fmt(cargo.faixa_clt_f1_max)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {cargo.faixa_pj_f1_min != null ? `${fmt(cargo.faixa_pj_f1_min)} – ${fmt(cargo.faixa_pj_f1_max)}` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {cargo.is_clevel ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">C-Level</Badge>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={cargo.ativo ? "default" : "secondary"} className="text-[10px]">
                      {cargo.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} cargo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

      {selected && <CargoDrawer cargo={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
