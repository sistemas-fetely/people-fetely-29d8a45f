import { useFormContext, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Monitor, Smartphone, Laptop, Package } from "lucide-react";
import type { DadosEmpresaForm } from "@/lib/validations/colaborador-clt";

const SISTEMAS_PADRAO = [
  { sistema: "Bling", descricao: "ERP e gestão financeira" },
  { sistema: "Shopify", descricao: "E-commerce" },
  { sistema: "Mercus", descricao: "Gestão de desempenho" },
  { sistema: "Google Workspace", descricao: "Email, Drive, Calendar" },
  { sistema: "Slack", descricao: "Comunicação interna" },
];

const TIPOS_EQUIPAMENTO = [
  { value: "notebook", label: "Notebook", icon: Laptop },
  { value: "celular", label: "Celular", icon: Smartphone },
  { value: "monitor", label: "Monitor", icon: Monitor },
  { value: "desktop", label: "Desktop", icon: Package },
  { value: "headset", label: "Headset", icon: Package },
  { value: "teclado_mouse", label: "Teclado/Mouse", icon: Package },
  { value: "outro", label: "Outro", icon: Package },
];

const ESTADOS_EQUIPAMENTO = [
  { value: "novo", label: "Novo" },
  { value: "bom", label: "Bom estado" },
  { value: "regular", label: "Regular" },
  { value: "ruim", label: "Necessita manutenção" },
];

export function StepDadosEmpresa() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<DadosEmpresaForm>();

  const { fields: equipFields, append: addEquip, remove: removeEquip } = useFieldArray({
    name: "equipamentos",
  });

  const acessos = watch("acessos_sistemas") || [];

  // Initialize defaults if empty
  if (acessos.length === 0) {
    const defaults = SISTEMAS_PADRAO.map((s) => ({
      sistema: s.sistema,
      tem_acesso: false,
      usuario: "",
      observacoes: "",
    }));
    setValue("acessos_sistemas", defaults);
  }

  const handleToggleAcesso = (index: number, checked: boolean) => {
    setValue(`acessos_sistemas.${index}.tem_acesso`, checked);
    if (!checked) {
      setValue(`acessos_sistemas.${index}.usuario`, "");
    }
  };

  return (
    <div className="space-y-8">
      {/* Email Corporativo e Informações */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📧 Informações Corporativas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email_corporativo">Email Corporativo</Label>
            <Input
              id="email_corporativo"
              type="email"
              placeholder="colaborador@empresa.com.br"
              {...register("email_corporativo")}
            />
            {errors.email_corporativo && (
              <p className="text-xs text-destructive">{errors.email_corporativo.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ramal">Ramal</Label>
            <Input id="ramal" placeholder="Ex: 2045" {...register("ramal")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_integracao">Data de Integração</Label>
            <Input id="data_integracao" type="date" {...register("data_integracao")} />
          </div>
        </div>
      </div>

      {/* Acesso aos Sistemas */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🔐 Acesso aos Sistemas
        </h3>
        <div className="space-y-3">
          {acessos.map((acesso, index) => {
            const sistemaInfo = SISTEMAS_PADRAO.find((s) => s.sistema === acesso.sistema);
            return (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-sm">{acesso.sistema}</p>
                    {sistemaInfo && (
                      <p className="text-xs text-muted-foreground">{sistemaInfo.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`acesso-${index}`} className="text-xs text-muted-foreground">
                      {acesso.tem_acesso ? "Ativo" : "Sem acesso"}
                    </Label>
                    <Switch
                      id={`acesso-${index}`}
                      checked={acesso.tem_acesso}
                      onCheckedChange={(checked) => handleToggleAcesso(index, checked)}
                    />
                  </div>
                </div>
                {acesso.tem_acesso && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs">Usuário / Login</Label>
                      <Input
                        placeholder="nome.sobrenome ou email"
                        {...register(`acessos_sistemas.${index}.usuario`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Observações</Label>
                      <Input
                        placeholder="Perfil, permissões, etc."
                        {...register(`acessos_sistemas.${index}.observacoes`)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipamentos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            💻 Equipamentos
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              addEquip({
                tipo: "",
                marca: "",
                modelo: "",
                numero_patrimonio: "",
                numero_serie: "",
                data_entrega: "",
                estado: "novo",
                observacoes: "",
              })
            }
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {equipFields.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum equipamento cadastrado.</p>
            <p className="text-xs">Clique em "Adicionar" para registrar equipamentos do colaborador.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {equipFields.map((field, index) => {
              const tipoAtual = watch(`equipamentos.${index}.tipo`);
              const TipoIcon = TIPOS_EQUIPAMENTO.find((t) => t.value === tipoAtual)?.icon || Package;
              return (
                <div key={field.id} className="border rounded-lg p-4 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeEquip(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-2 mb-3">
                    <TipoIcon className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Equipamento {index + 1}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo *</Label>
                      <Select
                        value={tipoAtual}
                        onValueChange={(val) => setValue(`equipamentos.${index}.tipo`, val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_EQUIPAMENTO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(errors as any)?.equipamentos?.[index]?.tipo && (
                        <p className="text-xs text-destructive">{(errors as any).equipamentos[index].tipo.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Marca</Label>
                      <Input placeholder="Ex: Dell, Samsung" {...register(`equipamentos.${index}.marca`)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Modelo</Label>
                      <Input placeholder="Ex: Latitude 5520" {...register(`equipamentos.${index}.modelo`)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nº Patrimônio</Label>
                      <Input placeholder="Ex: PAT-00123" {...register(`equipamentos.${index}.numero_patrimonio`)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nº Série</Label>
                      <Input placeholder="Número de série" {...register(`equipamentos.${index}.numero_serie`)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data de Entrega</Label>
                      <Input type="date" {...register(`equipamentos.${index}.data_entrega`)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Estado</Label>
                      <Select
                        value={watch(`equipamentos.${index}.estado`)}
                        onValueChange={(val) => setValue(`equipamentos.${index}.estado`, val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS_EQUIPAMENTO.map((e) => (
                            <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Observações</Label>
                      <Input placeholder="Configurações, acessórios, etc." {...register(`equipamentos.${index}.observacoes`)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
