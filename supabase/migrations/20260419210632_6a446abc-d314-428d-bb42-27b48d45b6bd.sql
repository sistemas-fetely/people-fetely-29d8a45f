-- Processo: Trabalhar no Uauuu (Ciclo de Sessão)
-- Meta-processo da Metodologia Uauuu — 10 passos que governam todas as sessões
DO $$
DECLARE
  v_proc_id UUID;
  v_area_adm UUID := (SELECT id FROM public.parametros WHERE categoria='area_negocio' AND valor='administrativo' LIMIT 1);
  v_depto_ti UUID := (SELECT id FROM public.parametros WHERE categoria='departamento' AND valor='ti' LIMIT 1);
  v_narrativa TEXT;
  v_diagrama TEXT;
BEGIN
  v_narrativa := E'# Trabalhar no Uauuu — o fluxo operacional de uma sessão\n\n> *"Método não é formalidade. É respeito com o trabalho e com quem vai continuar depois."*\n\nEste processo descreve **como uma sessão de desenvolvimento do Uauuu flui**, em 10 passos. É meta-processo: governa a execução de todos os outros processos e features.\n\n**Escopo deste processo:** apenas o fluxo operacional (o HOW). Os princípios de cultura estão em `docs/METODOLOGIA_UAUUU.md`. As diretrizes pontuais (dimensões via tabela, CLT=PJ, etc) estão no Fala Fetely como cards individuais.\n\n---\n\n## Quem faz o quê (RACI)\n\n- **R — Responsável pelo fluxo da sessão:** Flavio (direção + decisões estruturantes)\n- **A — Aprova mudanças no método:** Flavio\n- **C — Consultados em temas sensíveis:** boards Jurídico e People Fetely\n- **I — Informados:** quem entrar no projeto lê a metodologia e este processo antes da primeira contribuição\n\n---\n\n## Os 10 passos do Ciclo Uauuu\n\n### 1. Abertura\n`git pull` + ler roadmap + validar memórias do Claude contra código real. Identificar o que o Flavio quer tratar na sessão.\n\n### 2. Captura (sem código ainda)\nEscutar demanda com atenção. Fazer perguntas se ambíguo. Se tiver decisão pendente, listar antes de avançar.\n\n### 3. Análise crítica\nA demanda faz sentido como pedida? Tem modo melhor? Risco cruzado com outras partes? Precisa opinião de algum consultor do board? Devolver proposta ajustada com justificativa — antes de qualquer código.\n\n### 4. Agrupamento\n1 a 4 prompts, não mais. Cada prompt coeso internamente. Ordem considera dependência e risco.\n\n### 5. Decisões pendentes\nListar o que bloqueia antes de escrever. Separar perguntas bloqueantes de perguntas de curiosidade. Aguardar decisão ANTES de escrever código.\n\n### 6. Escrita do prompt\nContexto explícito, partes numeradas, código completo, seção "o que NÃO fazer", testes de validação, commit message sugerida.\n\n### 7. Publicação\nFlavio publica no Lovable.\n\n### 8. Validação\n`git pull` + conferir migration + grep caso a caso + relatar honesto (entregou tudo? faltou? veio bônus?).\n\n### 9. Roadmap\nMarcar itens concluídos. Registrar bônus. Adicionar pendências novas. Commit entre prompts, nunca só no fim.\n\n### 10. Celebração\nQuando merecido, celebrar. Cultura Fetely. Marco a marco.\n\n---\n\n## Meta do processo\n\n- 100% das sessões seguindo o ciclo\n- 0 features órfãs de documentação/processo\n- Toda doutrina emergente capturada antes de ser esquecida\n- Boards acionados quando apropriado\n- Mesa limpa ao fim de cada ciclo\n\n---\n\n## Onde ir pra cada coisa\n\n- **Princípios, regras, anti-padrões** → `docs/METODOLOGIA_UAUUU.md` no repositório\n- **Boards consultivos** → Fala Fetely, buscar "Boards Uauuu"\n- **Diretrizes específicas** → Fala Fetely, cada uma é um card\n- **Roadmap** → `Melhorias_Roadmap_PeopleFetely.md` na raiz\n\n---\n\n## KPIs candidatos (futuro Fetely em Números)\n\n- Taxa de sessões seguindo o ciclo completo\n- Tempo médio de validação pós-publicação\n- Nº de doutrinas emergentes capturadas por mês\n- Taxa de prompts publicados com 0 regressão detectada\n\n---\n\n*Celebrar é fechar ciclo e olhar pra frente com o mesmo cuidado.* 🎉';

  v_diagrama := E'flowchart TB\n    Start([Início da sessão]) --> P1[1. Abertura]\n    P1 --> P2[2. Captura]\n    P2 --> P3{3. Análise crítica<br/>precisa board?}\n    P3 -- Sim --> Board[Consultar board]\n    P3 -- Não --> P4[4. Agrupamento]\n    Board --> P4\n    P4 --> P5{5. Decisões<br/>pendentes?}\n    P5 -- Sim --> Aguardar[Aguardar Flavio]\n    P5 -- Não --> P6[6. Escrita do prompt]\n    Aguardar --> P6\n    P6 --> P7[7. Publicação]\n    P7 --> P8[8. Validação]\n    P8 --> P9{Entregou?}\n    P9 -- Sim --> R[9. Roadmap]\n    P9 -- Faltou --> P6\n    R --> P10[10. Celebração]\n    P10 --> Fim([Pronto<br/>próximo ciclo])\n    \n    classDef destaque fill:#1a3d2b,color:#fff,stroke:#1a3d2b\n    class Board,P10 destaque';

  INSERT INTO public.processos (codigo, nome, descricao, narrativa, diagrama_mermaid, area_negocio_id, natureza_valor, status_valor, sensivel)
  VALUES (
    'trabalhar_no_uauuu',
    'Trabalhar no Uauuu (Ciclo de Sessão)',
    'Meta-processo que descreve o fluxo operacional de uma sessão — 10 passos que governam todos os outros processos. Princípios em docs/METODOLOGIA_UAUUU.md.',
    v_narrativa,
    v_diagrama,
    v_area_adm,
    'guia',
    'vigente',
    false
  )
  ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_proc_id;

  IF v_proc_id IS NOT NULL THEN
    IF v_area_adm IS NOT NULL THEN
      INSERT INTO public.processos_tags_areas(processo_id, area_id) VALUES (v_proc_id, v_area_adm) ON CONFLICT DO NOTHING;
    END IF;
    IF v_depto_ti IS NOT NULL THEN
      INSERT INTO public.processos_tags_departamentos(processo_id, departamento_id) VALUES (v_proc_id, v_depto_ti) ON CONFLICT DO NOTHING;
    END IF;
    INSERT INTO public.processos_tags_tipos_colaborador(processo_id, tipo)
    VALUES (v_proc_id, 'clt'), (v_proc_id, 'pj') ON CONFLICT DO NOTHING;

    INSERT INTO public.processos_versoes (
      processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot,
      natureza_snapshot, diagrama_snapshot, motivo_alteracao
    )
    VALUES (
      v_proc_id, 1, 'Trabalhar no Uauuu (Ciclo de Sessão)',
      'Meta-processo — 10 passos operacionais',
      v_narrativa, 'guia', v_diagrama,
      'Primeira versão — fluxo operacional consolidado em 19/04/2026 após mesa limpa.'
    );

    UPDATE public.processos SET versao_atual = 1, versao_vigente_em = now() WHERE id = v_proc_id;
  END IF;
END $$;