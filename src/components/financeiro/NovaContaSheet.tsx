// src/components/financeiro/NovaContaSheet.tsx
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCriarConta, ContaPagarFormData } from "@/hooks/useContasPagar";

interface NovaContaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovaContaSheet({ open, onOpenChange }: NovaContaSheetProps) {
  const criarConta = useCriarConta();
  const [formData, setFormData] = useState<ContaPagarFormData>({
    fornecedor: '',
    descricao: '',
    valor: 0,
    vencimento: '',
    observacoes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await criarConta.mutateAsync(formData);
      
      // Limpar form
      setFormData({
        fornecedor: '',
        descricao: '',
        valor: 0,
        vencimento: '',
        observacoes: '',
      });
      
      onOpenChange(false);
    } catch (error) {
      // Erro tratado no hook
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova Conta a Pagar</SheetTitle>
          <SheetDescription>
            Cadastre uma nova conta. Ela será criada como rascunho.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor *</Label>
              <Input
                id="fornecedor"
                value={formData.fornecedor}
                onChange={(e) =>
                  setFormData({ ...formData, fornecedor: e.target.value })
                }
                placeholder="Nome do fornecedor"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor || ''}
                onChange={(e) =>
                  setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })
                }
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              placeholder="Descrição da conta"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vencimento">Vencimento *</Label>
            <Input
              id="vencimento"
              type="date"
              value={formData.vencimento}
              onChange={(e) =>
                setFormData({ ...formData, vencimento: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              placeholder="Observações adicionais (opcional)"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={criarConta.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={criarConta.isPending}>
              {criarConta.isPending ? 'Criando...' : 'Criar Conta'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
