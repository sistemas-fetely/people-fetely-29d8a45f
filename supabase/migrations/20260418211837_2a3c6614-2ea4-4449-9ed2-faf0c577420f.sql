-- 1.1 Adicionar unidade_id em colaboradores_clt e contratos_pj
ALTER TABLE public.colaboradores_clt
  ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES public.unidades(id);

ALTER TABLE public.contratos_pj
  ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES public.unidades(id);

CREATE INDEX IF NOT EXISTS idx_colaboradores_clt_unidade ON public.colaboradores_clt(unidade_id);
CREATE INDEX IF NOT EXISTS idx_contratos_pj_unidade ON public.contratos_pj(unidade_id);

-- 1.2 Migração de dados — registros existentes ficam em Matriz SP
UPDATE public.colaboradores_clt
SET unidade_id = (SELECT id FROM public.unidades WHERE codigo = 'matriz_sp')
WHERE unidade_id IS NULL;

UPDATE public.contratos_pj
SET unidade_id = (SELECT id FROM public.unidades WHERE codigo = 'matriz_sp')
WHERE unidade_id IS NULL;

-- 1.3 Adicionar template_id_padrao em cargos
ALTER TABLE public.cargos
  ADD COLUMN IF NOT EXISTS template_id_padrao UUID REFERENCES public.cargo_template(id);

-- 1.4 Função auxiliar: template_sugerido_para_cargo
CREATE OR REPLACE FUNCTION public.template_sugerido_para_cargo(_cargo_id UUID)
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cargo RECORD;
  v_template_codigo TEXT;
  v_template_id UUID;
BEGIN
  SELECT * INTO v_cargo FROM public.cargos WHERE id = _cargo_id;
  IF v_cargo IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_cargo.template_id_padrao IS NOT NULL THEN
    RETURN v_cargo.template_id_padrao;
  END IF;

  v_template_codigo := CASE v_cargo.nivel
    WHEN 'jr'             THEN 'analista'
    WHEN 'pl'             THEN 'analista'
    WHEN 'sr'             THEN 'analista'
    WHEN 'coordenacao'    THEN 'coordenador'
    WHEN 'especialista'   THEN 'analista'
    WHEN 'c_level'        THEN 'diretor'
    ELSE 'analista'
  END;

  SELECT id INTO v_template_id
  FROM public.cargo_template
  WHERE codigo = v_template_codigo AND is_sistema = true
  LIMIT 1;

  RETURN v_template_id;
END;
$$;

COMMENT ON FUNCTION public.template_sugerido_para_cargo IS
  'Resolve o template a usar para um cargo: prioriza template_id_padrao explícito, senão deriva do nível.';