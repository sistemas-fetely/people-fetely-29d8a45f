import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CasaPageHeader } from "@/components/casa/CasaPageHeader";
import { useCobrancaFila } from "@/hooks/credito/useCobrancaFila";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { formatCNPJ } from "@/lib/cnpj";

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function tempoNaFila(iso: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export default function CobrancaFila() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const { data, isLoading } = useCobrancaFila({ busca: busca || undefined });

  const total = data?.length ?? 0;

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 animate-casa-fade-in">
      <CasaPageHeader
        breadcrumb={[
          { label: "Casa", to: "/" },
          { label: "Crédito", to: "/credito" },
          { label: "Cobrança" },
        ]}
        title="Cobrança"
        subtitle={`${total} pedido${total !== 1 ? "s" : ""} aguardando materialização de títulos`}
      />

      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, razão social ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Externo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Na fila</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6">
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && total === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum pedido em cobrança.
                  </TableCell>
                </TableRow>
              )}
              {data?.map((p) => (
                <TableRow
                  key={p.pedido_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/credito/cobranca/${p.pedido_id}`)}
                >
                  <TableCell>
                    <span className="font-mono text-xs font-semibold text-primary">
                      {p.id_externo}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{p.parceiro_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.parceiro_cnpj ? formatCNPJ(p.parceiro_cnpj) : "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {fmtBRL.format(p.valor_liquido)}
                  </TableCell>
                  <TableCell className="text-sm">{p.condicao_solicitada}</TableCell>
                  <TableCell>
                    {p.perfil_aplicado ? (
                      <Badge variant="secondary" className="text-xs">
                        {p.perfil_aplicado}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {tempoNaFila(p.estagio_atualizado_em)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
