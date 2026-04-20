-- ============================================================
-- Mural Fetely · MVP — Celebrações automáticas
-- ============================================================

-- ═══ 1. Tabela mural_publicacoes ═══
CREATE TABLE IF NOT EXISTS public.mural_publicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'celebracao_pessoa',
    'celebracao_tempo_casa',
    'celebracao_promocao',
    'celebracao_kpi',
    'celebracao_marca',
    'celebracao_aprendizado',
    'celebracao_reconhecimento',
    'comunicado_convite'
  )),
  subtipo TEXT,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  emoji TEXT,
  foto_url TEXT,
  pessoa_alvo_id UUID,
  pessoa_alvo_tipo TEXT CHECK (pessoa_alvo_tipo IS NULL OR pessoa_alvo_tipo IN ('clt', 'pj')),
  pessoa_alvo_nome TEXT,
  area_alvo TEXT,
  kpi_id UUID,
  status TEXT NOT NULL DEFAULT 'publicada' CHECK (status IN (
    'rascunho', 'pendente_aprovacao', 'publicada', 'agendada', 'arquivada', 'rejeitada'
  )),
  origem TEXT NOT NULL DEFAULT 'automatico' CHECK (origem IN (
    'automatico', 'submissao_colaborador', 'rh_manual', 'kpi_sistema'
  )),
  criado_por UUID REFERENCES auth.users(id),
  aprovado_por UUID REFERENCES auth.users(id),
  data_evento DATE,
  publicado_em TIMESTAMPTZ DEFAULT now(),
  expira_em TIMESTAMPTZ,
  fixado BOOLEAN DEFAULT false,
  cor_tema TEXT DEFAULT 'rosa',
  segmentacao JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mural_publicacoes_status_exp ON public.mural_publicacoes(status, expira_em DESC) WHERE status = 'publicada';
CREATE INDEX IF NOT EXISTS idx_mural_publicacoes_tipo ON public.mural_publicacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_mural_publicacoes_pessoa ON public.mural_publicacoes(pessoa_alvo_id) WHERE pessoa_alvo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mural_publicacoes_fixado ON public.mural_publicacoes(fixado) WHERE fixado = true;

COMMENT ON TABLE public.mural_publicacoes IS 'Mural Fetely — onde a Fetely celebra o que importa.';

-- ═══ 2. Updated_at trigger ═══
CREATE TRIGGER trg_mural_publicacoes_updated_at
  BEFORE UPDATE ON public.mural_publicacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ 3. RLS ═══
ALTER TABLE public.mural_publicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mural_read_publicadas" ON public.mural_publicacoes
  FOR SELECT TO authenticated
  USING (status = 'publicada');

CREATE POLICY "mural_read_admin_full" ON public.mural_publicacoes
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_rh'::app_role)
  );

CREATE POLICY "mural_insert_admin" ON public.mural_publicacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_rh'::app_role)
  );

CREATE POLICY "mural_update_admin" ON public.mural_publicacoes
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_rh'::app_role)
  );

CREATE POLICY "mural_delete_super" ON public.mural_publicacoes
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ═══ 4. Tabela de preferências individuais ═══
CREATE TABLE IF NOT EXISTS public.mural_preferencias_usuario (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  aparecer_no_mural BOOLEAN NOT NULL DEFAULT true,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mural_preferencias_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mural_pref_self" ON public.mural_preferencias_usuario
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mural_pref_read_admin" ON public.mural_preferencias_usuario
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
  );

COMMENT ON TABLE public.mural_preferencias_usuario IS 'Opt-out individual do Mural Fetely. Default: pessoa aparece.';

-- ═══ 5. Função helper opt-in ═══
CREATE OR REPLACE FUNCTION public.pessoa_aparece_no_mural(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT aparecer_no_mural FROM public.mural_preferencias_usuario WHERE user_id = _user_id),
    true
  );
$$;

-- ═══ 6. Gerar celebrações de aniversário ═══
CREATE OR REPLACE FUNCTION public.gerar_celebracoes_aniversario_mural()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registro RECORD;
  v_total INTEGER := 0;
  v_mensagens TEXT[] := ARRAY[
    'Hoje é o dia de celebrar você, %s! 🌸 Que seja um ano cheio de alegria, intenção e gestos que importam.',
    'Parabéns, %s! 🎂 Hoje a Fetely celebra você — e a gente sabe, gesto não se delega pra ninguém.',
    'Feliz aniversário, %s! ✨ Que esse novo ciclo seja feito dos detalhes que só você sabe fazer especial.',
    'Hoje é seu dia, %s! 💚 A Fetely inteira comemora junto com você.',
    '%s, hoje é sobre você! 🌸 Muita luz, muita paz e muita celebração — do jeitinho Fetely.'
  ];
  v_mensagem_pick TEXT;
  v_cores TEXT[] := ARRAY['rosa', 'verde', 'creme', 'sage'];
  v_cor_pick TEXT;
BEGIN
  FOR v_registro IN
    SELECT c.id, c.nome_completo, c.foto_url, c.user_id, c.data_nascimento
    FROM public.colaboradores_clt c
    WHERE c.status = 'ativo'
      AND c.data_nascimento IS NOT NULL
      AND TO_CHAR(c.data_nascimento, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD')
      AND (c.user_id IS NULL OR public.pessoa_aparece_no_mural(c.user_id))
      AND NOT EXISTS (
        SELECT 1 FROM public.mural_publicacoes mp
        WHERE mp.pessoa_alvo_id = c.id
          AND mp.subtipo = 'aniversario'
          AND mp.data_evento = CURRENT_DATE
          AND mp.status IN ('publicada', 'pendente_aprovacao')
      )
  LOOP
    v_mensagem_pick := v_mensagens[1 + floor(random() * array_length(v_mensagens, 1))::INT];
    v_cor_pick := v_cores[1 + floor(random() * array_length(v_cores, 1))::INT];
    INSERT INTO public.mural_publicacoes (
      tipo, subtipo, titulo, mensagem, emoji, foto_url,
      pessoa_alvo_id, pessoa_alvo_tipo, pessoa_alvo_nome,
      status, origem, data_evento, publicado_em, expira_em, cor_tema
    ) VALUES (
      'celebracao_pessoa', 'aniversario',
      'Aniversário de ' || v_registro.nome_completo,
      format(v_mensagem_pick, v_registro.nome_completo),
      '🎂', v_registro.foto_url,
      v_registro.id, 'clt', v_registro.nome_completo,
      'publicada', 'automatico', CURRENT_DATE, now(),
      (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ,
      v_cor_pick
    );
    v_total := v_total + 1;
  END LOOP;

  FOR v_registro IN
    SELECT p.id, p.contato_nome AS nome_completo, p.foto_url, p.user_id, p.data_nascimento
    FROM public.contratos_pj p
    WHERE p.status = 'ativo'
      AND p.categoria_pj = 'colaborador'
      AND p.data_nascimento IS NOT NULL
      AND TO_CHAR(p.data_nascimento, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD')
      AND (p.user_id IS NULL OR public.pessoa_aparece_no_mural(p.user_id))
      AND NOT EXISTS (
        SELECT 1 FROM public.mural_publicacoes mp
        WHERE mp.pessoa_alvo_id = p.id
          AND mp.subtipo = 'aniversario'
          AND mp.data_evento = CURRENT_DATE
          AND mp.status IN ('publicada', 'pendente_aprovacao')
      )
  LOOP
    v_mensagem_pick := v_mensagens[1 + floor(random() * array_length(v_mensagens, 1))::INT];
    v_cor_pick := v_cores[1 + floor(random() * array_length(v_cores, 1))::INT];
    INSERT INTO public.mural_publicacoes (
      tipo, subtipo, titulo, mensagem, emoji, foto_url,
      pessoa_alvo_id, pessoa_alvo_tipo, pessoa_alvo_nome,
      status, origem, data_evento, publicado_em, expira_em, cor_tema
    ) VALUES (
      'celebracao_pessoa', 'aniversario',
      'Aniversário de ' || v_registro.nome_completo,
      format(v_mensagem_pick, v_registro.nome_completo),
      '🎂', v_registro.foto_url,
      v_registro.id, 'pj', v_registro.nome_completo,
      'publicada', 'automatico', CURRENT_DATE, now(),
      (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ,
      v_cor_pick
    );
    v_total := v_total + 1;
  END LOOP;

  RETURN v_total;
END $$;

-- ═══ 7. Gerar marcos de tempo de casa ═══
CREATE OR REPLACE FUNCTION public.gerar_celebracoes_tempo_casa_mural()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registro RECORD;
  v_total INTEGER := 0;
  v_anos INTEGER;
  v_cor_pick TEXT;
BEGIN
  FOR v_registro IN
    SELECT c.id, c.nome_completo, c.foto_url, c.user_id, c.data_admissao,
           EXTRACT(YEAR FROM age(CURRENT_DATE, c.data_admissao))::INT AS anos_casa
    FROM public.colaboradores_clt c
    WHERE c.status = 'ativo'
      AND c.data_admissao IS NOT NULL
      AND TO_CHAR(c.data_admissao, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD')
      AND c.data_admissao < CURRENT_DATE
      AND EXTRACT(YEAR FROM age(CURRENT_DATE, c.data_admissao))::INT IN (1, 2, 3, 5, 10)
      AND (c.user_id IS NULL OR public.pessoa_aparece_no_mural(c.user_id))
      AND NOT EXISTS (
        SELECT 1 FROM public.mural_publicacoes mp
        WHERE mp.pessoa_alvo_id = c.id
          AND mp.subtipo LIKE 'tempo_casa_%'
          AND mp.data_evento = CURRENT_DATE
      )
  LOOP
    v_anos := v_registro.anos_casa;
    v_cor_pick := CASE v_anos
      WHEN 1 THEN 'sage' WHEN 2 THEN 'verde' WHEN 3 THEN 'rosa'
      WHEN 5 THEN 'bordo' WHEN 10 THEN 'bordo'
    END;
    INSERT INTO public.mural_publicacoes (
      tipo, subtipo, titulo, mensagem, emoji, foto_url,
      pessoa_alvo_id, pessoa_alvo_tipo, pessoa_alvo_nome,
      status, origem, data_evento, publicado_em, expira_em, cor_tema
    ) VALUES (
      'celebracao_tempo_casa', 'tempo_casa_' || v_anos || '_anos',
      v_anos || ' ano' || CASE WHEN v_anos > 1 THEN 's' ELSE '' END || ' de Fetely com ' || v_registro.nome_completo,
      CASE v_anos
        WHEN 1 THEN 'Um ano já! 🌱 Parabéns, ' || v_registro.nome_completo || ' — sua marca já faz parte de quem a Fetely é hoje.'
        WHEN 2 THEN 'Dois anos de construção junto. 💚 Obrigada por tudo, ' || v_registro.nome_completo || '!'
        WHEN 3 THEN 'Três anos! ✨ ' || v_registro.nome_completo || ', sua história já é parte indispensável da Fetely.'
        WHEN 5 THEN 'Cinco anos de Fetely! 🌟 ' || v_registro.nome_completo || ', você é raiz dessa casa.'
        WHEN 10 THEN 'Uma década juntos, ' || v_registro.nome_completo || '! 🏆 Obrigada por ser parte essencial desse sonho.'
      END,
      CASE v_anos WHEN 1 THEN '🌱' WHEN 2 THEN '💚' WHEN 3 THEN '✨' WHEN 5 THEN '🌟' WHEN 10 THEN '🏆' END,
      v_registro.foto_url,
      v_registro.id, 'clt', v_registro.nome_completo,
      'publicada', 'automatico', CURRENT_DATE, now(),
      (CURRENT_DATE + INTERVAL '3 days')::TIMESTAMPTZ,
      v_cor_pick
    );
    v_total := v_total + 1;
  END LOOP;

  FOR v_registro IN
    SELECT p.id, p.contato_nome AS nome_completo, p.foto_url, p.user_id, p.data_inicio AS data_admissao,
           EXTRACT(YEAR FROM age(CURRENT_DATE, p.data_inicio))::INT AS anos_casa
    FROM public.contratos_pj p
    WHERE p.status = 'ativo'
      AND p.categoria_pj = 'colaborador'
      AND p.data_inicio IS NOT NULL
      AND TO_CHAR(p.data_inicio, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD')
      AND p.data_inicio < CURRENT_DATE
      AND EXTRACT(YEAR FROM age(CURRENT_DATE, p.data_inicio))::INT IN (1, 2, 3, 5, 10)
      AND (p.user_id IS NULL OR public.pessoa_aparece_no_mural(p.user_id))
      AND NOT EXISTS (
        SELECT 1 FROM public.mural_publicacoes mp
        WHERE mp.pessoa_alvo_id = p.id
          AND mp.subtipo LIKE 'tempo_casa_%'
          AND mp.data_evento = CURRENT_DATE
      )
  LOOP
    v_anos := v_registro.anos_casa;
    v_cor_pick := CASE v_anos WHEN 1 THEN 'sage' WHEN 2 THEN 'verde' WHEN 3 THEN 'rosa' ELSE 'bordo' END;
    INSERT INTO public.mural_publicacoes (
      tipo, subtipo, titulo, mensagem, emoji, foto_url,
      pessoa_alvo_id, pessoa_alvo_tipo, pessoa_alvo_nome,
      status, origem, data_evento, publicado_em, expira_em, cor_tema
    ) VALUES (
      'celebracao_tempo_casa', 'tempo_casa_' || v_anos || '_anos',
      v_anos || ' ano' || CASE WHEN v_anos > 1 THEN 's' ELSE '' END || ' de Fetely com ' || v_registro.nome_completo,
      v_anos || ' ano' || CASE WHEN v_anos > 1 THEN 's' ELSE '' END || ' de parceria, ' || v_registro.nome_completo || '! 💚 Obrigada por construir Fetely com a gente.',
      CASE v_anos WHEN 1 THEN '🌱' WHEN 2 THEN '💚' WHEN 3 THEN '✨' WHEN 5 THEN '🌟' WHEN 10 THEN '🏆' END,
      v_registro.foto_url,
      v_registro.id, 'pj', v_registro.nome_completo,
      'publicada', 'automatico', CURRENT_DATE, now(),
      (CURRENT_DATE + INTERVAL '3 days')::TIMESTAMPTZ,
      v_cor_pick
    );
    v_total := v_total + 1;
  END LOOP;

  RETURN v_total;
END $$;

-- ═══ 8. Batch orquestrador ═══
CREATE OR REPLACE FUNCTION public.processar_mural_fetely_diario()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anivs INTEGER;
  v_tempo INTEGER;
  v_arquivadas INTEGER;
BEGIN
  v_anivs := public.gerar_celebracoes_aniversario_mural();
  v_tempo := public.gerar_celebracoes_tempo_casa_mural();
  UPDATE public.mural_publicacoes
  SET status = 'arquivada'
  WHERE status = 'publicada'
    AND expira_em IS NOT NULL
    AND expira_em < now();
  GET DIAGNOSTICS v_arquivadas = ROW_COUNT;
  RETURN jsonb_build_object(
    'aniversarios_novos', v_anivs,
    'tempo_casa_novos', v_tempo,
    'arquivadas_expiradas', v_arquivadas
  );
END $$;

-- ═══ 9. Cron diário ═══
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mural_fetely_diario') THEN
    PERFORM cron.unschedule('mural_fetely_diario');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron nao acessivel ainda: %', SQLERRM;
END $$;

SELECT cron.schedule(
  'mural_fetely_diario',
  '0 6 * * *',
  $$ SELECT public.processar_mural_fetely_diario(); $$
);

-- ═══ 10. Rodar UMA vez agora ═══
SELECT public.processar_mural_fetely_diario();