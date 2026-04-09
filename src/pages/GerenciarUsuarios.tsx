import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  gestor_rh: "Gestor RH",
  gestor_direto: "Gestor Direto",
  colaborador: "Colaborador",
  financeiro: "Financeiro",
};

export default function GerenciarUsuarios() {
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const toggleApproval = useMutation({
    mutationFn: async ({ userId, approved }: { userId: string; approved: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ approved })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success(approved ? "Usuário aprovado com sucesso!" : "Aprovação do usuário revogada.");
    },
    onError: () => toast.error("Erro ao atualizar aprovação"),
  });

  const pendingCount = profiles.filter((p) => !p.approved).length;
  const approvedCount = profiles.filter((p) => p.approved).length;

  const getUserRoles = (userId: string) =>
    allRoles.filter((r) => r.user_id === userId).map((r) => r.role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
        <p className="text-sm text-muted-foreground">Aprovar e gerenciar acesso de usuários ao sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-[3px] border-l-blue-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Total</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              {profiles.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-amber-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Pendentes</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <UserX className="h-5 w-5 text-amber-500" />
              {pendingCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-emerald-500">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase">Aprovados</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              {approvedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Perfis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => {
                const roles = getUserRoles(profile.user_id);
                return (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.full_name || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {profile.approved ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Aprovado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          <XCircle className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {profile.approved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => toggleApproval.mutate({ userId: profile.user_id, approved: false })}
                          disabled={toggleApproval.isPending}
                        >
                          Revogar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => toggleApproval.mutate({ userId: profile.user_id, approved: true })}
                          disabled={toggleApproval.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
