import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAnalisesFila } from "@/hooks/credito/useAnalisesFila";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import type { EstagioAnalise } from "@/types/credito";

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function tempoNaFila(criadoEm: string): string {
  const ms = Date.now() - new Date(criadoEm).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

interface Props {
  estagio: EstagioAnalise | "decididas";
}

export function FilaPorEstagio({ estagio }: Props) {
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();

  const estagioParam = estagio === "decididas" ? undefined : (estagio as EstagioAnalise);
  const apenasAbertas = estagio !== "decididas";

  const { data: analises, isLoading } = useAnalisesFila({
    estagio: estagioParam,
    apenasAbertas,
    busca: busca || undefined,
  });

  const filtradas =
    estagio === "decididas"
      ? (analises || []).filter((a) => a.status_final !== null)
      : analises;

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por CNPJ, razão ou ID externo..."
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
              <TableHead>{estagio === "decididas" ? "Status" : "Na fila"}</TableHead>
              <TableHead>IA</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (!filtradas || filtradas.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum pedido nesta fila.
                </TableCell>
              </TableRow>
            )}
            {filtradas?.map((a) => (
              <TableRow
                key={a.id}
                className="cursor-pointer"
                onClick={() => navigate(`/credito/analises/${a.id}`)}
              >
                <TableCell className="font-mono text-xs">{a.pedido_id_externo}</TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{a.parceiro_razao || "Cliente novo"}</p>
                  <p className="text-xs text-muted-foreground">{a.parceiro_cnpj}</p>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {fmtBRL.format(a.pedido_valor_liquido)}
                </TableCell>
                <TableCell className="text-sm">{a.pedido_condicao}</TableCell>
                <TableCell>
                  {estagio === "decididas" ? (
                    <Badge variant="secondary">{a.status_final}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {tempoNaFila(a.criado_em)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {a.analise_ia_processada_em ? (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {a.analise_ia_confianca ? `${a.analise_ia_confianca}%` : "ok"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="gap-1">
                    Abrir <ArrowRight className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filtradas && filtradas.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtradas.length} pedido{filtradas.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
