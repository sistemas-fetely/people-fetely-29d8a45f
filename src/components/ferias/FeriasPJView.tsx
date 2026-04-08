import { useState } from "react";
import { format, addDays } from "date-fns";
import { Calendar, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useFeriasPJ, useCriarFeriasPJ, useAtualizarStatusFeriasPJ } from "@/hooks/useFerias";

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  programada: { label: "Programada", variant: "outline" },
  aprovada: { label: "Aprovada", variant: "secondary" },
  em_andamento: { label: "Em Andamento", variant: "default" },
  concluida: { label: "Concluída", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

interface Props {
  canManage: boolean;
}

export function FeriasPJView({ canManage }: Props) {
  const { data: ferias = [], isLoading } = useFeriasPJ();
  const criarMut = useCriarFeriasPJ();
  const atualizarMut = useAtualizarStatusFeriasPJ();

  const [showNova, setShowNova] = useState(false);
  const [busca, setBusca] = useState("");

  // Form
  const [contratoId, setContratoId] = useState("");
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dias, setDias] = useState(15);
  const [tipo, setTipo] = useState("recesso");
  const [obs, setObs] = useState("");

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos_pj_select_ferias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos_pj")
        .select("id, contato_nome, nome_fantasia, razao_social, departamento")
        .eq("status", "ativo")
        .order("contato_nome");
      if (error) throw error;
      return data;
    },
  });

  const filtered = ferias.filter((f) =>
    (f.contrato?.contato_nome ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (f.contrato?.nome_fantasia ?? f.contrato?.razao_social ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  const emAndamento = ferias.filter((f) => f.status === "em_andamento").length;
  const programadas = ferias.filter((f) => f.status === "programada" || f.status === "aprovada").length;
  const totalDias = ferias.filter((f) => f.status !== "cancelada").reduce((s, f) => s + f.dias, 0);

  const handleCriar = () => {
    if (!contratoId || !dataInicio) return;
    const dataFim = addDays(dataInicio, dias - 1);
    criarMut.mutate({
      contrato_id: contratoId,
      data_inicio: format(dataInicio, "yyyy-MM-dd"),
      data_fim: format(dataFim, "yyyy-MM-dd"),
      dias,
      tipo,
      observacoes: obs || null,
    }, {
      onSuccess: () => {
        setShowNova(false);
        setContratoId("");
        setDataInicio(undefined);
        setDias(15);
        setObs("");
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Em Andamento", value: emAndamento, color: "text-green-600 bg-green-50" },
          { label: "Programadas", value: programadas, color: "text-orange-600 bg-orange-50" },
          { label: "Total Dias (ano)", value: totalDias, color: "text-blue-600 bg-blue-50" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className={`rounded-lg p-2 ${k.color}`}>
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Input placeholder="Buscar prestador..." value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-sm" />
        <div className="flex-1" />
        {canManage && (
          <Button size="sm" onClick={() => setShowNova(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Recesso
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prestador</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-center">Dias</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 8 : 7} className="text-center text-muted-foreground py-8">
                  {isLoading ? "Carregando..." : "Nenhum recesso PJ registrado"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => {
                const st = STATUS[f.status] || STATUS.programada;
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.contrato?.contato_nome}</TableCell>
                    <TableCell>{f.contrato?.nome_fantasia || f.contrato?.razao_social}</TableCell>
                    <TableCell>{f.contrato?.departamento}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(f.data_inicio), "dd/MM/yyyy")} — {format(new Date(f.data_fim), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-center">{f.dias}</TableCell>
                    <TableCell>{f.tipo === "recesso" ? "Recesso" : "Férias Contratual"}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    {canManage && (
                      <TableCell className="text-right space-x-1">
                        {f.status === "programada" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => atualizarMut.mutate({ id: f.id, status: "aprovada" })}>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                        {(f.status === "programada" || f.status === "aprovada") && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => atualizarMut.mutate({ id: f.id, status: "cancelada" })}>
                            <X className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={showNova} onOpenChange={setShowNova}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Recesso PJ</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Contrato PJ</Label>
              <Select value={contratoId} onValueChange={setContratoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {contratos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contato_nome} — {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start", !dataInicio && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComp mode="single" selected={dataInicio} onSelect={setDataInicio} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Dias</Label>
                <Input type="number" value={dias} onChange={(e) => setDias(Number(e.target.value))} min={1} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recesso">Recesso</SelectItem>
                    <SelectItem value="ferias_contratual">Férias Contratual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNova(false)}>Cancelar</Button>
            <Button onClick={handleCriar} disabled={!contratoId || !dataInicio}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
