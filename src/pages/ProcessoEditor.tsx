import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useProcessoDetalhe } from "@/hooks/useProcessos";
import { useAllParametros } from "@/hooks/useParametros";
import { useUnidades } from "@/hooks/useUnidades";
import { useCargos } from "@/hooks/useCargos";
import { usePerfisV2 } from "@/hooks/usePerfisV2";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ProcessoEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();

  const isNovo = id === "novo";
  const { data: processo, isLoading } = useProcessoDetalhe(isNovo ? null : id || null);

  const { data: parametros } = useAllParametros();
  const { data: unidades } = useUnidades();
  const { data: cargos } = useCargos();
  const { data: perfis } = usePerfisV2();
  const { data: sistemas } = useQuery({
    queryKey: ["sncf-sistemas-ativos"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("sncf_sistemas")
        .select("id, nome")
        .eq("ativo", true)
        .order("ordem");
      return (data as any[]) || [];
    },
  });

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [narrativa, setNarrativa] = useState("");
  const [areaId, setAreaId] = useState("");
  const [natureza, setNatureza] = useState("guia");
  const [statusValor, setStatusValor] = useState("rascunho");
  const [ownerPerfil, setOwnerPerfil] = useState("");
  const [sensivel, setSensivel] = useState(false);

  const [tagsAreas, setTagsAreas] = useState<string[]>([]);
  const [tagsDeptos, setTagsDeptos] = useState<string[]>([]);
  const [tagsUnidades, setTagsUnidades] = useState<string[]>([]);
  const [tagsCargos, setTagsCargos] = useState<string[]>([]);
  const [tagsSistemas, setTagsSistemas] = useState<string[]>([]);
  const [tagsTiposColab, setTagsTiposColab] = useState<string[]>([]);

  const [salvando, setSalvando] = useState(false);
  const [publicarOpen, setPublicarOpen] = useState(false);
  const [motivoPublicacao, setMotivoPublicacao] = useState("");

  const areas = (parametros || []).filter((p) => p.categoria === "area_negocio" && p.ativo);
  const departamentos = (parametros || []).filter((p) => p.categoria === "departamento" && p.ativo);
  const naturezas = (parametros || []).filter((p) => p.categoria === "natureza_processo" && p.ativo);
  const statusOpcoes = (parametros || []).filter((p) => p.categoria === "status_processo" && p.ativo);

  useEffect(() => {
    if (!isNovo && processo) {
      setNome(processo.nome);
      setCodigo(processo.codigo);
      setDescricao(processo.descricao || "");
      setNarrativa(processo.narrativa || "");
      setAreaId(processo.area_negocio_id || "");
      setNatureza(processo.natureza_valor);
      setStatusValor(processo.status_valor);
      setOwnerPerfil(processo.owner_perfil_codigo || "");
      setSensivel(processo.sensivel);
      setTagsAreas(processo.tags_areas.map((t) => t.id));
      setTagsDeptos(processo.tags_departamentos.map((t) => t.id));
      setTagsUnidades(processo.tags_unidades.map((t) => t.id));
      setTagsCargos(processo.tags_cargos.map((t) => t.id));
      setTagsSistemas(processo.tags_sistemas.map((t) => t.id));
      setTagsTiposColab(processo.tags_tipos_colaborador);
    }
  }, [isNovo, processo]);

  const podeEditar =
    roles?.includes("super_admin") ||
    roles?.includes("admin_rh") ||
    (processo?.owner_user_id && processo.owner_user_id === user?.id);

  if (!isNovo && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isNovo && !processo) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-muted-foreground">Processo não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/processos")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  if (!isNovo && !podeEditar) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-muted-foreground">
          Você não tem permissão para editar este processo.
        </p>
        <Button variant="outline" onClick={() => navigate(`/processos/${id}`)} className="mt-4">
          Voltar ao detalhe
        </Button>
      </div>
    );
  }

  function toggleTag(arr: string[], setArr: (v: string[]) => void, itemId: string) {
    setArr(arr.includes(itemId) ? arr.filter((x) => x !== itemId) : [...arr, itemId]);
  }

  function gerarCodigo(s: string) {
    return s.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  }

  async function sincronizarTags(processoId: string) {
    const tabelas = [
      { table: "processos_tags_areas", col: "area_id", values: tagsAreas },
      { table: "processos_tags_departamentos", col: "departamento_id", values: tagsDeptos },
      { table: "processos_tags_unidades", col: "unidade_id", values: tagsUnidades },
      { table: "processos_tags_cargos", col: "cargo_id", values: tagsCargos },
      { table: "processos_tags_sistemas", col: "sistema_id", values: tagsSistemas },
    ];
    for (const { table, col, values } of tabelas) {
      await (supabase as any).from(table).delete().eq("processo_id", processoId);
      if (values.length > 0) {
        await (supabase as any)
          .from(table)
          .insert(values.map((v) => ({ processo_id: processoId, [col]: v })));
      }
    }
    await (supabase as any)
      .from("processos_tags_tipos_colaborador")
      .delete()
      .eq("processo_id", processoId);
    if (tagsTiposColab.length > 0) {
      await (supabase as any)
        .from("processos_tags_tipos_colaborador")
        .insert(tagsTiposColab.map((t) => ({ processo_id: processoId, tipo: t })));
    }
  }

  async function handleSalvar(publicarAgora: boolean) {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSalvando(true);
    try {
      let processoId = id;
      const codigoFinal = codigo.trim() || gerarCodigo(nome);

      const payload = {
        codigo: codigoFinal,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        narrativa: narrativa.trim() || null,
        area_negocio_id: areaId || null,
        natureza_valor: natureza,
        status_valor: statusValor,
        owner_perfil_codigo: ownerPerfil || null,
        owner_user_id: user?.id || null,
        sensivel,
      };

      if (isNovo) {
        const { data, error } = await (supabase as any)
          .from("processos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        processoId = (data as any).id;
      } else {
        const { error } = await (supabase as any)
          .from("processos")
          .update(payload)
          .eq("id", id!);
        if (error) throw error;
      }

      await sincronizarTags(processoId!);

      if (publicarAgora) {
        const { error } = await (supabase as any).rpc("processos_publicar_versao", {
          _processo_id: processoId,
          _motivo: motivoPublicacao.trim() || null,
        });
        if (error) throw error;
        toast.success("Processo publicado!");
      } else {
        toast.success(isNovo ? "Processo criado!" : "Alterações salvas");
      }

      queryClient.invalidateQueries({ queryKey: ["processos"] });
      queryClient.invalidateQueries({ queryKey: ["processo-detalhe", processoId] });
      navigate(`/processos/${processoId}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSalvando(false);
      setPublicarOpen(false);
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(isNovo ? "/processos" : `/processos/${id}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Cancelar
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSalvar(false)}
            disabled={salvando}
            className="gap-2"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" /> Salvar rascunho
          </Button>
          {!isNovo && (
            <Button
              onClick={() => setPublicarOpen(true)}
              disabled={salvando}
              className="gap-2"
            >
              <Rocket className="h-4 w-4" /> Publicar versão
            </Button>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNovo ? "Novo processo" : `Editar: ${processo?.nome}`}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isNovo
            ? "Crie um novo processo da Fetely."
            : `Versão atual: v${processo?.versao_atual}. Publique uma nova versão quando as mudanças estiverem prontas.`}
        </p>
      </div>

      <Tabs defaultValue="identidade">
        <TabsList>
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="narrativa">Narrativa</TabsTrigger>
          <TabsTrigger value="dimensoes">Dimensões</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Admissão CLT"
                  />
                </div>
                <div>
                  <Label>Código (opcional)</Label>
                  <Input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="auto-gerado"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Se vazio, é gerado a partir do nome.
                  </p>
                </div>
                <div>
                  <Label>Área principal</Label>
                  <Select
                    value={areaId || "__none__"}
                    onValueChange={(v) => setAreaId(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">(nenhuma)</SelectItem>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição curta</Label>
                  <Textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={2}
                    placeholder="Em uma frase, o que é este processo."
                  />
                </div>
                <div>
                  <Label>Natureza</Label>
                  <Select value={natureza} onValueChange={setNatureza}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {naturezas.map((n) => (
                        <SelectItem key={n.valor} value={n.valor}>
                          {n.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={statusValor} onValueChange={setStatusValor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOpcoes.map((s) => (
                        <SelectItem key={s.valor} value={s.valor}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Owner (perfil responsável)</Label>
                  <Select
                    value={ownerPerfil || "__none__"}
                    onValueChange={(v) => setOwnerPerfil(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">(nenhum)</SelectItem>
                      {(perfis || []).map((p: any) => (
                        <SelectItem key={p.id} value={p.codigo}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-2">
                <Checkbox
                  checked={sensivel}
                  onCheckedChange={(c) => setSensivel(c === true)}
                  id="sensivel"
                  className="mt-0.5"
                />
                <div>
                  <label htmlFor="sensivel" className="text-sm font-medium cursor-pointer">
                    Processo sensível
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Ativa log de consulta obrigatório (LGPD). Recomendado para: folha,
                    admissão, rescisão, pagamento.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="narrativa" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              <Label>Conteúdo do processo (Markdown)</Label>
              <Textarea
                value={narrativa}
                onChange={(e) => setNarrativa(e.target.value)}
                rows={24}
                className="font-mono text-sm"
                placeholder={`# Objetivo\nDescreva o propósito do processo.\n\n## Quando usar\n...\n\n## Passos\n1. Primeiro passo\n2. Segundo passo\n\n## Responsáveis\n- **R**: quem executa\n- **A**: quem é accountable\n- **C**: consultado\n- **I**: informado\n\n## Ferramentas e sistemas\n- People Fetely\n- ...`}
              />
              <p className="text-[11px] text-muted-foreground">
                Suporta Markdown completo (títulos, listas, tabelas via GFM, links). Será
                renderizado bonito na tela de detalhe.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dimensoes" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-6 space-y-5">
              <p className="text-xs text-muted-foreground">
                Marque todas as dimensões que este processo toca. Isso permite que ele
                seja encontrado pelos filtros corretos.
              </p>

              <TagSelector
                label="Áreas (múltiplas)"
                items={areas.map((a) => ({ id: a.id, label: a.label }))}
                selected={tagsAreas}
                onToggle={(id) => toggleTag(tagsAreas, setTagsAreas, id)}
              />
              <TagSelector
                label="Departamentos"
                items={departamentos.map((d) => ({ id: d.id, label: d.label }))}
                selected={tagsDeptos}
                onToggle={(id) => toggleTag(tagsDeptos, setTagsDeptos, id)}
              />
              <TagSelector
                label="Unidades"
                items={(unidades || []).map((u: any) => ({ id: u.id, label: u.nome }))}
                selected={tagsUnidades}
                onToggle={(id) => toggleTag(tagsUnidades, setTagsUnidades, id)}
              />
              <TagSelector
                label="Cargos envolvidos"
                items={(cargos || []).map((c: any) => ({ id: c.id, label: c.nome }))}
                selected={tagsCargos}
                onToggle={(id) => toggleTag(tagsCargos, setTagsCargos, id)}
              />
              <TagSelector
                label="Sistemas envolvidos"
                items={(sistemas || []).map((s: any) => ({ id: s.id, label: s.nome }))}
                selected={tagsSistemas}
                onToggle={(id) => toggleTag(tagsSistemas, setTagsSistemas, id)}
              />
              <TagSelector
                label="Tipo de colaborador"
                items={[
                  { id: "clt", label: "CLT" },
                  { id: "pj", label: "PJ" },
                ]}
                selected={tagsTiposColab}
                onToggle={(id) => toggleTag(tagsTiposColab, setTagsTiposColab, id)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={publicarOpen} onOpenChange={setPublicarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar nova versão</AlertDialogTitle>
            <AlertDialogDescription>
              Ao publicar, o estado atual vira <strong>v{(processo?.versao_atual || 0) + 1}</strong>{" "}
              e fica registrado no histórico. Publicações anteriores permanecem consultáveis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Label>Motivo da alteração (opcional, mas recomendado)</Label>
            <Textarea
              value={motivoPublicacao}
              onChange={(e) => setMotivoPublicacao(e.target.value)}
              rows={2}
              placeholder="Ex: Atualizado prazo de entrega do doc Y para 48h"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSalvar(true);
              }}
              disabled={salvando}
            >
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TagSelector({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">Nenhum item cadastrado.</p>
        ) : (
          items.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                {item.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
