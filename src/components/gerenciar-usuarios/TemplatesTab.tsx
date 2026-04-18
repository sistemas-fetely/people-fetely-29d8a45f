import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Info } from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";
import { NIVEL_LABELS_V2 } from "@/types/permissoes-v2";

export function TemplatesTab() {
  const { data: templates, isLoading } = useTemplates();

  const { data: itensPorTemplate } = useQuery({
    queryKey: ["template-itens-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cargo_template_perfis")
        .select("template_id, perfil_id, perfis!perfil_id (nome, tipo)");
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function perfisDoTemplate(templateId: string): { nome: string; tipo: string }[] {
    return (itensPorTemplate || [])
      .filter((i: any) => i.template_id === templateId)
      .map((i: any) => ({
        nome: i.perfis?.nome || "?",
        tipo: i.perfis?.tipo || "",
      }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Templates aplicam um conjunto padrão de perfis ao cadastrar nova pessoa.
          Editar apenas se realmente precisar — mexer em template{" "}
          <strong>NÃO altera</strong> pessoas já cadastradas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(templates || []).map((t) => {
          const perfis = perfisDoTemplate(t.id);
          const nivelLabel = t.nivel_sugerido
            ? (NIVEL_LABELS_V2 as Record<string, string>)[t.nivel_sugerido] ||
              t.nivel_sugerido
            : null;
          return (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">
                        {t.nome}
                      </p>
                      {t.descricao && (
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                          {t.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                  {nivelLabel && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {nivelLabel}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Inclui os perfis:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {perfis.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">
                      Sem perfis amarrados
                    </span>
                  ) : (
                    perfis.map((p, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-[11px] font-normal"
                      >
                        {p.nome}
                      </Badge>
                    ))
                  )}
                  <Badge
                    variant="outline"
                    className="text-[11px] font-normal border-dashed"
                  >
                    + área escolhida no cadastro
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
