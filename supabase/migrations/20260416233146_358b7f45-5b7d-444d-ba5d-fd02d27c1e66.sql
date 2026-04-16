ALTER TABLE public.ti_ativos
ADD COLUMN IF NOT EXISTS condicao TEXT DEFAULT 'otima' CHECK (condicao IN ('otima', 'muito_boa', 'boa', 'inativo')),
ADD COLUMN IF NOT EXISTS valor_atual_mercado NUMERIC,
ADD COLUMN IF NOT EXISTS valor_estimado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS especificacoes JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fotos TEXT[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.ti_ativos_condicao_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.condicao = 'inativo' AND (OLD.condicao IS NULL OR OLD.condicao != 'inativo') THEN
    NEW.status = 'descartado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ti_ativos_condicao_change ON public.ti_ativos;
CREATE TRIGGER ti_ativos_condicao_change
  BEFORE UPDATE ON public.ti_ativos
  FOR EACH ROW
  EXECUTE FUNCTION public.ti_ativos_condicao_trigger();

INSERT INTO storage.buckets (id, name, public)
VALUES ('ti-ativos', 'ti-ativos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can upload ti-ativos" ON storage.objects;
CREATE POLICY "Authenticated can upload ti-ativos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ti-ativos');

DROP POLICY IF EXISTS "Public can read ti-ativos" ON storage.objects;
CREATE POLICY "Public can read ti-ativos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'ti-ativos');

DROP POLICY IF EXISTS "Authenticated can delete ti-ativos" ON storage.objects;
CREATE POLICY "Authenticated can delete ti-ativos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ti-ativos');

DROP POLICY IF EXISTS "Authenticated can update ti-ativos" ON storage.objects;
CREATE POLICY "Authenticated can update ti-ativos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ti-ativos');