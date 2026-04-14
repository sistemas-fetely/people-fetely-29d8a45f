import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function PortalCandidatura() {
  const { id } = useParams<{ id: string }>();
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [motivacao, setMotivacao] = useState("");
  const [lgpdAceito, setLgpdAceito] = useState(false);

  const { data: vaga, isLoading } = useQuery({
    queryKey: ["vaga-publica", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("candidatos").insert({
        vaga_id: id!,
        nome,
        email,
        telefone: telefone || null,
        linkedin_url: linkedin || null,
        portfolio_url: portfolio || null,
        origem: "portal",
        status: "recebido",
        consentimento_lgpd: true,
        consentimento_lgpd_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => toast.error(err.message || "Erro ao enviar candidatura"),
  });

  const formValid = nome.trim() && email.trim() && email.includes("@") && lgpdAceito;

  const vagaDisponivel = vaga && vaga.status === "aberta";

  // Header component
  const Header = () => (
    <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "hsl(156, 28%, 22%)" }}>
            Fetély.
          </h1>
        </div>
        <p className="text-xs text-muted-foreground italic hidden sm:block max-w-[260px] text-right">
          Questionando a forma como celebramos. Criando algo novo...
        </p>
      </div>
    </header>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-6 py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!vaga || !vagaDisponivel) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Esta vaga não está mais disponível.</h2>
          <p className="text-muted-foreground">
            A posição pode ter sido encerrada ou preenchida. Obrigado pelo interesse!
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Recebemos sua candidatura!</h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            Vamos analisar com cuidado e retornaremos em breve.
            <br />
            <span className="italic">Obrigado por querer celebrar com a gente.</span>
          </p>
        </div>
      </div>
    );
  }

  const tipoLabel = vaga.tipo_contrato === "clt" ? "CLT" : vaga.tipo_contrato === "pj" ? "PJ" : "CLT / PJ";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Vaga info */}
        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-primary">{vaga.titulo}</h2>

          <p className="text-sm text-muted-foreground">
            {vaga.area} · {tipoLabel}
            {vaga.local_trabalho ? ` · ${vaga.local_trabalho}` : ""}
          </p>

          {vaga.missao && (
            <p className="text-base text-muted-foreground italic leading-relaxed border-l-2 border-primary/30 pl-4">
              {vaga.missao}
            </p>
          )}

          {/* Skills */}
          {((vaga.skills_obrigatorias as string[] | null)?.length || (vaga.skills_desejadas as string[] | null)?.length) && (
            <div className="space-y-2 pt-2">
              {(vaga.skills_obrigatorias as string[] | null)?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {(vaga.skills_obrigatorias as string[]).map((s) => (
                    <Badge key={s} className="bg-primary/15 text-primary border-primary/30 text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {(vaga.skills_desejadas as string[] | null)?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {(vaga.skills_desejadas as string[]).map((s) => (
                    <Badge key={s} variant="outline" className="text-xs text-muted-foreground">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <hr className="border-border/50" />

        {/* Formulário */}
        <section className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Candidate-se</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Preencha suas informações — sem burocracia.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome completo *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn</Label>
              <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/seu-perfil" />
            </div>
            <div className="space-y-1.5">
              <Label>Portfólio / GitHub</Label>
              <Input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Por que você quer fazer parte da Fetely?</Label>
            <Textarea
              value={motivacao}
              onChange={(e) => setMotivacao(e.target.value)}
              placeholder="Conte um pouco sobre você e por que essa vaga faz sentido na sua história..."
              rows={4}
            />
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="lgpd"
              checked={lgpdAceito}
              onCheckedChange={(v) => setLgpdAceito(!!v)}
              className="mt-1"
            />
            <label htmlFor="lgpd" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              Concordo com o uso dos meus dados pela Fetely para este processo seletivo.
              Dados retidos por até 180 dias após encerramento da vaga. (LGPD)
            </label>
          </div>

          <Button
            size="lg"
            className="w-full sm:w-auto px-8"
            disabled={!formValid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Quero fazer parte
          </Button>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pt-10 pb-6 border-t border-border/30">
          © {new Date().getFullYear()} Fetely · Todos os direitos reservados
        </footer>
      </main>
    </div>
  );
}
