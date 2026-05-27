import { Card, CardContent } from "@/components/ui/card";
import { useCreditoStats } from "@/hooks/credito/useCreditoStats";
import { Inbox, Search, Gavel, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function CreditoStatsCards() {
  const { data, isLoading } = useCreditoStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<Inbox className="h-5 w-5 text-primary" />}
        label="Entrada (Mariana)"
        value={data?.entrada || 0}
        hint="aguardando triagem"
      />
      <StatCard
        icon={<Search className="h-5 w-5 text-primary" />}
        label="Análise (Time)"
        value={data?.analise || 0}
        hint="aguardando anexos+IA"
      />
      <StatCard
        icon={<Gavel className="h-5 w-5 text-primary" />}
        label="Decisão (Joseph)"
        value={data?.decisao || 0}
        hint="aguardando decisão"
      />
      <StatCard
        icon={<CheckCircle2 className="h-5 w-5 text-success" />}
        label="Decididas no mês"
        value={data?.decididasMes || 0}
        hint={
          data
            ? `${data.aprovadasMes} aprov · ${data.reprovadasMes} reprov`
            : ""
        }
      />
    </div>
  );
}

function StatCard({
  icon, label, value, hint,
}: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="rounded-md bg-muted p-2">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
