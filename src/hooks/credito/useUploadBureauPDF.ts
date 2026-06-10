import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadBureauArgs {
  analise_id: string;
  parceiro_id: string;
  file: File;
  storage_path?: string;
}

interface UploadBureauResponse {
  score_id: string;
  fonte: "serasa" | "bvg";
  cnpj_match: boolean;
  cnpj_warning: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraido: any;
}

export function useUploadBureauPDF() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      analise_id,
      parceiro_id,
      file,
      storage_path,
    }: UploadBureauArgs): Promise<UploadBureauResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;

      const path =
        storage_path ||
        `credito/${analise_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: upErr } = await sb.storage
        .from("ged")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      const { data, error: fnErr } = await sb.functions.invoke("parse-bureau-pdf", {
        body: { analise_id, documento_storage_path: path },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      const result = data as UploadBureauResponse;

      // Indexação GED (best-effort)
      try {
        const { data: pastaExistente } = await sb
          .from("ged_pastas")
          .select("id")
          .eq("parceiro_id", parceiro_id)
          .ilike("nome", "crédito%")
          .maybeSingle();

        let pasta_id: string | null = pastaExistente?.id ?? null;

        if (!pasta_id) {
          const { data: novaPasta } = await sb
            .from("ged_pastas")
            .insert({
              nome: "Crédito",
              parceiro_id,
              area: "credito",
              tipo: "cliente",
            })
            .select("id")
            .single();
          pasta_id = novaPasta?.id ?? null;
        }

        const dataConsulta = new Date().toLocaleDateString("pt-BR");
        await sb.from("ged_documentos").insert({
          pasta_id,
          parceiro_id,
          nome: `${String(result.fonte).toUpperCase()} — ${dataConsulta}`,
          arquivo_original: file.name,
          storage_path: path,
          tipo_documento: "bureau_credito",
          mime_type: "application/pdf",
          tamanho_bytes: file.size,
          tags: [result.fonte, "bureau", "credito"],
          origem_porta: "credito",
        });
      } catch (gedErr) {
        console.error("[useUploadBureauPDF] GED indexation failed (non-blocking):", gedErr);
      }

      return result;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["analise-detalhe", vars.analise_id] });
      toast({
        title: "Bureau anexado",
        description: data.cnpj_warning
          ? `⚠️ ${data.cnpj_warning}`
          : `Fonte: ${data.fonte}, score extraído`,
        variant: data.cnpj_warning ? "destructive" : "default",
      });
    },
    onError: (e: Error) => {
      toast({
        title: "Erro no upload de bureau",
        description: e.message,
        variant: "destructive",
      });
    },
  });
}
