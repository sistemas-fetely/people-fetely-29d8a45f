-- ═══ PROCESSO 1: Revogação de Acesso D+30 (LGPD) ═══
DO $$
DECLARE
  v_proc_id UUID;
  v_area_adm UUID := (SELECT id FROM public.parametros WHERE categoria='area_negocio' AND valor='administrativo' LIMIT 1);
  v_depto_rh UUID := (SELECT id FROM public.parametros WHERE categoria='departamento' AND valor='rh' LIMIT 1);
  v_depto_ti UUID := (SELECT id FROM public.parametros WHERE categoria='departamento' AND valor='ti' LIMIT 1);
  v_narrativa TEXT;
  v_diagrama TEXT;
BEGIN
  v_narrativa := E'# Revogação de Acesso pós-desligamento (D+30)\n\n> **Proteção LGPD obrigatória.** Colaboradores desligados (CLT ou PJ) têm acesso automaticamente revogado 30 dias após a data de desligamento/fim de contrato.\n\nProcesso automatizado com supervisão humana. Garante que ex-colaboradores não mantenham acesso a dados da empresa indefinidamente — risco LGPD que pode render multa e responsabilização.\n\n---\n\n## Quem faz o quê (RACI)\n\n- **R (Responsável pela auditoria):** Dra. Renata Souza (Regulatório & LGPD)\n- **A (Aprova ajustes de política):** Super Admin\n- **C (Consultados):** Dr. Marcos Teixeira (aspecto trabalhista), Ricardo Mendes (trilha de auditoria)\n- **I (Informados):** Admin RH (vê na view `revogacoes_acesso_historico`)\n\n---\n\n## Gatilho automático\n\n**Cron diário:** `revogar_acessos_ex_colaboradores_diario` roda todo dia às 03:00 UTC. Função invocada: `public.revogar_acessos_ex_colaboradores()`.\n\n**Lógica:**\n1. Varre `colaboradores_clt` com `data_desligamento <= CURRENT_DATE - 30 days` e `acesso_revogado_em IS NULL`\n2. Varre `contratos_pj` com `data_fim <= CURRENT_DATE - 30 days` e `acesso_revogado_em IS NULL`\n3. Para cada usuário encontrado:\n   - Verifica se NÃO é `super_admin` (super admin nunca perde acesso automaticamente — trava de segurança)\n   - DELETA de `user_roles` (remove todos os roles)\n   - UPDATE `acesso_revogado_em = now()` na tabela de origem\n   - Registra em `audit_log` com tipo `REVOGACAO_ACESSO_POS_DESLIGAMENTO`\n\n---\n\n## Ação humana envolvida\n\nApesar de automatizado, o processo tem **3 pontos de ação humana**:\n\n1. **Auditoria mensal (Dra. Renata):** consultar view `public.revogacoes_acesso_historico` e validar que o cron está rodando corretamente\n2. **Exceções (Admin RH):** casos em que acesso precisa ser mantido além de 30 dias (ex: investigação pendente, conciliação trabalhista) — admin solicita ao super_admin para manter `acesso_revogado_em = NULL` manualmente\n3. **Dispute/recurso (Super Admin):** se ex-colaborador alega acesso indevidamente removido antes do prazo, super_admin pode restaurar manualmente\n\n---\n\n## Trilha de auditoria\n\n- **Tabela:** `audit_log`\n- **Tipo de ação:** `REVOGACAO_ACESSO_POS_DESLIGAMENTO`\n- **View amigável:** `public.revogacoes_acesso_historico`\n- **Consultar:** `SELECT * FROM public.revogacoes_acesso_historico WHERE criado_em > now() - interval ''30 days'';`\n\n---\n\n## Conexões com outros processos\n\n- **Irmão:** `desligamento_colaborador` (a mapear) — gatilho do cronômetro D+30\n- **Política base:** `acesso_colaborador` (já mapeado) — referência de controle de acesso\n- **Jurídico:** conecta com Termo LGPD (retenção de dados)\n\n---\n\n## KPIs candidatos (Fetely em Números)\n\n- Nº de revogações automáticas por mês\n- Nº de exceções (manutenção manual de acesso) por mês\n- Tempo médio entre desligamento e revogação (deve ser ~30 dias)\n- Taxa de falha do cron (alertar se == 0 por > 30 dias — pode indicar job pausado)\n\n---\n\n## Histórico de versões\n\n- **v1 (19/04/2026):** Processo formalizado. Cron + view + função já em produção desde Prompt C.\n\n---\n\n## Onde ver\n\n- **Cron:** `SELECT * FROM cron.job WHERE jobname = ''revogar_acessos_ex_colaboradores_diario'';`\n- **Função:** `public.revogar_acessos_ex_colaboradores()`\n- **View:** `public.revogacoes_acesso_historico`';

  v_diagrama := E'flowchart TB\n    Cron([Cron 03:00 UTC diário]) --> Varre[Varre CLT + PJ]\n    Varre --> Cond{data_saida +<br/>30 dias venceu?<br/>acesso_revogado_em<br/>ainda NULL?}\n    Cond -- Não --> Skip([Pula])\n    Cond -- Sim --> Super{É super_admin?}\n    Super -- Sim --> Skip\n    Super -- Não --> Delete[DELETE user_roles]\n    Delete --> Update[UPDATE acesso_revogado_em]\n    Update --> Audit[Audit log<br/>REVOGACAO_ACESSO_POS_DESLIGAMENTO]\n    Audit --> View[View<br/>revogacoes_acesso_historico]\n    View --> Renata[Dra. Renata<br/>audita mensalmente]\n    \n    Renata -.exceção.-> AdminRH[Admin RH solicita<br/>manutenção manual]\n    AdminRH -.aprovação.-> Super2[Super Admin<br/>intervém]\n    Super2 -.manual.-> Update\n    \n    classDef auto fill:#1a3d2b,color:#fff,stroke:#1a3d2b\n    classDef humano fill:#F4A7B9,color:#1a3d2b,stroke:#8B1A2F\n    class Cron,Varre,Delete,Update,Audit,View auto\n    class Renata,AdminRH,Super2 humano';

  INSERT INTO public.processos (codigo, nome, descricao, narrativa, diagrama_mermaid, area_negocio_id, natureza_valor, status_valor, sensivel)
  VALUES (
    'revogacao_acesso_d30',
    'Revogação de Acesso pós-desligamento (D+30)',
    'Automação LGPD: acesso de ex-colaboradores revogado 30 dias após desligamento. Supervisão humana pela Dra. Renata.',
    v_narrativa,
    v_diagrama,
    v_area_adm,
    'operacional',
    'vigente',
    true
  )
  ON CONFLICT (codigo) DO NOTHING
  RETURNING id INTO v_proc_id;

  IF v_proc_id IS NOT NULL THEN
    IF v_area_adm IS NOT NULL THEN
      INSERT INTO public.processos_tags_areas(processo_id, area_id) VALUES (v_proc_id, v_area_adm) ON CONFLICT DO NOTHING;
    END IF;
    IF v_depto_rh IS NOT NULL THEN
      INSERT INTO public.processos_tags_departamentos(processo_id, departamento_id) VALUES (v_proc_id, v_depto_rh) ON CONFLICT DO NOTHING;
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
      v_proc_id, 1, 'Revogação de Acesso pós-desligamento (D+30)',
      'Automação LGPD com supervisão humana',
      v_narrativa, 'operacional', v_diagrama,
      'Versão 1 — processo formalizado. Cron + função + view já em produção desde o Prompt C (19/04/2026). Aplicação da doutrina "tem R humano? vai pro mapa".'
    );

    UPDATE public.processos SET versao_atual = 1, versao_vigente_em = now() WHERE id = v_proc_id;
  END IF;
END $$;

-- ═══ PROCESSO 2: Triagem de Reportes do Sistema ═══
DO $$
DECLARE
  v_proc_id UUID;
  v_area_adm UUID := (SELECT id FROM public.parametros WHERE categoria='area_negocio' AND valor='administrativo' LIMIT 1);
  v_depto_ti UUID := (SELECT id FROM public.parametros WHERE categoria='departamento' AND valor='ti' LIMIT 1);
  v_narrativa TEXT;
  v_diagrama TEXT;
BEGIN
  v_narrativa := E'# Triagem de Reportes do Sistema\n\n> **Canal colaborativo Uauuu.** Usuários reportam bugs, confusões e sugestões pelo botão flutuante "Reportar" presente em todas as telas. A inbox é transversal ao SNCF — qualquer sistema pode alimentar.\n\nProcesso híbrido: registro automático, triagem humana.\n\n---\n\n## Quem faz o quê (RACI)\n\n- **R (Responsável pela triagem):** Admin RH e Super Admin (rotativo, quem pega primeiro)\n- **A (Aprova mudanças estruturais):** Super Admin\n- **C (Consultados):** Beatriz Lemos (UX) para reports de confusão de UI; Ricardo Mendes para reports operacionais; Thiago Serrano para sugestões de feature\n- **I (Informados):** O reportante recebe resposta direta via campo `resposta_admin`\n\n---\n\n## Gatilho automático\n\n**Usuário clica no botão flutuante "Reportar"** em qualquer tela autenticada → preenche tipo + descrição + passos → INSERT em `public.sistema_reportes` com contexto técnico auto-capturado (rota, viewport, user agent).\n\n**Contexto automático coletado:**\n- Rota visitada (`pathname`)\n- Viewport (descobrir bugs mobile vs desktop)\n- User agent (isolar problema de browser)\n- Autor identificado (não é reporte anônimo)\n\n---\n\n## Fluxo de triagem (humano)\n\n1. **Admin acessa `/admin/reportes`** (rota transversal em SNCFLayout)\n2. **Filtra por status** (Recebido, Em análise, Em correção, Resolvido, etc)\n3. **Abre reporte específico** — vê descrição + passos + contexto técnico\n4. **Classifica prioridade** (baixa/normal/alta/crítica)\n5. **Muda status** conforme progresso (em_analise → em_correcao → resolvido)\n6. **Escreve resposta ao reportante** em `resposta_admin`\n7. **Se virar feature/bug complexo:** vira item do roadmap (ação manual — não automatizada)\n\n---\n\n## Tipos de reporte esperados\n\n- **🐛 Bug** — algo não funciona\n- **🧩 UI confusa** — não entendi o que fazer\n- **💡 Sugestão** — ideia de melhoria\n- **📊 Dado errado** — valor na tela está incorreto\n- **✍️ Outro** — descrever no livre\n\n---\n\n## Trilha de auditoria\n\n- **Tabela:** `sistema_reportes`\n- **RLS:** autor vê próprios reportes; admin RH + super admin veem todos\n- **Timestamp:** `reportado_em`, `updated_at`, `resolvido_em`\n- **Rastreabilidade:** atribuição (`atribuido_a`) + resposta (`resposta_admin`)\n\n---\n\n## Conexões com outros processos\n\n- **Irmão:** `trabalhar_no_uauuu` (metodologia — validação pós-publicação frequentemente gera reportes)\n- **Destino comum:** item do roadmap `Melhorias_Roadmap_PeopleFetely.md` quando sugestão/bug vira trabalho planejado\n\n---\n\n## KPIs candidatos (Fetely em Números)\n\n- Volume de reportes por mês (por tipo)\n- Tempo médio de triagem (recebido → em_analise)\n- Tempo médio até resolução (recebido → resolvido)\n- Taxa de reportes que viram feature/correção\n- Top 5 rotas geradoras de reportes (descobre tela problemática)\n- NPS implícito: taxa resolvido/total\n\n---\n\n## Histórico de versões\n\n- **v1 (19/04/2026):** Processo formalizado. Infra criada no Prompt D (botão flutuante, tabela, inbox `/admin/reportes`). Movido para camada transversal SNCF em 19/04/2026.\n\n---\n\n## Onde ver\n\n- **Inbox:** `/admin/reportes` (em SNCFLayout, visível apenas para admin RH e super admin)\n- **Tabela:** `public.sistema_reportes`\n- **Botão:** componente `ReportarErroBotao` injetado globalmente em AppLayout e SNCFLayout';

  v_diagrama := E'flowchart TB\n    User[Usuário em qualquer tela] --> Click[Clica botão flutuante<br/>Reportar]\n    Click --> Form[Preenche tipo +<br/>descrição + passos]\n    Form --> Auto[Sistema captura<br/>rota + viewport + agent]\n    Auto --> Insert[INSERT<br/>sistema_reportes<br/>status: recebido]\n    Insert --> Inbox[/admin/reportes<br/>visível pra admins/]\n    Inbox --> Triagem{Admin RH<br/>triagem}\n    Triagem --> Prior[Define prioridade]\n    Prior --> Status1[Status: em_analise]\n    Status1 --> Trab{Precisa<br/>desenvolvimento?}\n    Trab -- Sim --> Roadmap[Entra no<br/>roadmap]\n    Trab -- Não --> Status2[Status: resolvido<br/>com resposta]\n    Roadmap --> Dev[Dev + Lovable]\n    Dev --> Status3[Status: em_correcao]\n    Status3 --> Status2\n    Status2 --> Notify[Reportante vê<br/>resposta]\n    \n    classDef auto fill:#4FC3D8,color:#1a3d2b,stroke:#1a3d2b\n    classDef humano fill:#F4A7B9,color:#1a3d2b,stroke:#8B1A2F\n    class User,Click,Form,Auto,Insert,Notify auto\n    class Triagem,Prior,Status1,Trab,Status2,Status3 humano';

  INSERT INTO public.processos (codigo, nome, descricao, narrativa, diagrama_mermaid, area_negocio_id, natureza_valor, status_valor, sensivel)
  VALUES (
    'triagem_reportes_sistema',
    'Triagem de Reportes do Sistema',
    'Canal colaborativo Uauuu — usuários reportam bugs/sugestões, admin RH tria e responde.',
    v_narrativa,
    v_diagrama,
    v_area_adm,
    'operacional',
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
      v_proc_id, 1, 'Triagem de Reportes do Sistema',
      'Canal colaborativo transversal SNCF',
      v_narrativa, 'operacional', v_diagrama,
      'Versão 1 — processo formalizado. Infra criada no Prompt D (19/04/2026), movida pra SNCF transversal em seguida. Aplicação da doutrina "tem R humano? vai pro mapa".'
    );

    UPDATE public.processos SET versao_atual = 1, versao_vigente_em = now() WHERE id = v_proc_id;
  END IF;
END $$;