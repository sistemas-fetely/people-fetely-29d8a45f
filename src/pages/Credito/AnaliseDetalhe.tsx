// Placeholder da tela de detalhe de análise (Tela 4/6/8 conforme estágio).
// Substituído pelas telas completas nas Sub-fases 4.2 a 4.4.
import { useParams } from "react-router-dom";

export default function AnaliseDetalhe() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Análise {id?.slice(0, 8)}...</h1>
      <p className="text-sm text-muted-foreground">
        Placeholder. Tela construída nas sub-fases 4.2 (Mariana), 4.3 (Time) e 4.4 (Joseph).
      </p>
    </div>
  );
}
