import { Check, X } from "lucide-react";

interface Props {
  senha: string;
  email?: string;
}

interface Criterio {
  label: string;
  atende: boolean;
}

export function avaliarSenha(senha: string, email?: string): Criterio[] {
  const emailLocal = email?.split("@")[0]?.toLowerCase() || "";
  return [
    { label: "Pelo menos 12 caracteres", atende: senha.length >= 12 },
    { label: "Letra maiúscula", atende: /[A-Z]/.test(senha) },
    { label: "Letra minúscula", atende: /[a-z]/.test(senha) },
    { label: "Número", atende: /[0-9]/.test(senha) },
    { label: "Caractere especial", atende: /[^A-Za-z0-9]/.test(senha) },
    {
      label: "Não contém partes do email",
      atende:
        emailLocal.length < 3 || !senha.toLowerCase().includes(emailLocal),
    },
  ];
}

export function senhaEhForte(senha: string, email?: string): boolean {
  return avaliarSenha(senha, email).every((c) => c.atende);
}

export function ForcaSenhaIndicator({ senha, email }: Props) {
  if (!senha) return null;
  const criterios = avaliarSenha(senha, email);
  const qtdAtende = criterios.filter((c) => c.atende).length;
  const porcentagem = (qtdAtende / criterios.length) * 100;

  const corBarra =
    porcentagem === 100
      ? "bg-green-600"
      : porcentagem >= 66
      ? "bg-amber-500"
      : porcentagem >= 33
      ? "bg-orange-500"
      : "bg-red-500";

  const textoBarra =
    porcentagem === 100
      ? "Senha forte ✓"
      : porcentagem >= 66
      ? "Quase lá"
      : porcentagem >= 33
      ? "Fraca"
      : "Muito fraca";

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Força da senha</span>
        <span
          className={
            porcentagem === 100
              ? "text-green-700 font-medium"
              : "text-muted-foreground"
          }
        >
          {textoBarra}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${corBarra}`}
          style={{ width: `${porcentagem}%` }}
        />
      </div>
      <ul className="space-y-1 mt-2">
        {criterios.map((c, i) => (
          <li key={i} className="flex items-center gap-2 text-[11px]">
            {c.atende ? (
              <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            <span
              className={
                c.atende ? "text-foreground" : "text-muted-foreground"
              }
            >
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
