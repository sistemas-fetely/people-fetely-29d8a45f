
-- Trigger: auto-create position when CLT employee is inserted
CREATE OR REPLACE FUNCTION public.auto_criar_posicao_clt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _gestor_posicao_id uuid;
BEGIN
  -- Try to find parent position via gestor_direto_id
  IF NEW.gestor_direto_id IS NOT NULL THEN
    SELECT p.id INTO _gestor_posicao_id
    FROM posicoes p
    JOIN colaboradores_clt c ON c.user_id = NEW.gestor_direto_id AND p.colaborador_id = c.id
    LIMIT 1;
  END IF;

  INSERT INTO posicoes (titulo_cargo, departamento, status, colaborador_id, id_pai, nivel_hierarquico)
  VALUES (
    NEW.cargo,
    NEW.departamento,
    CASE WHEN NEW.status = 'ativo' THEN 'ocupado' ELSE 'vaga_aberta' END,
    NEW.id,
    _gestor_posicao_id,
    CASE WHEN _gestor_posicao_id IS NOT NULL THEN 2 ELSE 1 END
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_criar_posicao_clt
AFTER INSERT ON public.colaboradores_clt
FOR EACH ROW
EXECUTE FUNCTION public.auto_criar_posicao_clt();

-- Trigger: auto-create position when PJ contract is inserted
CREATE OR REPLACE FUNCTION public.auto_criar_posicao_pj()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO posicoes (titulo_cargo, departamento, status, contrato_pj_id, nivel_hierarquico)
  VALUES (
    NEW.tipo_servico,
    NEW.departamento,
    CASE WHEN NEW.status IN ('ativo', 'rascunho') THEN 'ocupado' ELSE 'vaga_aberta' END,
    NEW.id,
    1
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_criar_posicao_pj
AFTER INSERT ON public.contratos_pj
FOR EACH ROW
EXECUTE FUNCTION public.auto_criar_posicao_pj();

-- Trigger: update position when CLT employee cargo/departamento/status changes
CREATE OR REPLACE FUNCTION public.auto_atualizar_posicao_clt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.cargo IS DISTINCT FROM NEW.cargo
     OR OLD.departamento IS DISTINCT FROM NEW.departamento
     OR OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE posicoes
    SET titulo_cargo = NEW.cargo,
        departamento = NEW.departamento,
        status = CASE
          WHEN NEW.status IN ('desligado', 'afastado') THEN 'vaga_aberta'
          ELSE 'ocupado'
        END,
        colaborador_id = CASE
          WHEN NEW.status = 'desligado' THEN NULL
          ELSE NEW.id
        END
    WHERE colaborador_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_atualizar_posicao_clt
AFTER UPDATE ON public.colaboradores_clt
FOR EACH ROW
EXECUTE FUNCTION public.auto_atualizar_posicao_clt();

-- Trigger: update position when PJ contract changes
CREATE OR REPLACE FUNCTION public.auto_atualizar_posicao_pj()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.tipo_servico IS DISTINCT FROM NEW.tipo_servico
     OR OLD.departamento IS DISTINCT FROM NEW.departamento
     OR OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE posicoes
    SET titulo_cargo = NEW.tipo_servico,
        departamento = NEW.departamento,
        status = CASE
          WHEN NEW.status IN ('encerrado', 'cancelado') THEN 'vaga_aberta'
          ELSE 'ocupado'
        END,
        contrato_pj_id = CASE
          WHEN NEW.status = 'encerrado' THEN NULL
          ELSE NEW.id
        END
    WHERE contrato_pj_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_atualizar_posicao_pj
AFTER UPDATE ON public.contratos_pj
FOR EACH ROW
EXECUTE FUNCTION public.auto_atualizar_posicao_pj();

-- Create positions for existing records that don't have one yet
INSERT INTO posicoes (titulo_cargo, departamento, status, colaborador_id, nivel_hierarquico)
SELECT c.cargo, c.departamento, 
  CASE WHEN c.status = 'ativo' THEN 'ocupado' ELSE 'vaga_aberta' END,
  c.id, 1
FROM colaboradores_clt c
WHERE NOT EXISTS (SELECT 1 FROM posicoes p WHERE p.colaborador_id = c.id);

INSERT INTO posicoes (titulo_cargo, departamento, status, contrato_pj_id, nivel_hierarquico)
SELECT cp.tipo_servico, cp.departamento,
  CASE WHEN cp.status = 'ativo' THEN 'ocupado' ELSE 'vaga_aberta' END,
  cp.id, 1
FROM contratos_pj cp
WHERE NOT EXISTS (SELECT 1 FROM posicoes p WHERE p.contrato_pj_id = cp.id);
