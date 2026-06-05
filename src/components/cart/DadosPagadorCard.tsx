import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Campo {
  label: string;
  value: string | undefined | null;
}

function CampoCopiavel({ label, value }: Campo) {
  const [copiado, setCopiado] = useState(false);

  if (!value) return null;

  function copiar() {
    navigator.clipboard.writeText(value!).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value}</p>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        title={copiado ? "Copiado" : "Copiar"}
      >
        {copiado ? (
          <><Check className="h-3.5 w-3.5 text-green-600" /><span className="text-green-600">Copiado</span></>
        ) : (
          <><Copy className="h-3.5 w-3.5" /><span>Copiar</span></>
        )}
      </button>
    </div>
  );
}

interface Parceiro {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  endereco_complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

interface Props {
  parceiro: Parceiro;
}

export function DadosPagadorCard({ parceiro }: Props) {
  const enderecoCompleto = [
    parceiro.logradouro,
    parceiro.numero ? `nº ${parceiro.numero}` : undefined,
    parceiro.endereco_complemento,
  ]
    .filter(Boolean)
    .join(", ");

  const campos: Campo[] = [
    { label: "Razão Social / Nome", value: parceiro.razao_social },
    { label: "Nome Fantasia", value: parceiro.nome_fantasia },
    { label: "CNPJ", value: parceiro.cnpj },
    { label: "CPF", value: parceiro.cpf },
    { label: "E-mail", value: parceiro.email },
    { label: "Telefone / Celular", value: parceiro.telefone },
    { label: "CEP", value: parceiro.cep },
    { label: "Logradouro e número", value: enderecoCompleto || undefined },
    { label: "Bairro", value: parceiro.bairro },
    { label: "Cidade", value: parceiro.cidade },
    { label: "Estado (UF)", value: parceiro.uf },
  ];

  const camposVisiveis = campos.filter((c) => !!c.value);

  if (camposVisiveis.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border border-border/60 bg-muted/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        Dados para cadastro no banco
      </p>
      <div>
        {camposVisiveis.map((c) => (
          <CampoCopiavel key={c.label} label={c.label} value={c.value} />
        ))}
      </div>
    </div>
  );
}
