/**
 * GrupoFormSheet — Sheet de criação/edição de grupo empresarial.
 *
 * Inspirado em ParceiroFormSheet quanto à estrutura visual.
 * Em modo edição, mostra também a lista read-only de parceiros vinculados.
 */
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import {
  GrupoEmpresarial,
  TipoControle,
  TIPO_CONTROLE_LABELS,
  useCriarGrupo,
  useEditarGrupo,
  useExcluirOuInativarGrupo,
  useParceirosDoGrupo,
} from "@/hooks/useGruposEmpresariais";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: GrupoEmpresarial | null;
}

const TIPO_BADGE_PARCEIRO: Record<string, string> = {
  fornecedor: "bg-[#8B1A2F] text-white hover:bg-[#8B1A2F]",
  cliente: "bg-[#1A4A3A] text-white hover:bg-[#1A4A3A]",
};

function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return "—";
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

const TIPO_OPCOES: TipoControle[] = [
  "holding_formal",
  "mesmo_dono",
  "controle_indireto",
  "agrupamento_operacional",
  "outro",
];

export function GrupoFormSheet({ open, onOpenChange, editing }: Props) {
  const isEdit = !!editing;

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cnpjRaiz, setCnpjRaiz] = useState("");
  const [tipoControle, setTipoControle] = useState<TipoControle | "_none">("_none");
  const [observacao, setObservacao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const criar = useCriarGrupo();
  const editar = useEditarGrupo();
  const excluir = useExcluirOuInativarGrupo();
  const { data: parceirosVinculados = [] } = useParceirosDoGrupo(
    isEdit ? editing!.id : null,
  );

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setNome(editing.nome || "");
      setDescricao(editing.descricao || "");
      setCnpjRaiz(editing.cnpj_raiz || "");
      setTipoControle((editing.tipo_controle as TipoControle) || "_none");
      setObservacao(editing.observacao || "");
      setAtivo(editing.ativo);
    } else {
      setNome("");
      setDescricao("");
      setCnpjRaiz("");
      setTipoControle("_none");
      setObservacao("");
      setAtivo(true);
    }
  }, [open, editing]);

  const isPending = criar.isPending || editar.isPending;

  async function handleSalvar() {
    const payload = {
      nome,
      descricao: descricao || null,
      cnpj_raiz: cnpjRaiz || null,
      tipo_controle: tipoControle === "_none" ? null : tipoControle,
      observacao: observacao || null,
      ativo,
    };
    try {
      if (isEdit && editing) {
        await editar.mutateAsync({ id: editing.id, ...payload });
      } else {
        await criar.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // toast via hook
    }
  }

  async function handleConfirmExcluir() {
    if (!editing) return;
    try {
      await excluir.mutateAsync(editing.id);
      setConfirmDelete(false);
      onOpenChange(false);
    } catch {
      // toast via hook
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isEdit ? "Editar grupo" : "Novo grupo empresarial"}
            </SheetTitle>
            <SheetDescription>
              Agrupa parceiros que pertencem ao mesmo controle (holding, mesmo dono, etc).
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex: Grupo Lenovo"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Resumo curto do grupo"
                rows={2}
              />
            </div>

            <div>
              <Label>CNPJ raiz</Label>
              <Input
                value={cnpjRaiz}
                onChange={(e) => setCnpjRaiz(e.target.value)}
                placeholder="ex: 12345678 (8 dígitos)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Opcional — serve para identificar o controlador formal.
              </p>
            </div>

            <div>
              <Label>Tipo de controle</Label>
              <Select
                value={tipoControle}
                onValueChange={(v) => setTipoControle(v as TipoControle | "_none")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Não definido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Não definido</SelectItem>
                  {TIPO_OPCOES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_CONTROLE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observação</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Notas livres"
                rows={3}
              />
            </div>

            {isEdit && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="grupo-ativo"
                  checked={ativo}
                  onCheckedChange={(v) => setAtivo(!!v)}
                />
                <Label htmlFor="grupo-ativo" className="cursor-pointer">
                  Ativo
                </Label>
              </div>
            )}

            {isEdit && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">
                  Parceiros vinculados ({parceirosVinculados.length})
                </p>
                {parceirosVinculados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum parceiro vinculado a este grupo ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {parceirosVinculados.map((p: any) => {
                      const tipos: string[] = p.tipos || [];
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 text-sm border rounded-md px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">
                              {p.razao_social}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {formatCnpj(p.cnpj)}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 shrink-0">
                            {tipos.map((t) => (
                              <Badge
                                key={t}
                                className={
                                  TIPO_BADGE_PARCEIRO[t] || "bg-muted"
                                }
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between">
            <div>
              {isEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending || excluir.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSalvar}
                disabled={isPending || !nome.trim()}
                className="bg-admin hover:bg-admin/90 text-admin-foreground"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{editing?.nome}</strong>.
              Se este grupo tiver parceiros vinculados, ele será apenas
              inativado (preserva o histórico). Caso contrário, será excluído
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluir.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmExcluir();
              }}
              disabled={excluir.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluir.isPending ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
