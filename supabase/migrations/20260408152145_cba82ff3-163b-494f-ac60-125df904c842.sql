
-- Drop old trigger that only fires on insert
DROP TRIGGER IF EXISTS trg_auto_criar_periodo_ferias ON public.colaboradores_clt;
DROP FUNCTION IF EXISTS public.auto_criar_periodo_ferias();

-- Function to generate all missing CLT vacation periods from admission date until now
CREATE OR REPLACE FUNCTION public.gerar_periodos_ferias_pendentes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  ultimo_fim DATE;
  novo_inicio DATE;
  novo_fim DATE;
BEGIN
  -- CLT: generate missing periods
  FOR r IN
    SELECT c.id AS colaborador_id, c.data_admissao
    FROM colaboradores_clt c
    WHERE c.status = 'ativo'
  LOOP
    -- Find the latest period end for this employee
    SELECT MAX(periodo_fim) INTO ultimo_fim
    FROM ferias_periodos
    WHERE colaborador_id = r.colaborador_id;

    -- If no period exists, start from admission date
    IF ultimo_fim IS NULL THEN
      novo_inicio := r.data_admissao;
    ELSE
      novo_inicio := ultimo_fim;
    END IF;

    -- Create periods until the next one would start after today
    WHILE novo_inicio <= CURRENT_DATE LOOP
      novo_fim := (novo_inicio + INTERVAL '365 days')::date;
      
      -- Check if this period already exists
      IF NOT EXISTS (
        SELECT 1 FROM ferias_periodos
        WHERE colaborador_id = r.colaborador_id
          AND periodo_inicio = novo_inicio
      ) THEN
        INSERT INTO ferias_periodos (colaborador_id, periodo_inicio, periodo_fim, dias_direito, status)
        VALUES (r.colaborador_id, novo_inicio, novo_fim, 30, 
          CASE WHEN novo_fim < CURRENT_DATE THEN 'vencido' ELSE 'em_aberto' END);
      END IF;
      
      novo_inicio := novo_fim;
    END LOOP;
  END LOOP;

  -- PJ: generate missing yearly recess entries
  FOR r IN
    SELECT cp.id AS contrato_id, cp.data_inicio
    FROM contratos_pj cp
    WHERE cp.status = 'ativo'
  LOOP
    SELECT MAX(data_fim) INTO ultimo_fim
    FROM ferias_pj
    WHERE contrato_id = r.contrato_id AND tipo = 'recesso';

    IF ultimo_fim IS NULL THEN
      novo_inicio := (r.data_inicio + INTERVAL '365 days')::date;
    ELSE
      novo_inicio := (ultimo_fim + INTERVAL '1 day')::date;
    END IF;

    -- For PJ we just ensure at least one "placeholder" recess period exists per year
    WHILE novo_inicio <= CURRENT_DATE + INTERVAL '365 days' LOOP
      novo_fim := (novo_inicio + INTERVAL '29 days')::date;
      
      IF NOT EXISTS (
        SELECT 1 FROM ferias_pj
        WHERE contrato_id = r.contrato_id
          AND EXTRACT(YEAR FROM data_inicio) = EXTRACT(YEAR FROM novo_inicio)
          AND tipo = 'recesso'
      ) THEN
        INSERT INTO ferias_pj (contrato_id, data_inicio, data_fim, dias, tipo, status)
        VALUES (r.contrato_id, novo_inicio, novo_fim, 30, 'recesso', 'programada');
      END IF;
      
      novo_inicio := (novo_inicio + INTERVAL '365 days')::date;
    END LOOP;
  END LOOP;
END;
$$;

-- Trigger for new CLT employees
CREATE OR REPLACE FUNCTION public.auto_criar_periodo_ferias_clt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_inicio DATE;
  novo_fim DATE;
BEGIN
  novo_inicio := NEW.data_admissao;
  WHILE novo_inicio <= CURRENT_DATE LOOP
    novo_fim := (novo_inicio + INTERVAL '365 days')::date;
    INSERT INTO ferias_periodos (colaborador_id, periodo_inicio, periodo_fim, dias_direito, status)
    VALUES (NEW.id, novo_inicio, novo_fim, 30,
      CASE WHEN novo_fim < CURRENT_DATE THEN 'vencido' ELSE 'em_aberto' END);
    novo_inicio := novo_fim;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_criar_periodo_ferias
AFTER INSERT ON public.colaboradores_clt
FOR EACH ROW
EXECUTE FUNCTION public.auto_criar_periodo_ferias_clt();

-- Trigger for new PJ contracts
CREATE OR REPLACE FUNCTION public.auto_criar_ferias_pj()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Don't auto-create if contract just started (less than 1 year)
  IF (NEW.data_inicio + INTERVAL '365 days')::date <= CURRENT_DATE THEN
    INSERT INTO ferias_pj (contrato_id, data_inicio, data_fim, dias, tipo, status)
    VALUES (NEW.id, 
      (NEW.data_inicio + INTERVAL '365 days')::date,
      (NEW.data_inicio + INTERVAL '394 days')::date,
      30, 'recesso', 'programada');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_criar_ferias_pj
AFTER INSERT ON public.contratos_pj
FOR EACH ROW
EXECUTE FUNCTION public.auto_criar_ferias_pj();

-- Now generate periods for all existing employees/contracts
SELECT public.gerar_periodos_ferias_pendentes();
