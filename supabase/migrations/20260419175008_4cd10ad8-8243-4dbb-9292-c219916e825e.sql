DO $$
DECLARE
  v_proc_id UUID;
  v_area_adm UUID := (SELECT id FROM public.parametros WHERE categoria='area_negocio' AND valor='administrativo' LIMIT 1);
  v_depto_rh UUID := (SELECT id FROM public.parametros WHERE categoria='departamento' AND valor='rh_dp' LIMIT 1);
  v_depto_ti UUID := (SELECT id FROM public.parametros WHERE categoria='departamento' AND valor='ti' LIMIT 1);
  v_narrativa TEXT;
  v_diagrama TEXT;
  v_proc_recrutamento UUID := (SELECT id FROM public.processos WHERE codigo='recrutamento' LIMIT 1);
  v_proc_acesso UUID := (SELECT id FROM public.processos WHERE codigo='acesso_colaborador' LIMIT 1);
  v_proc_templates UUID := (SELECT id FROM public.processos WHERE codigo='templates_usuario' LIMIT 1);
  v_proc_est_org UUID := (SELECT id FROM public.processos WHERE codigo='estrutura_organizacional' LIMIT 1);
BEGIN
  v_narrativa := E'# Onboarding — receber quem chega como Fetely recebe\n\n> *"Os de dentro primeiro. E agora você é de dentro."*\n\nOnboarding na Fetely não é "preencher papel" — é **o primeiro gesto de presença** da empresa com quem acabou de chegar. Do momento que a pessoa aceita a proposta até o seu primeiro dia de trabalho, em **5 dias**, ela passa por um caminho que traduz a alma Fetely em ações concretas: acesso preparado, contrato certo, documentação no lugar, líder esperando, time avisado.\n\n**Princípio fundamental:** CLT e PJ passam pelo **mesmo onboarding**. Mesmo tratamento, mesma cultura, mesmo cuidado. A diferença está apenas nos deveres legais — documentos obrigatórios, tipo de contrato, registros fiscais. Isso é DNA Fetely puro: *"o que importa é quem você é, não o regime contratual"*.\n\n---\n\n## Quem faz o quê (RACI)\n\n- **R — Responsável pelo dia-a-dia:** o **líder direto** do novo colaborador. Pode delegar parte das tarefas a um **buddy/padrinho** do time (alguém que vai acompanhar a chegada).\n- **A — Aprova a conclusão:** o mesmo líder direto.\n- **C — Consultados ao longo:** RH (operação, compliance), TI (acessos, equipamento), Financeiro (dados bancários CLT, cadastro PJ), Jurídico (contrato PJ, quando aplicável).\n- **I — Informados na chegada:** Time que vai receber a pessoa, Facilities (se houver presencial), adjacentes que vão trabalhar com ele(a).\n\n**Observação:** o RH conduz o fluxo no sistema, mas o **líder é o dono** da experiência de chegada. A Fetely não terceiriza boas-vindas.\n\n---\n\n## Sua receita de bolo — por onde começar (por perfil)\n\n### 👑 Se você é o **líder direto** (dono da chegada)\n\n1. **Primeiro**, assim que o candidato aceita a proposta, você recebe a notificação. Escolha: você mesmo vai acompanhar a chegada, ou nomeia um buddy/padrinho do seu time?\n2. **Antes do D0**, peça ao RH pra confirmar: acessos solicitados a TI? Equipamento? Kit de boas-vindas?\n3. **No D-1 (dia antes)**, envie uma mensagem pessoal pro novo colaborador. Curta, humana — *"Te espero amanhã, qualquer coisa me avisa"*. Isso muda tudo.\n4. **No D+0 (primeiro dia)**, reserve a primeira hora da sua agenda. Recebe, apresenta o time, passa contexto. Não delegue o primeiro contato se possível.\n5. **Na primeira semana**, check-in diário de 15min. Duvidas, primeiros bloqueios, clareza de objetivos.\n\n### 📋 Se você é o **RH** (conduzindo o sistema)\n\n1. **Primeiro**, quando o candidato aceita proposta, o sistema gera convite automático em `/convites-cadastro`. Link público com token, válido por **7 dias**.\n2. **Envie o convite por email** (template `solicitar-perfil-candidato`). Follow-up em 2 e 5 dias se não preenchido — edge function `process-invite-reminders` cuida disso automaticamente.\n3. **Ao preencher**, candidato completa seções específicas por tipo:\n   - **CLT:** dados pessoais, profissionais, empresa, bancários, dependentes, documentos\n   - **PJ:** dados pessoais, profissionais, empresa PJ, bancários (mesma estrutura, deveres legais diferentes)\n4. **Validação**: revise os dados preenchidos. Integridade do cargo é bloqueio (V3-G).\n5. **Importação**: com 1 clique, o sistema cria o colaborador + aplica template de acesso (baseado no cargo) + gera onboarding_checklist + dispara email de boas-vindas ao email corporativo.\n6. **Ao longo dos 5 dias**, acompanhe o checklist. Tarefas atrasadas geram alerta.\n\n### 💻 Se você é o **TI**\n\n1. **Recebe notificação** quando colaborador é importado no sistema.\n2. **Provisiona acessos**: People Fetely (via template automático), email corporativo, Mercus (se aplicável), outros sistemas vinculados ao cargo.\n3. **Prepara equipamento** (notebook, headset, monitor) conforme tipo de cargo.\n4. **Valida no D-1**: tudo funcionando antes do primeiro dia. Pessoa nova com acesso travado é anti-DNA.\n\n### 🌐 Se você é o **novo colaborador**\n\n1. **Primeiro**, você recebe um email do RH Fetely com o convite.\n2. **Abra o link e preencha**. Respira — você vai precisar de: RG, CPF, comprovante de endereço, dados bancários, foto. Se for CLT, também dependentes e documentos complementares. Se for PJ, dados da empresa e contrato social.\n3. **Envie dentro de 5 dias**. O time está te preparando do outro lado.\n4. **No D-1**, você recebe mensagem de boas-vindas da Fetely com instruções do primeiro dia.\n5. **No D+0**, chegue no horário. Tudo vai estar pronto pra te receber. Qualquer coisa estranha, fala com seu líder direto.\n\n---\n\n## As 4 fases do Onboarding\n\n| Fase | Duração | O que acontece | Responsável principal |\n|---|---|---|---|\n| **1. Convite** | D0 - D+5 (máx 7) | Candidato preenche dados | Candidato + RH (follow-up) |\n| **2. Validação & Importação** | ~1h após preenchimento | RH valida, importa, dispara automações | RH |\n| **3. Provisionamento** | D-3 a D-1 | TI prepara acessos e equipamento | TI |\n| **4. Primeiro Dia** | D+0 | Chegada, apresentação, contexto | Líder direto |\n\n**Handshake de saída:** no D+0, termina o Onboarding e começa outro processo — **Integração & Primeiro Dia Produtivo** (ver processos relacionados).\n\n---\n\n## Sistemas e ferramentas\n\n- **People Fetely** — base operacional (`/convites-cadastro`, `/onboarding`, onboarding_checklists)\n- **Portal público de convite** — experiência do candidato (`/convite/:token`)\n- **Supabase Auth + Edge Function `manage-user`** — criação de usuário automática\n- **Email transacional** (`notify.fetelycorp.com.br`) — templates: boas-vindas, reminder convite, confirmação importação\n- **Edge Function `process-invite-reminders`** — job diário que lembra convites pendentes (2d, 5d)\n\n## Documentos envolvidos\n\n**Comum a CLT e PJ:**\n- Dados pessoais (RG, CPF, endereço)\n- Dados bancários\n- Foto\n\n**Específicos CLT (deveres legais CLT):**\n- Carteira de trabalho\n- Comprovante de escolaridade\n- Certificado de reservista (quando aplicável)\n- Certidão de casamento e nascimento de dependentes\n- Exame médico admissional\n\n**Específicos PJ (deveres legais PJ):**\n- Dados da empresa PJ (CNPJ, razão social)\n- Contrato social\n- Contrato de prestação de serviço\n- Certidões negativas\n\n---\n\n## Meta do processo\n\n- **5 dias** do convite aceito até primeiro dia de trabalho\n- Zero colaborador chegando sem acessos\n- Zero colaborador chegando sem líder disponível\n- 100% dos convites preenchidos dentro do prazo (ou alerta automático)\n- Comunicação proativa em todos os pontos de contato\n\n## KPIs candidatos (para conversa futura Fetely em Números)\n\n> *Identificados no mapeamento de 19/04/2026 — serão estruturados no Fetely em Números.*\n\n- ⏱ **Tempo total do onboarding** (dias entre proposta aceita e D+0)\n- 📝 **Taxa de preenchimento do convite dentro do prazo** (5 dias)\n- ⏰ **Taxa de convites que expiraram** (7 dias sem preenchimento)\n- 🔧 **Taxa de prontidão técnica no D+0** (acessos + equipamento OK / total chegadas)\n- 👋 **Taxa de líder presente no D+0** (líder na primeira hora / total chegadas)\n- 📊 **Tempo médio de provisionamento de TI** (solicitação → acesso pronto)\n- 🎯 **NPS Fetely dos 30 dias** — pergunta de onboarding ao novo colaborador\n\n---\n\n## O que pode travar (e como destravar)\n\n> *Você indicou: "comunicação" é o maior risco. Por isso, as 3 maiores armadilhas são de comunicação.*\n\n- **Convite não preenchido em 5 dias** → sistema lembra automaticamente. Se passar 7 dias, convite expira. RH contata direto pra renovar.\n- **Líder não avisado** → RH e TI fazem setup, mas ninguém avisa o líder. Processo: após importação, sistema notifica líder por email obrigatoriamente.\n- **TI não recebe solicitação de acesso** → template automático resolve, mas se cargo não tem template, cai em exceção. Solução: template "fallback" aplicado + TI alertado manualmente.\n- **Time não avisado da chegada** → líder esquece de comunicar. Sugestão: checklist inclui tarefa "Avisar time" com prazo D-2.\n- **Documento errado ou faltando** → validação do RH na importação. Se incompleto, volta pro candidato corrigir.\n- **Equipamento atrasado** (principalmente Joinville, logística diferente) → solicitação em D-3 pra dar margem.\n\n---\n\n## Conexões com outros processos\n\n- **← Recrutamento** (precedido por) — Onboarding começa quando candidato aceita proposta e sistema gera convite\n- **→ Integração & Primeiro Dia Produtivo** (dispara — processo ainda não mapeado) — começa no D+0 e cobre os 30-60 primeiros dias\n- **↔ Acesso do Colaborador** (depende de) — provisionamento de acesso é parte integrante\n- **↔ Templates de Usuário** (depende de) — cargo e tipo de contrato definem o template aplicado automaticamente\n- **↔ Estrutura Organizacional** (depende de) — colaborador precisa de cargo/departamento/área cadastrados\n\n---\n\n*Celebrar quem chega é celebrar a Fetely ganhando alguém novo.* 🎉';

  v_diagrama := E'flowchart TB\n    subgraph Candidato["🌐 Novo colaborador"]\n        A1[Aceita proposta]\n        A2[Recebe convite por email]\n        A3[Preenche dados + docs]\n        A4[Chega no D+0]\n    end\n    \n    subgraph RH["📋 RH"]\n        B1[Sistema gera convite automático]\n        B2[Envia email de convite]\n        B3[Lembretes automáticos 2d/5d]\n        B4[Valida dados preenchidos]\n        B5[Importa colaborador]\n        B6[Notifica todos envolvidos]\n    end\n    \n    subgraph TI["💻 TI"]\n        C1[Recebe notificação]\n        C2[Provisiona acessos]\n        C3[Prepara equipamento]\n        C4[Valida no D-1]\n    end\n    \n    subgraph Lider["👑 Líder direto"]\n        D1[Decide: conduz ou delega a buddy?]\n        D2[Mensagem pessoal no D-1]\n        D3[Recebe no D+0]\n        D4[Check-ins diários 1ª semana]\n    end\n    \n    subgraph Sistema["⚙️ People Fetely"]\n        E1{Integridade OK?}\n        E2[Cria colaborador]\n        E3[Aplica template de acesso]\n        E4[Inicia onboarding_checklist]\n        E5[Envia boas-vindas]\n    end\n    \n    A1 --> B1\n    B1 --> B2\n    B2 --> A2\n    A2 --> A3\n    B3 -.lembra.-> A2\n    A3 --> B4\n    B4 --> E1\n    E1 -- Não --> A3\n    E1 -- Sim --> B5\n    B5 --> E2\n    E2 --> E3\n    E3 --> E4\n    E4 --> E5\n    E5 -.notifica.-> C1\n    E5 -.notifica.-> D1\n    E5 -.notifica.-> B6\n    C1 --> C2\n    C2 --> C3\n    C3 --> C4\n    D1 --> D2\n    D2 --> A4\n    C4 --> A4\n    A4 --> D3\n    D3 --> D4\n    D4 --> Integracao([🚀 Integração & Primeiro Dia Produtivo — outro processo])\n    \n    classDef destaque fill:#1a3d2b,color:#fff,stroke:#1a3d2b\n    class D3,A4,Integracao destaque';

  INSERT INTO public.processos (codigo, nome, descricao, narrativa, diagrama_mermaid, area_negocio_id, natureza_valor, status_valor, sensivel)
  VALUES (
    'onboarding',
    'Onboarding CLT + PJ',
    'Do convite enviado ao primeiro dia de trabalho — receber quem chega como Fetely recebe, em 5 dias. CLT e PJ: mesmo onboarding, deveres legais diferentes.',
    v_narrativa, v_diagrama, v_area_adm, 'guia', 'vigente', false
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
    INSERT INTO public.processos_tags_sistemas(processo_id, sistema_id)
    SELECT v_proc_id, id FROM public.sncf_sistemas WHERE slug = 'people' AND ativo = true
    ON CONFLICT DO NOTHING;

    INSERT INTO public.processos_versoes (
      processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot,
      natureza_snapshot, diagrama_snapshot, motivo_alteracao
    )
    VALUES (
      v_proc_id, 1, 'Onboarding CLT + PJ',
      'Do convite enviado ao primeiro dia de trabalho',
      v_narrativa, 'guia', v_diagrama,
      'Primeira versão — processo único para CLT e PJ conforme DNA Fetely. Identificada descoberta de processo separado (Integração & Primeiro Dia Produtivo).'
    );
    UPDATE public.processos SET versao_atual = 1, versao_vigente_em = now() WHERE id = v_proc_id;

    IF v_proc_recrutamento IS NOT NULL THEN
      INSERT INTO public.processos_ligacoes (processo_origem_id, processo_destino_id, tipo_ligacao, descricao, ordem)
      VALUES (v_proc_recrutamento, v_proc_id, 'dispara', 'Proposta aceita dispara criação automática do convite de Onboarding', 1)
      ON CONFLICT DO NOTHING;
    END IF;
    IF v_proc_acesso IS NOT NULL THEN
      INSERT INTO public.processos_ligacoes (processo_origem_id, processo_destino_id, tipo_ligacao, descricao, ordem)
      VALUES (v_proc_id, v_proc_acesso, 'depende_de', 'Provisionamento de acesso é parte integrante do onboarding', 2)
      ON CONFLICT DO NOTHING;
    END IF;
    IF v_proc_templates IS NOT NULL THEN
      INSERT INTO public.processos_ligacoes (processo_origem_id, processo_destino_id, tipo_ligacao, descricao, ordem)
      VALUES (v_proc_id, v_proc_templates, 'depende_de', 'Template de acesso aplicado automaticamente baseado em cargo+contrato', 3)
      ON CONFLICT DO NOTHING;
    END IF;
    IF v_proc_est_org IS NOT NULL THEN
      INSERT INTO public.processos_ligacoes (processo_origem_id, processo_destino_id, tipo_ligacao, descricao, ordem)
      VALUES (v_proc_id, v_proc_est_org, 'depende_de', 'Colaborador precisa de cargo/departamento/área cadastrados', 4)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

INSERT INTO public.processos_sugestoes (processo_id, titulo_sugerido, descricao, origem, status)
SELECT NULL, 'Integração & Primeiro Dia Produtivo',
  E'Processo descoberto durante o mapeamento do Onboarding (19/04/2026).\n\n**Escopo:** começa no D+0 (primeiro dia de trabalho) e cobre os primeiros 30-60 dias do colaborador até atingir "integração produtiva completa".\n\n**Inclui:**\n- Primeira semana estruturada (apresentações, contexto de time, objetivos)\n- Acompanhamento de buddy/padrinho (quando aplicável)\n- Treinamento de cultura Fetely (DNA, manifesto, história)\n- Treinamento técnico específico do cargo\n- Check-ins estruturados (7, 15, 30, 60 dias)\n- Primeira avaliação informal (30 dias)\n- Marco de "integração completa" (quando colaborador está produtivo)\n\n**Princípio DNA:** PJ e CLT passam pela mesma integração — mesma cultura, mesmo treinamento, mesmo acolhimento. Só a rescisão na saída tem deveres legais diferentes.\n\n**Responsáveis esperados:**\n- R: Líder direto\n- A: Gerente de área\n- C: RH (cultura), buddy/padrinho\n- I: Time adjacente\n\n**Motivo de separação do Onboarding:** Onboarding termina no D+0 (chegada). A jornada de integração real é mais longa (30-60 dias), tem dinâmica diferente (treinamentos, avaliações, marcos), e merece processo próprio. Tentar juntar com Onboarding diluiria ambos.\n\n**Prioridade sugerida:** depois de termos mapeado os processos operacionais básicos (NF, Folha, Desligamento). Faz sentido depois que tivermos o "ciclo de vida completo do colaborador" bem definido.',
  'descoberto_em_mapeamento', 'pendente'
WHERE NOT EXISTS (
  SELECT 1 FROM public.processos_sugestoes
  WHERE titulo_sugerido = 'Integração & Primeiro Dia Produtivo' AND status = 'pendente'
);