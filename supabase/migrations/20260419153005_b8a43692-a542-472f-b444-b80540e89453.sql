-- PF3 Part 1.1: diagrama_mermaid no processo
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS diagrama_mermaid TEXT;

COMMENT ON COLUMN public.processos.diagrama_mermaid IS
  'Diagrama em sintaxe Mermaid (flowchart, sequence, etc). Opcional. NULL = processo sem desenho.';

-- PF3 Part 1.5: snapshot do diagrama em versões
ALTER TABLE public.processos_versoes ADD COLUMN IF NOT EXISTS diagrama_snapshot TEXT;

-- PF3 Part 1.3: tabela processos_ligacoes
CREATE TABLE IF NOT EXISTS public.processos_ligacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_origem_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  processo_destino_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  tipo_ligacao TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  UNIQUE (processo_origem_id, processo_destino_id, tipo_ligacao),
  CHECK (processo_origem_id <> processo_destino_id)
);

CREATE INDEX IF NOT EXISTS idx_processos_ligacoes_origem ON public.processos_ligacoes(processo_origem_id);
CREATE INDEX IF NOT EXISTS idx_processos_ligacoes_destino ON public.processos_ligacoes(processo_destino_id);

ALTER TABLE public.processos_ligacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "processos_ligacoes_read" ON public.processos_ligacoes;
CREATE POLICY "processos_ligacoes_read" ON public.processos_ligacoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "processos_ligacoes_write_super_admin" ON public.processos_ligacoes;
CREATE POLICY "processos_ligacoes_write_super_admin" ON public.processos_ligacoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- PF3 Part 1.4: view expandida de ligações
CREATE OR REPLACE VIEW public.processos_ligacoes_expandidas AS
SELECT
  l.id,
  l.processo_origem_id,
  po.nome AS origem_nome,
  po.codigo AS origem_codigo,
  l.processo_destino_id,
  pd.nome AS destino_nome,
  pd.codigo AS destino_codigo,
  l.tipo_ligacao,
  pa.label AS tipo_ligacao_label,
  l.descricao,
  l.ordem,
  l.criado_em
FROM public.processos_ligacoes l
JOIN public.processos po ON po.id = l.processo_origem_id
JOIN public.processos pd ON pd.id = l.processo_destino_id
LEFT JOIN public.parametros pa ON pa.categoria = 'tipo_ligacao_processo' AND pa.valor = l.tipo_ligacao;

ALTER VIEW public.processos_ligacoes_expandidas SET (security_invoker = true);
GRANT SELECT ON public.processos_ligacoes_expandidas TO authenticated;

-- PF3 Part 1.5: atualizar função de publicar versão para incluir diagrama_snapshot
CREATE OR REPLACE FUNCTION public.processos_publicar_versao(
  _processo_id UUID,
  _motivo TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  p RECORD;
  nova_versao INTEGER;
  v_tags_snapshot JSONB;
BEGIN
  SELECT * INTO p FROM public.processos WHERE id = _processo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Processo não encontrado: %', _processo_id;
  END IF;

  IF NOT (has_role(auth.uid(), 'super_admin') OR p.owner_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para publicar versão deste processo';
  END IF;

  nova_versao := p.versao_atual + 1;

  v_tags_snapshot := jsonb_build_object(
    'areas', (SELECT coalesce(jsonb_agg(area_id), '[]'::jsonb) FROM public.processos_tags_areas WHERE processo_id = _processo_id),
    'departamentos', (SELECT coalesce(jsonb_agg(departamento_id), '[]'::jsonb) FROM public.processos_tags_departamentos WHERE processo_id = _processo_id),
    'unidades', (SELECT coalesce(jsonb_agg(unidade_id), '[]'::jsonb) FROM public.processos_tags_unidades WHERE processo_id = _processo_id),
    'cargos', (SELECT coalesce(jsonb_agg(cargo_id), '[]'::jsonb) FROM public.processos_tags_cargos WHERE processo_id = _processo_id),
    'sistemas', (SELECT coalesce(jsonb_agg(sistema_id), '[]'::jsonb) FROM public.processos_tags_sistemas WHERE processo_id = _processo_id),
    'tipos_colaborador', (SELECT coalesce(jsonb_agg(tipo), '[]'::jsonb) FROM public.processos_tags_tipos_colaborador WHERE processo_id = _processo_id)
  );

  INSERT INTO public.processos_versoes (
    processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot,
    natureza_snapshot, tags_snapshot, diagrama_snapshot, publicado_por, motivo_alteracao
  ) VALUES (
    _processo_id, nova_versao, p.nome, p.descricao, p.narrativa,
    p.natureza_valor, v_tags_snapshot, p.diagrama_mermaid, auth.uid(), _motivo
  );

  UPDATE public.processos
  SET versao_atual = nova_versao,
      versao_vigente_em = now(),
      status_valor = 'vigente',
      updated_at = now()
  WHERE id = _processo_id;

  RETURN nova_versao;
END;
$$;