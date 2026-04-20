import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import DOMPurify from "dompurify";

interface Props {
  codigo: string | null | undefined;
  className?: string;
}

let mermaidLoaded: Promise<any> | null = null;

async function loadMermaid() {
  if (!mermaidLoaded) {
    mermaidLoaded = import("mermaid").then((mod) => {
      mod.default.initialize({
        startOnLoad: false,
        theme: "default",
        // SECURITY: 'strict' sandboxes SVG output and strips dangerous HTML to prevent stored XSS
        securityLevel: "strict",
        fontFamily: "inherit",
      });
      return mod.default;
    });
  }
  return mermaidLoaded;
}

export function MermaidRenderer({ codigo, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!codigo?.trim() || !containerRef.current) {
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);
    setErro(null);

    (async () => {
      try {
        const mermaid = await loadMermaid();
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, codigo.trim());
        if (!cancelado && containerRef.current) {
          // SECURITY: defense-in-depth — sanitize SVG before injecting
          containerRef.current.innerHTML = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
          });
        }
      } catch (e: any) {
        if (!cancelado) setErro(e?.message || "Erro ao renderizar diagrama");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [codigo]);

  if (!codigo?.trim()) return null;

  return (
    <div className={className}>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Renderizando diagrama...
        </div>
      )}
      {erro && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Não foi possível renderizar o diagrama</p>
            <p className="text-xs text-destructive/80 mt-0.5 break-words">{erro}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Verifique a sintaxe Mermaid.</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="overflow-x-auto" />
    </div>
  );
