import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const MODULOS_SENSIVEIS = new Set([
  "folha_pagamento", "notas_fiscais", "pagamentos_pj", "cargos",
  "memorias_fetely", "colaboradores", "contratos_pj", "usuarios",
]);

const ROLES_COM_NIVEIS = new Set([
  "rh", "gestao_direta", "financeiro", "administrativo",
  "operacional", "ti", "recrutamento", "fiscal", "estagiario",
]);

interface AcaoOption {
  key: string;
  label: string;
}

interface Props {
  roleName: string;
  roleLabel: string;
  moduleName: string;
  moduleLabel: string;
  action?: string;
  actionLabel?: string;
  granted: boolean;
  nivelMinimo: string | null;
  colaboradorTipo?: string;
  usuariosAfetados: number;
  children: React.ReactNode;
  disabled?: boolean;
  // Para Matriz Completa: deixa o usuário escolher qual ação editar
  multiAction?: boolean;
  acoesDisponiveis?: AcaoOption[];
  // Função para buscar permissão específica de uma ação (multiAction)
  getPermissaoForAction?: (action: string) => { granted: boolean; nivel_minimo: string | null };
}

export function CelulaPermissaoEditavel({
  roleName, roleLabel, moduleName, moduleLabel,
  action, actionLabel,
  granted, nivelMinimo, colaboradorTipo = "all", usuariosAfetados,
  children, disabled = false,
  multiAction = false, acoesDisponiveis = [], getPermissaoForAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>(action || acoesDisponiveis[0]?.key || "view");
  const [localGranted, setLocalGranted] = useState(granted);
  const [localNivel, setLocalNivel] = useState(nivelMinimo || "qualquer");
  const [confirmouSensivel, setConfirmouSensivel] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();

  const ehSensivel = MODULOS_SENSIVEIS.has(moduleName);
  const suportaNivel = ROLES_COM_NIVEIS.has(roleName);
  const ehSuperAdmin = roleName === "super_admin";

  // Quando muda a ação no multiAction, recarrega estado a partir da função
  useEffect(() => {
    if (multiAction && getPermissaoForAction && open) {
      const p = getPermissaoForAction(selectedAction);
      setLocalGranted(p.granted);
      setLocalNivel(p.nivel_minimo || "qualquer");
      setConfirmouSensivel(false);
    }
  }, [selectedAction, multiAction, getPermissaoForAction, open]);

  function onOpenChange(newOpen: boolean) {
    if (newOpen) {
      if (multiAction && getPermissaoForAction) {
        const acaoInicial = action || acoesDisponiveis[0]?.key || "view";
        setSelectedAction(acaoInicial);
        const p = getPermissaoForAction(acaoInicial);
        setLocalGranted(p.granted);
        setLocalNivel(p.nivel_minimo || "qualquer");
      } else {
        setLocalGranted(granted);
        setLocalNivel(nivelMinimo || "qualquer");
      }
      setConfirmouSensivel(false);
    }
    setOpen(newOpen);
  }

  // Para single-action: comparar com props originais
  // Para multi-action: comparar com a permissão atual da ação selecionada
  const refPerm = multiAction && getPermissaoForAction
    ? getPermissaoForAction(selectedAction)
    : { granted, nivel_minimo: nivelMinimo };

  const houveMudanca =
    localGranted !== refPerm.granted ||
    (localGranted && (localNivel || "qualquer") !== (refPerm.nivel_minimo || "qualquer"));

  const precisaConfirmar = ehSensivel && localGranted && !refPerm.granted && !confirmouSensivel;
  const podeSalvar = houveMudanca && !precisaConfirmar && !salvando;

  async function salvar() {
    setSalvando(true);
    try {
      const acaoFinal = multiAction ? selectedAction : action!;
      const { error } = await supabase
        .from("role_permissions")
        .upsert(
          {
            role_name: roleName,
            module: moduleName,
            permission: acaoFinal,
            granted: localGranted,
            nivel_minimo: localGranted && localNivel !== "qualquer" ? localNivel : null,
            colaborador_tipo: colaboradorTipo || "all",
          },
          { onConflict: "role_name,module,permission,colaborador_tipo" }
        );

      if (error) throw error;

      toast.success("Permissão atualizada", { duration: 1500 });
      queryClient.invalidateQueries({ queryKey: ["all-role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions-all"] });
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  }

  if (disabled || ehSuperAdmin) {
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-pointer inline-flex items-center justify-center hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
          aria-label={`Editar permissão de ${roleLabel} em ${moduleLabel}`}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="center">
        <div className="space-y-3 p-4">
          {/* Cabeçalho contextual */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {roleLabel}
              {!multiAction && actionLabel && <> · {actionLabel}</>}
            </div>
            <p className="text-sm font-semibold leading-tight">{moduleLabel}</p>
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {ehSensivel && (
                <Badge variant="outline" className="text-[9px] border-amber-400 text-amber-700">
                  🔐 Sensível
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px] text-muted-foreground">
                {usuariosAfetados === 0
                  ? "Nenhum usuário no perfil"
                  : usuariosAfetados === 1
                    ? "Afeta 1 usuário"
                    : `Afeta ${usuariosAfetados} usuários`}
              </Badge>
            </div>
          </div>

          {/* Seletor de ação para multiAction */}
          {multiAction && acoesDisponiveis.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Ação</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {acoesDisponiveis.map((a) => (
                    <SelectItem key={a.key} value={a.key} className="text-xs">
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Toggle */}
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <Label htmlFor={`granted-${moduleName}-${selectedAction}`} className="text-sm cursor-pointer">
              {localGranted ? "Permitido" : "Sem acesso"}
            </Label>
            <Switch
              id={`granted-${moduleName}-${selectedAction}`}
              checked={localGranted}
              onCheckedChange={setLocalGranted}
            />
          </div>

          {/* Nível mínimo */}
          {localGranted && suportaNivel && (
            <div className="space-y-1.5">
              <Label className="text-xs">Nível mínimo exigido</Label>
              <Select value={localNivel} onValueChange={setLocalNivel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualquer" className="text-xs">Qualquer nível</SelectItem>
                  <SelectItem value="estagio" className="text-xs">Estágio+</SelectItem>
                  <SelectItem value="assistente" className="text-xs">Assistente+</SelectItem>
                  <SelectItem value="analista" className="text-xs">Analista+</SelectItem>
                  <SelectItem value="coordenador" className="text-xs">Coordenador+</SelectItem>
                  <SelectItem value="gerente" className="text-xs">Gerente+</SelectItem>
                  <SelectItem value="diretor" className="text-xs">Diretor</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                O nível selecionado e os superiores terão acesso.
              </p>
            </div>
          )}

          {/* Confirmação para sensível */}
          {ehSensivel && localGranted && !refPerm.granted && (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-2.5 space-y-2">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-900 dark:text-amber-200">
                  Esse é um módulo sensível. Confirme que você quer liberar esse acesso.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`conf-${moduleName}-${selectedAction}`}
                  checked={confirmouSensivel}
                  onCheckedChange={setConfirmouSensivel}
                />
                <Label htmlFor={`conf-${moduleName}-${selectedAction}`} className="text-[11px] cursor-pointer">
                  Entendo e quero liberar
                </Label>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button size="sm" onClick={salvar} disabled={!podeSalvar}>
              {salvando && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
