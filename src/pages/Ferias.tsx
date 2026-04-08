import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Briefcase } from "lucide-react";
import { FeriasCLTView } from "@/components/ferias/FeriasCLTView";
import { FeriasPJView } from "@/components/ferias/FeriasPJView";

export default function Ferias() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["super_admin", "gestor_rh", "financeiro"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Férias</h1>
        <p className="text-muted-foreground">Controle de períodos aquisitivos, programação e recessos</p>
      </div>

      <Tabs defaultValue="clt" className="w-full">
        <TabsList>
          <TabsTrigger value="clt" className="gap-1.5">
            <Users className="h-4 w-4" /> CLT
          </TabsTrigger>
          <TabsTrigger value="pj" className="gap-1.5">
            <Briefcase className="h-4 w-4" /> PJ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clt">
          <FeriasCLTView canManage={canManage} />
        </TabsContent>

        <TabsContent value="pj">
          <FeriasPJView canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
