import { Construction, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function ProdutoIndex() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card className="p-12 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-6"
             style={{ backgroundColor: "#C77CA0" }}>
          <Gift className="h-8 w-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold mb-3">Produto Fetély</h1>
        <p className="text-muted-foreground mb-6">
          Sistema em construção. Será habilitado quando a equipe de Produto
          definir os primeiros módulos.
        </p>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/70">
          <Construction className="h-4 w-4" />
          <span>Em construção</span>
        </div>
      </Card>
    </div>
  );
}
