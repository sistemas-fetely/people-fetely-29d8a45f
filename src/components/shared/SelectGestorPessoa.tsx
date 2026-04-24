import { useGestoresDisponiveis } from "@/hooks/useGestoresDisponiveis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Props {
  /** profile.id do gestor selecionado */
  value: string | null;
  onChange: (profileId: string | null) => void;
  /** ID da própria pessoa para evitar autosseleção (opcional) */
  excluirPessoaId?: string;
  placeholder?: string;
  disabled?: boolean;
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function SelectGestorPessoa({ value, onChange, excluirPessoaId, placeholder = "Selecione o gestor", disabled }: Props) {
  const { data: gestores, isLoading } = useGestoresDisponiveis();

  if (isLoading) {
    return (
      <div className="flex items-center h-10">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const lista = (gestores || []).filter((g) => g.pessoa_id !== excluirPessoaId);

  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(v === "none" ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhum (posição raiz)</SelectItem>
        {lista.map((g) => (
          <SelectItem key={g.profile_id} value={g.profile_id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={g.foto_url || undefined} alt={g.nome} />
                <AvatarFallback className="text-[10px]">{iniciais(g.nome)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{g.nome}</span>
              <span className="text-xs text-muted-foreground">— {g.cargo}</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1">{g.vinculo}</Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
