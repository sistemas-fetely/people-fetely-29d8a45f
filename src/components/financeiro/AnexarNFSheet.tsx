// src/components/financeiro/AnexarNFSheet.tsx
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
import { FileUp, Loader2 } from "lucide-react";
import { ContaPagar, useAnexarNF } from "@/hooks/useContasPagar";

interface AnexarNFSheetProps {
  conta: ContaPagar;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnexarNFSheet({ conta, open, onOpenChange }: AnexarNFSheetProps) {
  const anexarNF = useAnexarNF();
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar tipo
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(selectedFile.type)) {
        alert('Formato inválido. Use PDF ou imagens (JPG/PNG)');
        return;
      }
      
      // Validar tamanho (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo: 10MB');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    try {
      await anexarNF.mutateAsync({ contaId: conta.id, arquivo: file });
      setFile(null);
      onOpenChange(false);
    } catch (error) {
      // Erro tratado no hook
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Anexar Nota Fiscal</SheetTitle>
          <SheetDescription>
            Anexe o documento fiscal referente a esta conta.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo (PDF ou Imagem)</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={anexarNF.isPending}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selecionado: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Conta:</strong> {conta.fornecedor} - {conta.descricao}
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={anexarNF.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || anexarNF.isPending}
            >
              {anexarNF.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Anexando...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4 mr-2" />
                  Anexar
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
