
CREATE TABLE public.ferias_periodos_pj (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos_pj(id) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  dias_direito INTEGER NOT NULL DEFAULT 30,
  dias_gozados INTEGER NOT NULL DEFAULT 0,
  dias_vendidos INTEGER NOT NULL DEFAULT 0,
  saldo INTEGER GENERATED ALWAYS AS (dias_direito - dias_gozados - dias_vendidos) STORED,
  status TEXT NOT NULL DEFAULT 'em_aberto',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ferias_periodos_pj ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin HR Fin can manage ferias_periodos_pj"
ON public.ferias_periodos_pj FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Gestor direto can view ferias_periodos_pj"
ON public.ferias_periodos_pj FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_direto'));

ALTER TABLE public.ferias_pj ADD COLUMN periodo_pj_id UUID REFERENCES public.ferias_periodos_pj(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_auto_criar_ferias_pj ON public.contratos_pj;
DROP FUNCTION IF EXISTS public.auto_criar_ferias_pj();

CREATE OR REPLACE FUNCTION public.auto_criar_ferias_pj()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE novo_inicio DATE; novo_fim DATE;
BEGIN
  novo_inicio := NEW.data_inicio;
  WHILE novo_inicio <= CURRENT_DATE LOOP
    novo_fim := (novo_inicio + INTERVAL '365 days')::date;
    INSERT INTO public.ferias_periodos_pj (contrato_id, periodo_inicio, periodo_fim, dias_direito, status)
    VALUES (NEW.id, novo_inicio, novo_fim, 30, CASE WHEN novo_fim < CURRENT_DATE THEN 'vencido' ELSE 'em_aberto' END);
    novo_inicio := novo_fim;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_auto_criar_ferias_pj AFTER INSERT ON public.contratos_pj FOR EACH ROW EXECUTE FUNCTION public.auto_criar_ferias_pj();

CREATE OR REPLACE FUNCTION public.gerar_periodos_ferias_pendentes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; ultimo_fim DATE; novo_inicio DATE; novo_fim DATE;
BEGIN
  FOR r IN SELECT c.id AS cid, c.data_admissao FROM colaboradores_clt c WHERE c.status = 'ativo' LOOP
    SELECT MAX(periodo_fim) INTO ultimo_fim FROM ferias_periodos WHERE colaborador_id = r.cid;
    novo_inicio := COALESCE(ultimo_fim, r.data_admissao);
    WHILE novo_inicio <= CURRENT_DATE LOOP
      novo_fim := (novo_inicio + INTERVAL '365 days')::date;
      IF NOT EXISTS (SELECT 1 FROM ferias_periodos WHERE colaborador_id = r.cid AND periodo_inicio = novo_inicio) THEN
        INSERT INTO ferias_periodos (colaborador_id, periodo_inicio, periodo_fim, dias_direito, status)
        VALUES (r.cid, novo_inicio, novo_fim, 30, CASE WHEN novo_fim < CURRENT_DATE THEN 'vencido' ELSE 'em_aberto' END);
      END IF;
      novo_inicio := novo_fim;
    END LOOP;
  END LOOP;
  FOR r IN SELECT cp.id AS cid, cp.data_inicio FROM contratos_pj cp WHERE cp.status = 'ativo' LOOP
    SELECT MAX(periodo_fim) INTO ultimo_fim FROM public.ferias_periodos_pj WHERE contrato_id = r.cid;
    novo_inicio := COALESCE(ultimo_fim, r.data_inicio);
    WHILE novo_inicio <= CURRENT_DATE LOOP
      novo_fim := (novo_inicio + INTERVAL '365 days')::date;
      IF NOT EXISTS (SELECT 1 FROM public.ferias_periodos_pj WHERE contrato_id = r.cid AND periodo_inicio = novo_inicio) THEN
        INSERT INTO public.ferias_periodos_pj (contrato_id, periodo_inicio, periodo_fim, dias_direito, status)
        VALUES (r.cid, novo_inicio, novo_fim, 30, CASE WHEN novo_fim < CURRENT_DATE THEN 'vencido' ELSE 'em_aberto' END);
      END IF;
      novo_inicio := novo_fim;
    END LOOP;
  END LOOP;
END; $$;

SELECT public.gerar_periodos_ferias_pendentes();
