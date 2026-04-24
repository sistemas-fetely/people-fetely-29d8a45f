import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  ListTree,
  Search,
  Upload,
} from "lucide-react";

type Conta = {
  id: string;
  codigo: string;
  nome: string;
  parent_id: string | null;
  nivel: number;
  tipo: string;
  ativo: boolean;
};

type Node = Conta & { children: Node[] };

const TIPO_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  receita: { bg: "bg-[#1A4A3A]", text: "text-white", label: "Receita" },
  despesa: { bg: "bg-[#8B1A2F]", text: "text-white", label: "Despesa" },
  investimento: { bg: "bg-[#2563EB]", text: "text-white", label: "Investimento" },
  imposto: { bg: "bg-[#D97706]", text: "text-white", label: "Imposto" },
};

function buildTree(items: Conta[]): Node[] {
  const map = new Map<string, Node>();
  items.forEach((i) => map.set(i.id, { ...i, children: [] }));
  const roots: Node[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (nodes: Node[]) => {
    nodes.sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function filterTree(nodes: Node[], term: string, tipoFilter: string): Node[] {
  const t = term.trim().toLowerCase();
  const matches = (n: Node) =>
    (!t || n.nome.toLowerCase().includes(t) || n.codigo.toLowerCase().includes(t)) &&
    (tipoFilter === "todos" || n.tipo === tipoFilter);

  const recurse = (list: Node[]): Node[] => {
    const out: Node[] = [];
    for (const n of list) {
      const filteredChildren = recurse(n.children);
      if (matches(n) || filteredChildren.length > 0) {
        out.push({ ...n, children: filteredChildren });
      }
    }
    return out;
  };
  return recurse(nodes);
}

function NodeItem({
  node,
  depth,
  expanded,
  toggle,
  forceOpen,
}: {
  node: Node;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  forceOpen: boolean;
}) {
  const isOpen = forceOpen || expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const tipoStyle = TIPO_STYLES[node.tipo] || {
    bg: "bg-muted",
    text: "text-foreground",
    label: node.tipo,
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => toggle(node.id)}
            className="p-0.5 hover:bg-muted rounded"
            aria-label={isOpen ? "Recolher" : "Expandir"}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="font-mono text-xs text-muted-foreground">{node.codigo}</span>
        <span className="flex-1 text-sm">{node.nome}</span>
        {hasChildren && (
          <span className="text-xs text-muted-foreground">
            {node.children.length} {node.children.length === 1 ? "filho" : "filhos"}
          </span>
        )}
        <Badge className={`${tipoStyle.bg} ${tipoStyle.text} hover:${tipoStyle.bg}`}>
          {tipoStyle.label}
        </Badge>
      </div>
      {isOpen &&
        node.children.map((c) => (
          <NodeItem
            key={c.id}
            node={c}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            forceOpen={forceOpen}
          />
        ))}
    </div>
  );
}

export default function PlanoDeContas() {
  const [busca, setBusca] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["plano-contas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_contas")
        .select("id,codigo,nome,parent_id,nivel,tipo,ativo")
        .order("codigo");
      if (error) throw error;
      return data as Conta[];
    },
  });

  const tree = useMemo(() => buildTree(data || []), [data]);
  const filtered = useMemo(
    () => filterTree(tree, busca, tipoFilter),
    [tree, busca, tipoFilter]
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isSearching = busca.trim().length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListTree className="h-6 w-6 text-admin" />
            Plano de Contas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Estrutura hierárquica espelhada do Bling.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {(["todos", "receita", "despesa", "investimento", "imposto"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={tipoFilter === t ? "default" : "outline"}
                  onClick={() => setTipoFilter(t)}
                  className="capitalize"
                >
                  {t === "todos" ? "Todos" : t}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (data || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-admin-muted">
                <Upload className="h-8 w-8 text-admin" />
              </div>
              <div className="max-w-md">
                <p className="text-lg font-semibold">Sem plano de contas importado</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Sincronize com o Bling para importar o plano de contas.
                </p>
              </div>
              <Button asChild className="bg-admin hover:bg-admin-accent text-admin-foreground">
                <Link to="/administrativo/importar">
                  <Upload className="h-4 w-4 mr-2" />
                  Ir para importação
                </Link>
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma conta encontrada para os filtros aplicados.
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {filtered.map((n) => (
                <NodeItem
                  key={n.id}
                  node={n}
                  depth={0}
                  expanded={expanded}
                  toggle={toggle}
                  forceOpen={isSearching}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
