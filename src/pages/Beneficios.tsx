import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Briefcase } from "lucide-react";
import { BeneficiosCLTView } from "@/components/beneficios/BeneficiosCLTView";
import { BeneficiosPJView } from "@/components/beneficios/BeneficiosPJView";
import { usePermissions } from "@/hooks/usePermissions";

export default function Beneficios() {
  const { hasAnyRole, roles } = useAuth();
  const { userTipos } = usePermissions();
  const canManage = hasAnyRole(["super_admin", "gestor_rh", "financeiro"]);
  const isAdmin = hasAnyRole(["super_admin"]);

  const isColaboradorOnly = roles.length === 1 && roles[0] === "colaborador";
  const showCLT = !isColaboradorOnly || userTipos.includes("clt");
  const showPJ = !isColaboradorOnly || userTipos.includes("pj");

  const defaultTab = showCLT ? "clt" : "pj";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Benefícios</h1>
        <p className="text-muted-foreground">Controle de VT, VR, plano de saúde e outros benefícios</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          {showCLT && (
            <TabsTrigger value="clt" className="gap-1.5">
              <Users className="h-4 w-4" /> CLT
            </TabsTrigger>
          )}
          {showPJ && (
            <TabsTrigger value="pj" className="gap-1.5">
              <Briefcase className="h-4 w-4" /> PJ
            </TabsTrigger>
          )}
        </TabsList>

        {showCLT && (
          <TabsContent value="clt">
            <BeneficiosCLTView canManage={canManage} isAdmin={isAdmin} />
          </TabsContent>
        )}

        {showPJ && (
          <TabsContent value="pj">
            <BeneficiosPJView canManage={canManage} isAdmin={isAdmin} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
