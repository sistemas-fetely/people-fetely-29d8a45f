import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Mail, Phone, Users, Briefcase, DollarSign, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { differenceInMonths } from "date-fns";
import type { PosicaoNode } from "@/types/organograma";

interface Props {
  node: PosicaoNode | null;
  open: boolean;
  onClose: () => void;
  allNodes: PosicaoNode[];
  onEditPosition?: (node: PosicaoNode) => void;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatTempoCasa(dataAdmissao: string) {
  const months = differenceInMonths(new Date(), new Date(dataAdmissao));
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} meses`;
  return `${years} ano${years > 1 ? "s" : ""} e ${rem} mes${rem !== 1 ? "es" : ""}`;
}

function statusBadge(status: string | null) {
  if (!status) return null;
  const map: Record<string, { label: string; className: string }> = {
    ativo: { label: "🟢 Ativo", className: "bg-green-100 text-green-800 border-green-200" },
    ferias: { label: "🟠 Férias", className: "bg-orange-100 text-orange-800 border-orange-200" },
    afastado: { label: "⚫ Afastado", className: "bg-gray-100 text-gray-800 border-gray-200" },
  };
  const s = map[status] || { label: status, className: "" };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OrgNodeDrawer({ node, open, onClose, allNodes, onEditPosition }: Props) {
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const canSeeSalary = hasAnyRole(["super_admin", "gestor_rh", "financeiro"]);
  const canManage = hasAnyRole(["super_admin", "gestor_rh"]);

  if (!node) return null;

  const parent = node.id_pai ? allNodes.find(n => n.id === node.id_pai) : null;
  const avatarUrl = node.foto_url || (node.nome_display ? `https://ui-avatars.com/api/?name=${encodeURIComponent(node.nome_display)}&background=random&size=128` : null);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="sr-only">Detalhes da Posição</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center gap-3 py-4">
          <Avatar className="h-20 w-20">
            {avatarUrl && <AvatarImage src={avatarUrl} />}
            <AvatarFallback className="text-lg">{node.nome_display ? getInitials(node.nome_display) : "?"}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-lg font-semibold">{node.nome_display || "Posição Vazia"}</h3>
            <p className="text-sm text-muted-foreground">{node.titulo_cargo}</p>
            <p className="text-xs text-muted-foreground">{node.departamento}{node.area ? ` · ${node.area}` : ""}</p>
          </div>
          <div className="flex gap-2">
            {node.vinculo && <Badge variant={node.vinculo === "CLT" ? "default" : "secondary"}>{node.vinculo}</Badge>}
            {node.status === "vaga_aberta" && <Badge variant="outline" className="border-dashed">⚪ Vaga Aberta</Badge>}
            {node.status === "previsto" && <Badge variant="outline" className="border-dashed border-green-400 text-green-700">🔵 Previsto</Badge>}
            {statusBadge(node.status_pessoal)}
          </div>
          {canManage && onEditPosition && (
            <Button variant="outline" size="sm" onClick={() => onEditPosition(node)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar Posição
            </Button>
          )}
        </div>

        <Tabs defaultValue="perfil" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="perfil" className="flex-1">Perfil</TabsTrigger>
            <TabsTrigger value="equipe" className="flex-1">Equipe</TabsTrigger>
            <TabsTrigger value="posicao" className="flex-1">Posição</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="space-y-3 pt-3">
            {node.colaborador && (
              <>
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Tempo de casa" value={formatTempoCasa(node.colaborador.data_admissao)} />
                <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={node.colaborador.email_corporativo || "—"} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={node.colaborador.telefone || "—"} />
                <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Vínculo" value="CLT" />
                {canSeeSalary && <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Salário" value={fmtBRL(node.colaborador.salario_base)} />}
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => navigate(`/colaboradores/${node.colaborador!.id}`)}>
                  Ver ficha completa
                </Button>
              </>
            )}
            {node.contrato_pj && (
              <>
                <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={node.contrato_pj.contato_email || "—"} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={node.contrato_pj.contato_telefone || "—"} />
                <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Vínculo" value="PJ" />
                {canSeeSalary && <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Valor mensal" value={fmtBRL(node.contrato_pj.valor_mensal)} />}
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => navigate(`/contratos-pj/${node.contrato_pj!.id}`)}>
                  Ver contrato
                </Button>
              </>
            )}
            {node.status !== "ocupado" && <p className="text-sm text-muted-foreground text-center py-4">Posição sem colaborador vinculado</p>}
          </TabsContent>

          <TabsContent value="equipe" className="space-y-3 pt-3">
            {parent && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Gestor Direto</p>
                <MiniCard node={parent} />
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Subordinados Diretos ({node.subordinados_diretos})</p>
              {node.children.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum subordinado</p>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {node.children.map(c => <MiniCard key={c.id} node={c} />)}
                </div>
              )}
            </div>
            <div className="border-t pt-2">
              <p className="text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 inline mr-1" />
                Total de subordinados (diretos + indiretos): <strong>{node.subordinados_totais}</strong>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="posicao" className="space-y-3 pt-3">
            <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Cargo" value={node.titulo_cargo} />
            <InfoRow label="Nível" value={`${node.nivel_hierarquico}`} />
            <InfoRow label="Departamento" value={node.departamento} />
            {node.area && <InfoRow label="Área" value={node.area} />}
            {node.filial && <InfoRow label="Filial" value={node.filial} />}
            {node.centro_custo && <InfoRow label="Centro de custo" value={node.centro_custo} />}
            {canSeeSalary && node.salario_previsto && <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Salário previsto" value={fmtBRL(node.salario_previsto)} />}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground min-w-[100px]">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function MiniCard({ node }: { node: PosicaoNode }) {
  const avatarUrl = node.nome_display ? `https://ui-avatars.com/api/?name=${encodeURIComponent(node.nome_display)}&background=random&size=32` : null;
  return (
    <div className="flex items-center gap-2 p-2 rounded-md border hover:bg-accent/50 cursor-pointer transition-colors">
      <Avatar className="h-7 w-7">
        {avatarUrl && <AvatarImage src={avatarUrl} />}
        <AvatarFallback className="text-[10px]">{node.nome_display ? getInitials(node.nome_display) : "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{node.nome_display || "Vaga"}</p>
        <p className="text-[10px] text-muted-foreground truncate">{node.titulo_cargo}</p>
      </div>
      {node.vinculo && <Badge variant="outline" className="text-[9px] h-4">{node.vinculo}</Badge>}
    </div>
  );
}
