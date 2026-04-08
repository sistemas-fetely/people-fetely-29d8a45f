import { Link } from "react-router-dom";
import { ShieldX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SemPermissao() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="card-shadow max-w-md w-full">
        <CardContent className="flex flex-col items-center py-12 gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Acesso Negado</h1>
          <p className="text-sm text-muted-foreground text-center">
            Você não tem permissão para acessar esta página. Entre em contato com o administrador.
          </p>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar ao início
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
