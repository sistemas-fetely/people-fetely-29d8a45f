import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatePosicao, useUpdatePosicao, useDeletePosicao } from "@/hooks/useOrgMutations";
import type { PosicaoNode } from "@/types/organograma";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  editNode?: PosicaoNode | null;
  allNodes: PosicaoNode[];
}

const nivelLabels: Record<number, string> = {
  1: "1 — C-Level",
  2: "2 — Diretoria",
  3: "3 — Gerência",
  4: "4 — Coordenação",
  5: "5 — Analistas",
  6: "6 — Assistentes",
};

export function OrgPosicaoModal({ open, onClose, editNode, allNodes }: Props) {
  const { hasAnyRole } = useAuth();
  const canSeeSalary = hasAnyRole(["super_admin", "gestor_rh", "financeiro"]);
  const createMutation = useCreatePosicao();
  const updateMutation = useUpdatePosicao();
  const deleteMutation = useDeletePosicao();

  const [form, setForm] = useState({
    titulo_cargo: "",
    nivel_hierarquico: 3,
    departamento: "",
    area: "",
    filial: "Matriz",
    status: "vaga_aberta" as string,
    id_pai: "" as string,
    salario_previsto: "" as string,
    centro_custo: "",
  });

  useEffect(() => {
    if (editNode) {
      setForm({
        titulo_cargo: editNode.titulo_cargo,
        nivel_hierarquico: editNode.nivel_hierarquico,
        departamento: editNode.departamento,
        area: editNode.area || "",
        filial: editNode.filial || "Matriz",
        status: editNode.status,
        id_pai: editNode.id_pai || "",
        salario_previsto: editNode.salario_previsto ? String(editNode.salario_previsto) : "",
        centro_custo: editNode.centro_custo || "",
      });
    } else {
      setForm({
        titulo_cargo: "",
        nivel_hierarquico: 3,
        departamento: "",
        area: "",
        filial: "Matriz",
        status: "vaga_aberta",
        id_pai: "",
        salario_previsto: "",
        centro_custo: "",
      });
    }
  }, [editNode, open]);

  const departamentos = [...new Set(allNodes.map(n => n.departamento))].sort();
  const parentOptions = allNodes.filter(n => !editNode || n.id !== editNode.id);

  const handleSubmit = () => {
    if (!form.titulo_cargo || !form.departamento) return;

    const payload = {
      titulo_cargo: form.titulo_cargo,
      nivel_hierarquico: form.nivel_hierarquico,
      departamento: form.departamento,
      area: form.area || null,
      filial: form.filial || null,
      status: form.status,
      id_pai: form.id_pai || null,
      salario_previsto: form.salario_previsto ? Number(form.salario_previsto) : null,
      centro_custo: form.centro_custo || null,
    };

    if (editNode) {
      updateMutation.mutate({ id: editNode.id, ...payload }, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  const handleDelete = () => {
    if (!editNode) return;
    if (editNode.subordinados_diretos > 0) return;
    deleteMutation.mutate(editNode.id, { onSuccess: onClose });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editNode ? "Editar Posição" : "Nova Posição"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Título do Cargo *</Label>
            <Input value={form.titulo_cargo} onChange={(e) => setForm({ ...form, titulo_cargo: e.target.value })} placeholder="Ex: Gerente de Vendas" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Nível Hierárquico</Label>
              <Select value={String(form.nivel_hierarquico)} onValueChange={(v) => setForm({ ...form, nivel_hierarquico: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(nivelLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ocupado">Ocupado</SelectItem>
                  <SelectItem value="vaga_aberta">Vaga Aberta</SelectItem>
                  <SelectItem value="previsto">Previsto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Departamento *</Label>
              <Input
                value={form.departamento}
                onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                placeholder="Ex: Comercial"
                list="dept-list"
              />
              <datalist id="dept-list">
                {departamentos.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>

            <div className="grid gap-1.5">
              <Label>Área</Label>
              <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex: Vendas" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Filial</Label>
              <Input value={form.filial} onChange={(e) => setForm({ ...form, filial: e.target.value })} placeholder="Ex: Matriz" />
            </div>

            <div className="grid gap-1.5">
              <Label>Centro de Custo</Label>
              <Input value={form.centro_custo} onChange={(e) => setForm({ ...form, centro_custo: e.target.value })} placeholder="Ex: CC-100" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Posição Superior (Gestor)</Label>
            <Select value={form.id_pai || "none"} onValueChange={(v) => setForm({ ...form, id_pai: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Nenhuma (posição raiz)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (posição raiz)</SelectItem>
                {parentOptions.map(n => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.nome_display || n.titulo_cargo} — {n.titulo_cargo} ({n.departamento})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canSeeSalary && (
            <div className="grid gap-1.5">
              <Label>Salário Previsto (R$)</Label>
              <Input
                type="number"
                value={form.salario_previsto}
                onChange={(e) => setForm({ ...form, salario_previsto: e.target.value })}
                placeholder="Ex: 15000"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {editNode && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={editNode.subordinados_diretos > 0 || deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir posição?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação removerá a posição "{editNode.titulo_cargo}" permanentemente. Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.titulo_cargo || !form.departamento}>
              {isPending ? "Salvando..." : editNode ? "Salvar" : "Criar Posição"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
