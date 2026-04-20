-- ============================================================
-- SEED · Dados fictícios para teste visual do Mural Fetely
-- Todos marcados com segmentacao = {"teste_visual": true}
-- Para limpar: DELETE FROM mural_publicacoes WHERE segmentacao->>'teste_visual' = 'true';
-- ============================================================

DO $$
DECLARE
  v_teste_tag JSONB := '{"teste_visual": true, "criado_em_seed": "2026-04-20"}'::JSONB;
BEGIN
  -- Card 1: Aniversário de pessoa (rosa)
  INSERT INTO public.mural_publicacoes (
    tipo, subtipo, titulo, mensagem, emoji,
    pessoa_alvo_nome, pessoa_alvo_tipo,
    status, origem, data_evento, publicado_em, expira_em, cor_tema,
    segmentacao
  ) VALUES (
    'celebracao_pessoa', 'aniversario',
    'Aniversário da Bianca Lopes',
    'Hoje é o dia de celebrar você, Bianca Lopes! 🌸 Que seja um ano cheio de alegria, intenção e gestos que importam.',
    '🎂',
    'Bianca Lopes', 'clt',
    'publicada', 'automatico', CURRENT_DATE, now(),
    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ,
    'rosa', v_teste_tag
  );

  -- Card 2: Tempo de casa — 3 anos
  INSERT INTO public.mural_publicacoes (
    tipo, subtipo, titulo, mensagem, emoji,
    pessoa_alvo_nome, pessoa_alvo_tipo,
    status, origem, data_evento, publicado_em, expira_em, cor_tema,
    segmentacao
  ) VALUES (
    'celebracao_tempo_casa', 'tempo_casa_3_anos',
    '3 anos de Fetely com Rafael Dias',
    'Três anos! ✨ Rafael, sua história já é parte indispensável da Fetely.',
    '✨',
    'Rafael Dias', 'clt',
    'publicada', 'automatico', CURRENT_DATE, now(),
    (CURRENT_DATE + INTERVAL '3 days')::TIMESTAMPTZ,
    'rosa', v_teste_tag
  );

  -- Card 3: Celebração de marca — 1000 produtos
  INSERT INTO public.mural_publicacoes (
    tipo, subtipo, titulo, mensagem, emoji,
    area_alvo,
    status, origem, data_evento, publicado_em, expira_em, cor_tema,
    segmentacao
  ) VALUES (
    'celebracao_marca', 'marco_produto',
    'Lançamos 1.000 produtos em 6 meses! 🎯',
    'Parabéns ao time de Produto pela conquista gigante — 1.000 produtos vivos em 6 meses de Fetely. Cada item é um gesto que chega na casa de alguém.',
    '🎯',
    'produtos',
    'publicada', 'rh_manual', CURRENT_DATE, now(),
    (CURRENT_DATE + INTERVAL '15 days')::TIMESTAMPTZ,
    'verde', v_teste_tag
  );

  -- Card 4: Reconhecimento entre colegas
  INSERT INTO public.mural_publicacoes (
    tipo, subtipo, titulo, mensagem, emoji,
    pessoa_alvo_nome, pessoa_alvo_tipo,
    status, origem, data_evento, publicado_em, expira_em, cor_tema,
    segmentacao
  ) VALUES (
    'celebracao_reconhecimento', 'reconhecimento_colega',
    'Camila Fonseca foi lembrada por um colega',
    '"Quero reconhecer a Camila pelo onboarding impecável da Ana. Gesto genuíno e cuidadoso do começo ao fim." 💚',
    '💚',
    'Camila Fonseca', 'clt',
    'publicada', 'submissao_colaborador', CURRENT_DATE, now(),
    (CURRENT_DATE + INTERVAL '7 days')::TIMESTAMPTZ,
    'sage', v_teste_tag
  );

  -- Card 5: KPI batido
  INSERT INTO public.mural_publicacoes (
    tipo, subtipo, titulo, mensagem, emoji,
    area_alvo,
    status, origem, data_evento, publicado_em, expira_em, cor_tema,
    segmentacao
  ) VALUES (
    'celebracao_kpi', 'meta_batida',
    'Ciclo de NF PJ caiu pra 2,4 dias 🎉',
    'Parabéns Financeiro — bateu a meta do trimestre. De 5 dias pra 2,4 dias de ciclo médio. Um gesto a menos de fricção pra cada PJ.',
    '🎉',
    'administrativo',
    'publicada', 'kpi_sistema', CURRENT_DATE, now(),
    (CURRENT_DATE + INTERVAL '10 days')::TIMESTAMPTZ,
    'verde', v_teste_tag
  );

  -- Card 6: Nascimento de filho
  INSERT INTO public.mural_publicacoes (
    tipo, subtipo, titulo, mensagem, emoji,
    pessoa_alvo_nome, pessoa_alvo_tipo,
    status, origem, data_evento, publicado_em, expira_em, cor_tema,
    segmentacao
  ) VALUES (
    'celebracao_pessoa', 'nascimento',
    'Bem-vindo ao mundo, pequeno Theo 👶',
    'O Thiago e a Paula se tornaram papais! A família Fetely comemora junto a chegada do Theo. Que seja uma vida de gestos que importam, pequenino. 💚',
    '👶',
    'Thiago Serrano', 'clt',
    'publicada', 'submissao_colaborador', CURRENT_DATE, now(),
    (CURRENT_DATE + INTERVAL '7 days')::TIMESTAMPTZ,
    'creme', v_teste_tag
  );

  -- Card 7: Casamento
  INSERT INTO public.mural_publicacoes (
    tipo, subtipo, titulo, mensagem, emoji,
    pessoa_alvo_nome, pessoa_alvo_tipo,
    status, origem, data_evento, publicado_em, expira_em, cor_tema,
    segmentacao
  ) VALUES (
    'celebracao_pessoa', 'casamento',
    'Ana Martins casou no fim de semana 💍',
    'A Ana subiu no altar! 💍 A Fetely inteira deseja uma vida de intenção, beleza e muita celebração — do jeitinho que ela sempre soube fazer. 💚',
    '💍',
    'Ana Martins', 'clt',
    'publicada', 'submissao_colaborador', CURRENT_DATE, now(),
    (CURRENT_DATE + INTERVAL '5 days')::TIMESTAMPTZ,
    'rosa', v_teste_tag
  );

  -- Card 8: Novo colaborador — admissão
  INSERT INTO public.mural_publicacoes (
    tipo, subtipo, titulo, mensagem, emoji,
    pessoa_alvo_nome, pessoa_alvo_tipo,
    status, origem, data_evento, publicado_em, expira_em, cor_tema,
    segmentacao
  ) VALUES (
    'celebracao_pessoa', 'admissao',
    'Chegou gente nova na família Fetely 💚',
    'Boas-vindas ao Pedro Martins, que entra como Coordenador de Design. Que sua estreia seja o primeiro de muitos gestos Fetely.',
    '🌱',
    'Pedro Martins', 'clt',
    'publicada', 'automatico', CURRENT_DATE, now(),
    (CURRENT_DATE + INTERVAL '7 days')::TIMESTAMPTZ,
    'sage', v_teste_tag
  );

  -- Card 9: Aprendizado — dica da semana
  INSERT INTO public.mural_publicacoes (
    tipo, subtipo, titulo, mensagem, emoji,
    status, origem, data_evento, publicado_em, expira_em, cor_tema,
    segmentacao
  ) VALUES (
    'celebracao_aprendizado', 'dica_semana',
    'Aprendizado da semana',
    'Frase do DNA pra refletir: "Intenção vale mais que orçamento." Gesto pequeno com intenção bate gesto grande no automático.',
    '📖',
    'publicada', 'rh_manual', CURRENT_DATE, now(),
    (CURRENT_DATE + INTERVAL '7 days')::TIMESTAMPTZ,
    'creme', v_teste_tag
  );

  -- Card 10: Comunicado convite (RH convida)
  INSERT INTO public.mural_publicacoes (
    tipo, subtipo, titulo, mensagem, emoji,
    status, origem, data_evento, publicado_em, expira_em, cor_tema,
    segmentacao
  ) VALUES (
    'comunicado_convite', 'convite_evento',
    'Happy hour Fetely · sexta às 18h 🍷',
    'Sexta a gente comemora tudo que construiu esse mês. Traga sua energia, sua risada e seu jeito Fetely. Local: escritório sede.',
    '🍷',
    'publicada', 'rh_manual', CURRENT_DATE, now(),
    (CURRENT_DATE + INTERVAL '5 days')::TIMESTAMPTZ,
    'bordo', v_teste_tag
  );
END $$;

-- Audit
DO $$
BEGIN
  PERFORM public.registrar_audit(
    'MURAL_SEED_TESTE_VISUAL',
    jsonb_build_object(
      'cards_criados', 10,
      'motivo', 'Teste visual antes de dados reais',
      'comando_limpeza', 'DELETE FROM public.mural_publicacoes WHERE segmentacao->>teste_visual = true',
      'aplicado_em', now()
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Audit nao aplicou (ok): %', SQLERRM;
END $$;