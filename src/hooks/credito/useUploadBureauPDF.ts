import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadBureauArgs {
  analise_id: string;
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
    mutationFn: async ({ analise_id, file, storage_path }: UploadBureauArgs): Promise<UploadBureauResponse> => {
      const path = storage_path ||
        `credito/${analise_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: upErr } = await supabase.storage.from("ged").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data, error: fnErr } = await supabase.functions.invoke("parse-bureau-pdf", {
        body: { analise_id, documento_storage_path: path },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      return data as UploadBureauResponse;
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
