import { useState } from "react";
import { Loader2, Upload, FileText, Plus, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useMeuContratoPJ, useSubmeterNF } from "@/hooks/useMinhasNotas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefaId?: string;
  competencia: string;
}

interface Classificacao {
  valor: string;
  categoria_valor: string;
  descricao_adicional: string;
  justificativa: string;
}

export function SubmeterNFDialog({ open, onOpenChange, tarefaId, competencia }: Props) {
  const { data: contrato } = useMeuContratoPJ();
  const submeter = useSubmeterNF();

  const [numero, setNumero] = useState("");
  const [serie, setSerie] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [classificacoes, setClassificacoes] = useState<Classificacao[]>([]);

  const { data: categorias } = useQuery({
    queryKey: ["parametros", "categoria_valor_nf"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parametros")
        .select("valor, label")
        .eq("categoria", "categoria_valor_nf")
        .eq("ativo", true)
        .order("ordem");
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const valorContrato = contrato?.valor_mensal || 0;
  const valorTotalNum = parseFloat(valorTotal) || 0;
  const bateComContrato = Math.abs(valorTotalNum - valorContrato) < 0.01;

  async function handleUpload() {
    if (!arquivo || !contrato) return;

    setUploading(true);
    try {
      const ext = arquivo.name.split(".").pop() || "pdf";
      const path = `${contrato.id}/${competencia}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("notas-fiscais-pj")
        .upload(path, arquivo);

      if (error) throw error;

      setUploadedUrl(path);

      // Parse automático
      setParsing(true);
      try {
        const formData = new FormData();
        formData.append("file", arquivo);

        const { data: result, error: errParse } = await supabase.functions.invoke(
          "parse-nf-pdf",
          { body: formData }
        );

        const parsed = (result as any)?.data || result;

        if (!errParse && parsed?.numero) {
          setNumero(parsed.numero || "");
          setSerie(parsed.serie || "");
          if (parsed.valor) setValorTotal(String(parsed.valor));
          if (parsed.data_emissao) setDataEmissao(parsed.data_emissao);
          if (parsed.descricao) setDescricao(parsed.descricao);
          toast.success("Dados extraídos do PDF");
        }
      } catch (err) {
        console.warn("Parse falhou, preencha manualmente", err);
      } finally {
        setParsing(false);
      }

      toast.success("PDF enviado");
    } catch (err: any) {
      toast.error(err.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  function addClassificacao() {
    setClassificacoes([
      ...classificacoes,
      { valor: "", categoria_valor: "extra_projeto", descricao_adicional: "", justificativa: "" },
    ]);
  }

  function removeClassificacao(i: number) {
    setClassificacoes(classificacoes.filter((_, idx) => idx !== i));
  }

  function updateClass(i: number, field: keyof Classificacao, value: string) {
    setClassificacoes(classificacoes.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  async function handleSubmeter() {
    if (!contrato || !uploadedUrl) return;

    let classFinal: any[];

    if (bateComContrato) {
      classFinal = [{
        valor: valorTotalNum,
        categoria_valor: "contrato",
        descricao_adicional: null,
        justificativa: null,
      }];
    } else {
      classFinal = [
        {
          valor: valorContrato,
          categoria_valor: "contrato",
          descricao_adicional: null,
          justificativa: null,
        },
        ...classificacoes.map((c) => ({
          valor: parseFloat(c.valor) || 0,
          categoria_valor: c.categoria_valor,
          descricao_adicional: c.descricao_adicional || null,
          justificativa: c.justificativa || null,
        })),
      ];
    }

    try {
      await submeter.mutateAsync({
        contrato_id: contrato.id,
        competencia,
        numero,
        serie: serie || undefined,
        valor_total: valorTotalNum,
        data_emissao: dataEmissao,
        descricao: descricao || undefined,
        arquivo_url: uploadedUrl,
        classificacoes: classFinal,
        tarefa_id: tarefaId,
      });

      setNumero(""); setSerie(""); setDataEmissao(""); setValorTotal("");
      setDescricao(""); setArquivo(null); setUploadedUrl(null);
      setClassificacoes([]);
      onOpenChange(false);
    } catch { /* toast já foi mostrado */ }
  }

  const precisaClassificar = !bateComContrato && valorTotalNum > 0;
  const somaClassificacoes = classificacoes.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  const somaTotal = valorContrato + somaClassificacoes;
  const classificacaoOK = bateComContrato || Math.abs(somaTotal - valorTotalNum) < 0.01;

  const podeSubmeter = uploadedUrl && numero && dataEmissao && valorTotalNum > 0 && classificacaoOK;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Emitir NF · competência {competencia}
          </DialogTitle>
          <DialogDescription>
            Anexe o PDF da sua nota fiscal. A gente preenche os campos pra você. 💚
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {contrato && (
            <Card className="bg-muted/30">
              <CardContent className="p-3 text-xs space-y-1">
                <p><span className="text-muted-foreground">Contrato:</span> <span className="font-medium">{contrato.razao_social}</span></p>
                <p><span className="text-muted-foreground">Valor mensal:</span> <span className="font-medium">R$ {Number(contrato.valor_mensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>
              </CardContent>
            </Card>
          )}

          {!uploadedUrl ? (
            <div className="space-y-2">
              <Label>Arquivo PDF da NF *</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                />
                <Button onClick={handleUpload} disabled={!arquivo || uploading} className="gap-2 shrink-0">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Máximo 15MB · apenas PDF</p>
            </div>
          ) : (
            <Alert>
              <AlertDescription className="flex items-center gap-2 text-xs">
                <FileText className="h-4 w-4" />
                PDF enviado{parsing && " · analisando..."}
              </AlertDescription>
            </Alert>
          )}

          {uploadedUrl && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Número NF *</Label>
                  <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Série</Label>
                  <Input value={serie} onChange={(e) => setSerie(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data de emissão *</Label>
                  <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor total (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                </div>
              </div>

              {precisaClassificar && (
                <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs space-y-1">
                      <p className="font-medium">Valor diferente do contrato detectado</p>
                      <p className="text-muted-foreground">
                        Contrato: R$ {valorContrato.toFixed(2)} · NF: R$ {valorTotalNum.toFixed(2)} ·
                        Diferença: R$ {(valorTotalNum - valorContrato).toFixed(2)}
                      </p>
                      <p className="text-muted-foreground">
                        Classifique os valores extras abaixo (ex: extra de projeto, reembolso).
                        A parte do contrato é registrada automaticamente.
                      </p>
                    </div>
                  </div>

                  {classificacoes.map((c, i) => (
                    <Card key={i}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px]">Valor *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={c.valor}
                                onChange={(e) => updateClass(i, "valor", e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">Categoria *</Label>
                              <Select
                                value={c.categoria_valor}
                                onValueChange={(v) => updateClass(i, "categoria_valor", v)}
                              >
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(categorias || [])
                                    .filter((cat: any) => cat.valor !== "contrato")
                                    .map((cat: any) => (
                                      <SelectItem key={cat.valor} value={cat.valor}>{cat.label}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-[10px]">Descrição (ex: "Ajuste projeto X")</Label>
                              <Input
                                value={c.descricao_adicional}
                                onChange={(e) => updateClass(i, "descricao_adicional", e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-[10px]">Justificativa *</Label>
                              <Textarea
                                rows={2}
                                value={c.justificativa}
                                onChange={(e) => updateClass(i, "justificativa", e.target.value)}
                                placeholder="Explique por que esse valor extra"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeClassificacao(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button variant="outline" size="sm" onClick={addClassificacao} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" />
                    Adicionar extra
                  </Button>

                  {classificacoes.length > 0 && !classificacaoOK && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-xs">
                        Soma não fecha. Total declarado: R$ {somaTotal.toFixed(2)} · NF: R$ {valorTotalNum.toFixed(2)}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {bateComContrato && valorTotalNum > 0 && (
                <Alert>
                  <AlertDescription className="text-xs">
                    ✅ Valor bate com o contrato. Classificação automática: 100% mensalidade.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submeter.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmeter}
            disabled={!podeSubmeter || submeter.isPending}
            className="gap-2"
          >
            {submeter.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Submeter NF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
