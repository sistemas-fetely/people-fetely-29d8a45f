
CREATE OR REPLACE FUNCTION public.auto_criar_posicao_clt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _posicao_id uuid;
  _gestor_posicao_id uuid;
BEGIN
  -- First, try to find an existing vacant position with matching cargo and departamento
  SELECT id INTO _posicao_id
  FROM posicoes
  WHERE titulo_cargo = NEW.cargo
    AND departamento = NEW.departamento
    AND status IN ('vaga_aberta', 'previsto')
    AND colaborador_id IS NULL
    AND contrato_pj_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF _posicao_id IS NOT NULL THEN
    -- Link to existing position
    UPDATE posicoes
    SET colaborador_id = NEW.id,
        status = 'ocupado'
    WHERE id = _posicao_id;
  ELSE
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
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_criar_posicao_pj()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _posicao_id uuid;
BEGIN
  -- First, try to find an existing vacant position with matching cargo and departamento
  SELECT id INTO _posicao_id
  FROM posicoes
  WHERE titulo_cargo = NEW.tipo_servico
    AND departamento = NEW.departamento
    AND status IN ('vaga_aberta', 'previsto')
    AND colaborador_id IS NULL
    AND contrato_pj_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF _posicao_id IS NOT NULL THEN
    -- Link to existing position
    UPDATE posicoes
    SET contrato_pj_id = NEW.id,
        status = 'ocupado'
    WHERE id = _posicao_id;
  ELSE
    INSERT INTO posicoes (titulo_cargo, departamento, status, contrato_pj_id, nivel_hierarquico)
    VALUES (
      NEW.tipo_servico,
      NEW.departamento,
      CASE WHEN NEW.status IN ('ativo', 'rascunho') THEN 'ocupado' ELSE 'vaga_aberta' END,
      NEW.id,
      1
    );
  END IF;

  RETURN NEW;
END;
$$;
