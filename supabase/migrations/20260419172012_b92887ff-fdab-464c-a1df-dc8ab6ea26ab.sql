DO $$
DECLARE
  v_proc_id UUID;
  v_area_adm UUID := (SELECT id FROM public.parametros WHERE categoria='area_negocio' AND valor='administrativo' LIMIT 1);
  v_depto_rh UUID := (SELECT id FROM public.parametros WHERE categoria='departamento' AND valor='rh_dp' LIMIT 1);
  v_narrativa TEXT;
  v_diagrama TEXT;
  v_proc_onboarding UUID := (SELECT id FROM public.processos WHERE nome ILIKE '%onboarding%' LIMIT 1);
  v_proc_est_org UUID := (SELECT id FROM public.processos WHERE codigo='estrutura_organizacional' LIMIT 1);
  v_proc_salario UUID := (SELECT id FROM public.processos WHERE codigo='politica_visibilidade_salario' LIMIT 1);
  v_proc_templates UUID := (SELECT id FROM public.processos WHERE codigo='templates_usuario' LIMIT 1);
BEGIN
  v_narrativa := E'# Recrutamento — abrir a porta certa pra pessoa certa\n\n> *"Recrutar não é preencher uma cadeira. É abrir uma porta pra alguém que vai crescer com a gente."*\n\nRecrutar na Fetely é, no fundo, um exercício de clareza: saber exatamente o que a vaga precisa fazer acontecer no mundo, pra quem ela precisa reportar, e o que essa pessoa vai encontrar do outro lado quando chegar. Este processo vai do **momento em que uma área pede uma pessoa** até o **momento em que o candidato aceito vira convite de cadastro no sistema** (daí em diante é Onboarding — outro processo). Meta: fechar em **20 dias** a partir da publicação.\n\n---\n\n## Quem faz o quê (RACI)\n\n- **R — Responsável pelo dia-a-dia:** o dono da vaga — a pessoa que vai ser responsável pela contratada depois\n- **A — Aprova a contratação:** o nível acima do dono da vaga (+ Super Admin / Diretoria quando C-Level)\n- **C — Consultados ao longo:** Financeiro (orçamento/faixa), Jurídico (proposta PJ, cláusulas), Diretoria (cargos sênior)\n- **I — Informados quando contratar:** TI (provisionamento de acessos), Facilities (estação, equipamento), times adjacentes\n\n**Observação importante:** o RH opera o sistema, o gestor é o dono. Isso não significa que o RH é figura decorativa — ele conduz, cobra, destrava. Mas a vaga pertence a quem vai receber a pessoa.\n\n---\n\n## Sua receita de bolo — por onde começar (por perfil)\n\n### 👋 Se você é o **dono da vaga** (gestor que vai receber a pessoa)\n\n1. **Primeiro**, converse com seu nível acima e valide o pedido. Orçamento aprovado? Posição aberta faz sentido agora?\n2. **Depois**, alinhe com o RH: fale da pessoa que você quer, não só do cargo. Habilidades obrigatórias vs. desejáveis. Como é o dia-a-dia dela?\n3. **Ao longo**, participe das entrevistas de gestor. Use o sistema — deixa registrada sua impressão, isso vira memória.\n4. **Na proposta**, seja ágil na aprovação. Candidato bom não espera.\n5. **No aceite**, comunique TI e Facilities ANTES do primeiro dia. Pessoa nova sem acesso nem estação é uma experiência ruim de Fetely.\n\n### 📋 Se você é o **RH operando a vaga**\n\n1. **Primeiro**, abra a vaga no sistema em `/recrutamento`. O cargo puxa automaticamente descrição, skills e faixa salarial — não precisa inventar.\n2. **Depois**, publique. O link público `/vagas/:id` está pronto pra ser compartilhado (LinkedIn, grupos, indicações).\n3. **Ao longo**, opere o kanban: triagem → entrevista RH → entrevista gestor → teste técnico → proposta. Cada etapa tem gatilho — não avança se faltar coisa.\n4. **Fique de olho nos alertas do sistema:** candidato overqualified, candidato sem score, proposta aguardando resposta há mais de 3 dias.\n5. **Ao chegar em contratado**, o sistema gera o convite de cadastro. Seu trabalho aqui termina e começa o Onboarding.\n\n### ✅ Se você é o **aprovador** (nível acima do dono da vaga)\n\n1. **Primeiro**, quando o dono da vaga traz o pedido, valide: orçamento, posição, timing.\n2. **No meio do caminho**, fique disponível se o dono da vaga precisar de apoio em cargos sensíveis.\n3. **Na proposta final**, aprove o valor — principalmente se estiver próximo ao topo da faixa ou envolve PJ.\n\n### 🌐 Se você é o **candidato** (externo)\n\n1. **Primeiro**, abra a vaga no link que recebeu. Leia com calma — tem DNA da Fetely ali, vai te dar pistas se é lugar pra você.\n2. **Depois**, clique em "Quero fazer parte" e preencha o formulário. Pode subir o CV — a IA da Fetely extrai os dados automaticamente, é só conferir.\n3. **Ao longo**, fique atento ao email — entrevistas, teste técnico, proposta chegam por lá.\n4. **Responda os links dentro do prazo** — especialmente o teste técnico e a proposta. O time está torcendo por você, mas não dá pra segurar indefinidamente.\n\n---\n\n## As 8 etapas do kanban\n\n| # | Etapa | O que acontece | Próximo passo |\n|---|---|---|---|\n| 1 | **Recebido** | Candidato acabou de se inscrever pelo portal | RH faz triagem inicial |\n| 2 | **Triagem** | RH avalia CV, score IA calcula fit | Marcar pra entrevista RH se encaixa |\n| 3 | **Entrevista RH** | Entrevista de fit cultural e clareza do candidato | Preencher scorecard no sistema |\n| 4 | **Entrevista Gestor** | Gestor avalia fit técnico e time | Preencher scorecard no sistema |\n| 5 | **Teste Técnico** | IA gera desafio personalizado, candidato entrega | RH avalia e valida skills |\n| 6 | **Proposta** | RH/Gestor montam oferta formal, sistema envia email | Aguardar resposta do candidato |\n| 7 | **Contratado** | Candidato aceitou. Sistema gera convite de cadastro | 🎉 handshake com Onboarding |\n| 8 | **Recusado** | Pode acontecer em qualquer etapa | Registrar motivo — serve de aprendizado |\n\n---\n\n## Sistemas e ferramentas\n\n- **People Fetely** — base operacional (`/recrutamento`, kanban, drawer do candidato)\n- **Portal público** — experiência do candidato (`/vagas/:id`, `/vagas/:id/candidatura`, `/vagas/:id/teste`)\n- **IA (Gemini 2.5 Flash)** — parse de CV, cálculo de score, geração de teste técnico personalizado\n- **Email transacional** (`notify.fetelycorp.com.br`) — 4 templates: solicitar perfil, teste técnico, teste entregue, proposta\n\n## Documentos envolvidos\n\n- **Currículo (CV)** — upload pelo candidato no portal (fronteira externa)\n- **Termo LGPD** — aceite explícito no portal, registrado com timestamp\n- **Scorecard de entrevista** (RH e Gestor) — preenchido no sistema\n- **Teste técnico entregue** — link de entrega pelo candidato\n- **Proposta formal** — email enviado pelo sistema ao candidato\n- **Convite de cadastro** — gerado automaticamente ao contratar\n\n---\n\n## Meta do processo\n\n- **Fechar em 20 dias** a partir da publicação da vaga (SLA)\n- Zero candidato esquecido no funil\n- Proposta aceita → convite gerado no mesmo dia\n- Gestor ativo em todas as etapas de decisão\n\n## KPIs candidatos (para conversa futura com o Flavio)\n\n> *Estes KPIs ainda não estão implementados no sistema. Foram identificados durante o mapeamento e serão estruturados na conversa sobre medição de processos.*\n\n- ⏱ **Tempo total da vaga** (dias entre `status=publicada` e `status=contratado`)\n- 📊 **Tempo médio por etapa** (quanto cada candidato fica em cada coluna do kanban)\n- 📉 **Taxa de conversão do funil** (recebido → triagem → entrevista → teste → proposta → contratado)\n- 🌐 **Taxa de resposta externa** (% de candidatos que completam o que é pedido no prazo)\n- ✅ **Taxa de aceite de proposta**\n- 🎯 **Score médio dos contratados** (calibração do IA)\n- 📥 **Origem dos contratados** (portal, indicação, LinkedIn, etc.)\n\n---\n\n## O que pode travar (e como destravar)\n\n- **Candidato sumiu** após entrevista — RH liga / envia mensagem direta. Se não responder em 48h, mover pra "recusado" com motivo "silêncio".\n- **Gestor não preenche scorecard** — RH lembra. Sem scorecard preenchido, não dá pra avançar.\n- **Proposta sem resposta por mais de 3 dias** — RH faz follow-up ativo.\n- **Candidato overqualified** (alerta laranja no sistema) — avaliar com o gestor: vale o risco de ele ir embora em 6 meses?\n\n---\n\n## Conexões com outros processos\n\n- **→ Onboarding** (Fetely dispara) — quando status vira "contratado", o Onboarding começa\n- **↔ Estrutura Organizacional** (depende de) — a vaga só faz sentido se o cargo, departamento e área existirem cadastrados\n- **↔ Visibilidade de Salário** (depende de) — faixa salarial é informação sensível, respeita a política\n- **↔ Templates de Usuário** (precede) — o tipo de contrato e cargo da vaga definem o template de acesso que será aplicado no primeiro login\n\n---\n\n*Fetely é celebração. E cada pessoa certa chegando é motivo pra celebrar.* 🎉';

  v_diagrama := E'flowchart TB\n    subgraph Area["🏢 Área Solicitante"]\n        A1[Surge necessidade de contratação]\n        A2[Pedido ao Gestor]\n    end\n    \n    subgraph Gestor["👤 Dono da Vaga (Gestor)"]\n        B1[Valida necessidade]\n        B2[Solicita aprovação]\n        B5[Entrevista candidato]\n        B6[Avalia proposta]\n        B7[Aprova contratação]\n    end\n    \n    subgraph Aprovador["✅ Aprovador nível acima"]\n        C1{Orçamento OK?}\n        C2[Aprova abertura]\n        C3[Aprova proposta]\n    end\n    \n    subgraph RH["📋 RH"]\n        D1[Abre vaga no sistema]\n        D2[Publica vaga]\n        D3[Triagem de candidatos]\n        D4[Entrevista RH]\n        D5[Envia teste técnico]\n        D6[Avalia teste]\n        D7[Monta proposta]\n        D8[Envia proposta]\n        D9[Gera convite cadastro]\n    end\n    \n    subgraph Candidato["🌐 Candidato externo"]\n        E1[Vê vaga no portal]\n        E2[Preenche candidatura + LGPD]\n        E3[Faz entrevistas]\n        E4[Entrega teste técnico]\n        E5{Aceita proposta?}\n    end\n    \n    subgraph Consultados["💬 C + I"]\n        F1[Financeiro: faixa]\n        F2[Jurídico: proposta PJ]\n        F3[TI: acessos]\n        F4[Facilities: estação]\n    end\n    \n    A1 --> A2\n    A2 --> B1\n    B1 --> B2\n    B2 --> C1\n    C1 -- Não --> B1\n    C1 -- Sim --> C2\n    C2 --> D1\n    D1 -.consulta.-> F1\n    D1 --> D2\n    D2 --> E1\n    E1 --> E2\n    E2 --> D3\n    D3 --> D4\n    D4 --> B5\n    E3 -.participa.-> D4\n    E3 -.participa.-> B5\n    B5 --> D5\n    D5 --> E4\n    E4 --> D6\n    D6 --> D7\n    D7 -.consulta PJ.-> F2\n    D7 --> B6\n    B6 --> C3\n    C3 --> D8\n    D8 --> E5\n    E5 -- Não --> D3\n    E5 -- Sim --> B7\n    B7 --> D9\n    D9 -.informa.-> F3\n    D9 -.informa.-> F4\n    D9 --> Onboarding([🚀 Onboarding — outro processo])\n    \n    classDef destaque fill:#1a3d2b,color:#fff,stroke:#1a3d2b\n    class D9,Onboarding destaque';

  INSERT INTO public.processos (codigo, nome, descricao, narrativa, diagrama_mermaid, area_negocio_id, natureza_valor, status_valor, sensivel)
  VALUES (
    'recrutamento',
    'Recrutamento',
    'Da identificação da necessidade até a geração do convite de cadastro — abrir a porta certa pra pessoa certa, em 20 dias.',
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
    IF v_depto_rh IS NOT NULL THEN
      INSERT INTO public.processos_tags_departamentos(processo_id, departamento_id) VALUES (v_proc_id, v_depto_rh) ON CONFLICT DO NOTHING;
    END IF;
    INSERT INTO public.processos_tags_tipos_colaborador(processo_id, tipo) 
    VALUES (v_proc_id, 'clt'), (v_proc_id, 'pj') ON CONFLICT DO NOTHING;
    
    INSERT INTO public.processos_tags_sistemas(processo_id, sistema_id)
    SELECT v_proc_id, id FROM public.sncf_sistemas WHERE slug = 'people' AND ativo = true
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.processos_versoes (
      processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot, 
      natureza_snapshot, diagrama_snapshot, motivo_alteracao
    ) 
    VALUES (
      v_proc_id, 1, 'Recrutamento', 
      'Da identificação da necessidade até a geração do convite de cadastro',
      v_narrativa, 'guia', v_diagrama,
      'Primeira versão — processo piloto de cadastro em Processos Fetely. Mapeado em conjunto RH + sistema real.'
    );

    UPDATE public.processos 
    SET versao_atual = 1, versao_vigente_em = now() 
    WHERE id = v_proc_id;
    
    IF v_proc_onboarding IS NOT NULL THEN
      INSERT INTO public.processos_ligacoes (processo_origem_id, processo_destino_id, tipo_ligacao, descricao, ordem)
      VALUES (v_proc_id, v_proc_onboarding, 'dispara', 'Ao contratar, gera convite de cadastro que inicia o Onboarding', 1)
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_proc_est_org IS NOT NULL THEN
      INSERT INTO public.processos_ligacoes (processo_origem_id, processo_destino_id, tipo_ligacao, descricao, ordem)
      VALUES (v_proc_id, v_proc_est_org, 'depende_de', 'Vaga precisa de cargo, departamento e área cadastrados', 2)
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_proc_salario IS NOT NULL THEN
      INSERT INTO public.processos_ligacoes (processo_origem_id, processo_destino_id, tipo_ligacao, descricao, ordem)
      VALUES (v_proc_id, v_proc_salario, 'depende_de', 'Faixa salarial da vaga respeita política de visibilidade', 3)
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_proc_templates IS NOT NULL THEN
      INSERT INTO public.processos_ligacoes (processo_origem_id, processo_destino_id, tipo_ligacao, descricao, ordem)
      VALUES (v_proc_id, v_proc_templates, 'precede', 'Cargo e tipo de contrato da vaga definem template de acesso aplicado no Onboarding', 4)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;