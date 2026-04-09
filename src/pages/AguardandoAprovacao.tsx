import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

export default function AguardandoAprovacao() {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Aguardando Aprovação</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sua conta está pendente de aprovação
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Sua conta <strong>{user?.email}</strong> foi criada com sucesso, mas precisa ser aprovada por um administrador antes que você possa acessar o sistema.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Você receberá acesso assim que um administrador aprovar sua conta. Por favor, entre em contato com o RH caso precise de acesso urgente.
            </p>
            <Button variant="outline" className="w-full" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
