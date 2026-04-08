import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DadosPessoaisPJForm } from "@/lib/validations/contrato-pj";

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function StepDadosPessoaisPJ() {
  const { register, formState: { errors }, setValue, watch } = useFormContext<DadosPessoaisPJForm>();

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setValue("cnpj", formatted, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Dados do Responsável / Prestador</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <Label htmlFor="contato_nome">Nome Completo *</Label>
            <Input id="contato_nome" {...register("contato_nome")} placeholder="Nome do responsável" />
            {errors.contato_nome && <p className="text-xs text-destructive mt-1">{errors.contato_nome.message}</p>}
          </div>
          <div>
            <Label htmlFor="contato_telefone">Telefone</Label>
            <Input id="contato_telefone" {...register("contato_telefone")} placeholder="(00) 00000-0000" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="contato_email">Email</Label>
            <Input id="contato_email" type="email" {...register("contato_email")} placeholder="email@empresa.com" />
            {errors.contato_email && <p className="text-xs text-destructive mt-1">{errors.contato_email.message}</p>}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Dados da Empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              value={watch("cnpj") || ""}
              onChange={handleCNPJChange}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
            {errors.cnpj && <p className="text-xs text-destructive mt-1">{errors.cnpj.message}</p>}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="razao_social">Razão Social *</Label>
            <Input id="razao_social" {...register("razao_social")} />
            {errors.razao_social && <p className="text-xs text-destructive mt-1">{errors.razao_social.message}</p>}
          </div>
          <div>
            <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
            <Input id="nome_fantasia" {...register("nome_fantasia")} />
          </div>
          <div>
            <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
            <Input id="inscricao_municipal" {...register("inscricao_municipal")} />
          </div>
          <div>
            <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
            <Input id="inscricao_estadual" {...register("inscricao_estadual")} />
          </div>
        </div>
      </div>
    </div>
  );
}
