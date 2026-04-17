import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProcessosCategorias } from "@/hooks/useProcessosCategorias";
import { NovaCategoriaDialog } from "@/components/templates/NovaCategoriaDialog";
import { getProcessoIcon } from "@/lib/processo-icones";

interface CountsRow {
  categoria_id: string;
  tarefas_padrao: number;
  total_personalizacoes: number;
  por_cargo: number;
  por_departamento: number;
  por_sistema: number;
}

export default function Processos() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const podeEditar = roles?.some((r) => ["super_admin", "admin_rh"].includes(r));

  const { categorias, loading, recarregar } = useProcessosCategorias();
  const [counts, setCounts] = useState<Record<string, CountsRow>>({});
  const [openNovo, setOpenNovo] = useState(false);

  const carregarCounts = useCallback(async () => {
    if (categorias.length === 0) return;
    const ids = categorias.map((c) => c.id);

    // tarefas padrao via templates → tarefas
    const { data: templates } = await supabase
      .from("sncf_templates_processos")
      .select("id, categoria_id")
      .in("categoria_id", ids);

    const templatesByCat = new Map<string, string[]>();
    (templates ?? []).forEach((t: any) => {
      if (!t.categoria_id) return;
      if (!templatesByCat.has(t.categoria_id)) templatesByCat.set(t.categoria_id, []);
      templatesByCat.get(t.categoria_id)!.push(t.id);
    });

    const allTemplateIds = (templates ?? []).map((t: any) => t.id);
    let tarefasByTemplate: Record<string, number> = {};
    if (allTemplateIds.length > 0) {
      const { data: ts } = await supabase
        .from("sncf_templates_tarefas")
        .select("template_id")
        .in("template_id", allTemplateIds);
      (ts ?? []).forEach((row: any) => {
        tarefasByTemplate[row.template_id] = (tarefasByTemplate[row.template_id] || 0) + 1;
      });
    }

    // extensoes
    const { data: exts } = await (supabase as any)
      .from("sncf_template_extensoes")
      .select("id, categoria_id, dimensao")
      .in("categoria_id", ids)
      .eq("ativo", true);

    const newCounts: Record<string, CountsRow> = {};
    categorias.forEach((c) => {
      const tplIds = templatesByCat.get(c.id) ?? [];
      const tarefas = tplIds.reduce((sum, id) => sum + (tarefasByTemplate[id] || 0), 0);
      const porCargo = (exts ?? []).filter((e: any) => e.categoria_id === c.id && e.dimensao === "cargo").length;
      const porDepto = (exts ?? []).filter((e: any) => e.categoria_id === c.id && e.dimensao === "departamento").length;
      const porSist = (exts ?? []).filter((e: any) => e.categoria_id === c.id && e.dimensao === "sistema").length;
      newCounts[c.id] = {
        categoria_id: c.id,
        tarefas_padrao: tarefas,
        total_personalizacoes: porCargo + porDepto + porSist,
        por_cargo: porCargo,
        por_departamento: porDepto,
        por_sistema: porSist,
      };
    });
    setCounts(newCounts);
  }, [categorias]);

  useEffect(() => {
    void carregarCounts();
  }, [carregarCounts]);

  const ordenadas = useMemo(
    () => [...categorias].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome)),
    [categorias],
  );

  if (!podeEditar) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground mt-1">Apenas Admin RH e Super Admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleNovoSaved = async () => {
    await recarregar();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1A4A3A" }}>
            Processos da Fetely
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure como cada processo da empresa funciona
          </p>
        </div>
        <Button
          onClick={() => setOpenNovo(true)}
          className="gap-2"
          style={{ backgroundColor: "#1A4A3A" }}
        >
          <Plus className="h-4 w-4" /> Novo Processo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : ordenadas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-sm">Nenhum processo cadastrado.</p>
            <p className="text-xs mt-1">Clique em "Novo Processo" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {ordenadas.map((c) => {
            const Icon = getProcessoIcon(c.icone);
            const ct = counts[c.id];
            const personalizacoesTexto =
              ct && ct.total_personalizacoes > 0
                ? `${ct.total_personalizacoes} personalizaç${ct.total_personalizacoes === 1 ? "ão" : "ões"} (${
                    [
                      ct.por_cargo > 0 ? `${ct.por_cargo} cargo${ct.por_cargo === 1 ? "" : "s"}` : null,
                      ct.por_departamento > 0 ? `${ct.por_departamento} departamento${ct.por_departamento === 1 ? "" : "s"}` : null,
                      ct.por_sistema > 0 ? `${ct.por_sistema} sistema${ct.por_sistema === 1 ? "" : "s"}` : null,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  })`
                : "0 personalizações";
            const tarefasTexto = ct ? `${ct.tarefas_padrao} tarefa${ct.tarefas_padrao === 1 ? "" : "s"} padrão` : "—";
            return (
              <Card
                key={c.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/processos/${c.slug}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: c.cor ?? "#1A4A3A" }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{c.nome}</h3>
                    {c.descricao && (
                      <p className="text-sm text-muted-foreground truncate">{c.descricao}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {tarefasTexto} · {personalizacoesTexto}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1 shrink-0">
                    Configurar <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NovaCategoriaDialog
        open={openNovo}
        onOpenChange={setOpenNovo}
        categoria={null}
        onSaved={handleNovoSaved}
      />
    </div>
  );
}
