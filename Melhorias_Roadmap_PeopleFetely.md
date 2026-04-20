# Melhorias & Roadmap — People Fetely
**Documento Vivo · Atualizado em 19/04/2026 · Fonte única de verdade**

> Norte de desenvolvimento do sistema. Registra tudo que ainda será feito —
> desde ajustes pontuais até novos módulos completos.
> Este é o roadmap oficial. Atualizar sempre que uma nova ideia surgir
> ou um item for implementado.

---

## Como usar este documento

**Tipo:**
- 🔧 Melhoria — ajuste ou evolução em algo que já existe
- 🚀 Novo — funcionalidade ou módulo novo
- 🏛 Estrutural — regra, doutrina ou arquitetura
- 🔒 Compliance — LGPD, segurança, auditoria

**Prioridade:** 🔴 Alta · 🟡 Média · 🟢 Baixa · 💡 Ideia (a avaliar)

**Status:** 💡 Ideia · 📋 Planejado · 🔧 Em andamento · ✅ Concluído

---

## ✅ CONCLUÍDOS (desde abr/14)

### M001 · Recrutamento — Skills por área com filtro inteligente ✅
**Concluído em:** abr/2026 (descoberto em validação 19/04)  
Tabela `skills_catalogo` criada, hook `useSkillsCatalogo` funcionando, filtro aplicado.

### M002 · Recrutamento — Drawer de perfil do candidato ✅
**Concluído em:** abr/2026 (descoberto em validação 19/04)  
Componente `src/components/recrutamento/CandidatoDrawer.tsx` criado e integrado ao kanban.

### N007 · Importador de NF PJ via Claude API ✅
**Concluído em:** abr/2026 (descoberto em validação 19/04)  
Edge function `parse-nf-pdf` implementada. Extração automática de campos operacional.

### PROCESSOS FETELY · Fundação completa ✅
**Concluído em:** 19/04/2026 (PF1 → PF2 → PF3 → PF3.1)  
Base unificada com 11 tabelas, versionamento, diagramas Mermaid, ligações, integração com Fala Fetely. 7 processos vivos cadastrados (3 fundação + 4 retroativos). Doutrina "silencioso vs mapeado" documentada.

### RECRUTAMENTO · Processo piloto mapeado em Processos Fetely ✅
**Concluído em:** 19/04/2026  
Primeiro processo real da operação mapeado com narrativa rica, swim lanes, RACI, KPIs candidatos identificados.

### ONBOARDING CLT+PJ · Processo mapeado em Processos Fetely ✅
**Concluído em:** 19/04/2026  
Onboarding único para CLT e PJ conforme DNA ("mesmo tratamento, deveres legais diferentes"). Descoberta "Integração & Primeiro Dia Produtivo" registrada como sugestão de processo futuro.

### DASHBOARD · Sugestões do Fala Fetely integradas ao card Alertas ✅
**Concluído em:** 19/04/2026  
Componente `SugestoesInboxDialog` permite RH avaliar sugestões (aceitar/rejeitar/aplicada) diretamente do Dashboard. Policy ampliada para admin_rh e gestor_rh.

### DASHBOARD · Visibilidade C-Level nos agregados (S1c) ✅
**Concluído em:** 19/04/2026  
Não-super_admin vê agregados (salário médio, custo total, custo por departamento) excluindo cargos C-Level. Disclaimer "* C-Level excluídos" aplicado.

### FETELY EM NÚMEROS v0.1 · Pilar documentado ✅
**Concluído em:** 19/04/2026  
Doc vivo em `docs/pilares/FETELY_EM_NUMEROS.md` com manifesto, 5 princípios, arquitetura futura proposta e seed de 7 KPIs do Recrutamento. Construção estrutural ativa quando houver ~5 processos mapeados.

### M-GER-01 · Report de Erros Universal ✅

**Concluído em:** 19/04/2026  

Canal colaborativo completo: botão flutuante global em todos os layouts (AppLayout + SNCFLayout), tabela `sistema_reportes` com RLS, tipos e status parametrizáveis, inbox admin em `/admin/reportes` com filtros e ações de tratamento. Primeiro passo do sistema colaborativo — usuários agora têm canal formal pra reportar bugs, sugestões e confusões.

### M-PORT-01 a 05 · Portal reorganizado ✅

**Concluído em:** 19/04/2026  

Reorganização completa do PortalSNCF: Minhas Tarefas + Fala Fetely como cards gêmeos no topo (Fala Fetely virou card limpo, não mais botão grande). Atalhos personalizados baseados em uso real (tabela `navegacao_log` + função `meus_atalhos_personalizados` + hook `useRegistrarNavegacao` ativo no AppLayout). Cards de sistemas compactados. Sistemas externos em grid 3 colunas. Botão "voltar pro último sistema" removido do SNCFSidebar. Sistemas externos agora visíveis no sidebar como grupo próprio. Navegação limpa e focada.

### M-DASH-01 · Dashboard unificado + Gestão à Vista ✅

**Concluído em:** 19/04/2026  

Resolução estratégica: Dash Operacional deixou de ser tela genérica sem dono. `/dashboard` agora abre direto na Gestão (sem Tabs). Velocidade + InsightsIA migraram para dentro da Gestão (são analíticos). Radar operacional migrou para Minhas Tarefas (é ação de quem faz). `DashboardOperacional.tsx` deletado (função redistribuída). Nova tela `/gestao-a-vista` criada como placeholder estruturado — primeiro artefato visível do pilar Fetely em Números. Cada tela com propósito e dono únicos.

### RADAR OPERACIONAL em Minhas Tarefas ✅

**Concluído em:** 19/04/2026  

Componente `RadarOperacional` adicionado ao topo de `/tarefas` mostrando indicadores que são "ação do RH/admin" — convites aguardando importação, contratos PJ vencendo, contratos pendentes assinatura, documentos vencendo. Aparece apenas para super_admin e admin_rh. Só mostra indicadores com valor > 0. Cada card leva direto pra rota de ação.

### M-PES-01 · Dados corporativos organizados ✅

**Concluído em:** 19/04/2026  

Campo `telefone_corporativo` adicionado a `colaboradores_clt` e `contratos_pj`. Wizards CLT (StepDadosEmpresa) e PJ (StepDadosProfissionaisPJ) com campo visível e editável. Payload de cadastro/edição persiste corretamente.

### M-PES-02 · Telefone corporativo na tela lateral ✅

**Concluído em:** 19/04/2026  

DrawerUsuario reestruturado com seção dedicada "Dados corporativos" — email corporativo destacado em primeiro, telefone corporativo clicável (tel:), fallback para email pessoal quando corporativo não existe. Hierarquia visual respeita DNA "os de dentro primeiro".

### M-PES-03 · Bug Bruna (nome/CPF + acesso órfão) ✅

**Concluído em:** 19/04/2026  

Pessoas.tsx agora prioriza `contato_nome` (pessoa física) em vez de `nome_fantasia`/`razao_social` (empresa). Empresa/fantasia vira subtítulo discreto. Função `verificar_user_orfao` + hook `useUsuariosOrfaos` detectam usuários referenciados mas inexistentes em auth.users. Badge "Acesso inconsistente" sinaliza visualmente. Contador "Sem acesso" agora conta órfãos também.

### M-PES-04 · Navegação consistente ✅

**Concluído em:** 19/04/2026  

ColaboradorDetalhe e ContratoPJDetalhe aceitam `location.state.from` — quando chegada via /pessoas, voltar volta pra /pessoas; quando via /colaboradores ou /contratos-pj, mantém comportamento original. Fallback seguro garante zero regressão.

### P-10 · Revogação automática de acesso D+30 (LGPD) ✅

**Concluído em:** 19/04/2026  

Job pg_cron diário às 03:00 UTC agendado: `revogar_acessos_ex_colaboradores_diario`. Função corrigida bônus — PJ agora usa `data_fim` (campo correto), não `data_desligamento` (bug histórico silencioso). View `revogacoes_acesso_historico` para auditoria LGPD (Dra. Renata). Execução manual feita para processar pendências acumuladas.

### M-BC-01 · Conhecimento — área de negócio no lugar de perfil ✅

**Concluído em:** 19/04/2026  

Campo `area_negocio` adicionado em `base_conhecimento`. Tela `/fala-fetely/conhecimento` agora usa dropdown que lê `parametros` categoria `area_negocio` (regra arquitetural: dimensões via tabela). Badge 🎯 exibe área na lista. Campo antigo `publico_alvo` mantido como deprecated para compatibilidade.

### METODOLOGIA UAUUU · Documentação fundacional em 3 casas ✅

**Concluído em:** 19/04/2026 (validado: 19/04/2026 22:00)  

Metodologia de trabalho do Uauuu consolidada após fechamento das 4 frentes de mesa limpa (D→A→B→C). Organizada em **3 casas complementares sem sobreposição**, agora todas verificadas no código:

1. **📁 `docs/METODOLOGIA_UAUUU.md`** (276 linhas) — princípios (8), tipos de prompt (3), regras de ouro (10), anti-padrões (7). Fonte consultada por dev/Claude em abertura de sessão.

2. **🔄 Processo `trabalhar_no_uauuu`** em Processos Fetely (migration 20260419210632) — fluxo operacional executável (10 passos do Ciclo Uauuu), narrativa completa, diagrama Mermaid, RACI, KPIs candidatos. Meta-processo que governa todos os outros.

3. **🧠 12 cards fragmentados no Fala Fetely** (migrations 20260419212616 + card novo 19/04/2026 22:05) — 9 diretrizes, 2 regras de boards, 1 conceito nuclear.

**Onde começa uma nova sessão:** `docs/METODOLOGIA_UAUUU.md` → identifica o passo do ciclo → consulta cards pontuais do Fala Fetely conforme tema surge.

### REPORTES DO SISTEMA · Movido para camada transversal ✅

**Concluído em:** 19/04/2026  

Saiu do AppSidebar (People) e entrou no SNCFSidebar (Uauuu transversal). Rota `/admin/reportes` renderiza em SNCFLayout. Gerou doutrina permanente (agora cadastrada no Fala Fetely): "funcionalidade multi-sistema pertence à camada transversal". N005 Configurações quando construída nasce transversal.

### FASE NF-0 · Preparação conceitual do fluxo de Emissão de NF PJ ✅

**Concluído em:** 19/04/2026  

Primeira aplicação oficial do padrão "código e processo nascem juntos" da Metodologia Uauuu. Duas sub-fases:

**NF-0.A — Backend conceitual** (migration 20260419214919):
- Campo `categoria_pj` em `contratos_pj` (colaborador vs prestador_servico)
- Tabela `nf_pj_classificacoes` com RLS (permite quebrar valor de NF em categorias: contrato, extra_projeto, reembolso, ajuste_retroativo)
- 4 categorias de valor parametrizadas (DRE correto — separa folha de despesa variável)
- 4 parâmetros operacionais (email responsável pagamento, dias antecedência, cron dia e hora)
- 9 status granulares cadastrados em `status_nf_pj`
- Processo `emissao_nf_pj` cadastrado em Processos Fetely como **versão 0 / rascunho** com narrativa completa, escopo das 4 fases, tags, consultas ao board, menção ao espelho `fechamento_folha_clt`

**NF-0.B — Cadastro manual emergencial**:
- Componente `CadastroManualContratoPJ.tsx` (formulário único, não wizard)
- Rota `/contratos-pj/novo-manual` com `ProtectedRoute permModule=contratos_pj permAction=create`
- Botão "Manual" em `/contratos-pj` visível apenas para super_admin e admin_rh (dupla proteção: gate UI + gate rota)
- Suporta classificação `categoria_pj` (colaborador vs prestador_servico)
- Uso recomendado: migração de base, correção, casos emergenciais

**Próximo passo:** Fase NF-1 (Portal do PJ `/minhas-notas` + cron mensal + tarefa de emissão).

### PROCESSOS SILENCIOSOS MAPEADOS · Revogação D+30 + Triagem Reportes ✅

**Concluído em:** 19/04/2026 (migration 20260420000911)  

Aplicação da doutrina "tem R humano? vai pro mapa". Dois processos que rodavam silenciosos no banco ganharam casa em Processos Fetely:

- **`revogacao_acesso_d30`** — automação LGPD com supervisão humana (R = Dra. Renata). Marcado como sensível.
- **`triagem_reportes_sistema`** — canal colaborativo Uauuu, inbox de reportes (R = Admin RH).

Total de processos em Processos Fetely agora: 11.

### FASE NF-1.B · Portal do PJ + submit via tarefa ✅

**Concluído em:** 19/04/2026 (migrations 20260420001822 + commit c6860a4)  

Primeira tela real do fluxo NF PJ. PJ colaborador agora tem portal funcional e autônomo.

**Entregues:**

- Bucket storage `notas-fiscais-pj` privado (15MB, PDFs) com policies por contrato
- Policies INSERT/SELECT em `notas_fiscais_pj` para PJ autor
- Função `meu_contrato_pj_ativo()` para portal
- Hook `useMinhasNotas` (187 linhas) com 3 sub-hooks (contrato, notas, submit)
- Página `/minhas-notas` com timeline vertical por competência
- Componente `SubmeterNFDialog` (388 linhas) — upload PDF → parse via IA → classificação inteligente → submit
- Card do contrato ativo
- Rota SNCF + link no sidebar (só visível se PJ tem contrato ativo)
- Integração em `/tarefas`: tarefa `tipo_processo=emissao_nf` abre dialog especial

**Filosofias aplicadas:**

- Timeline vertical (Beatriz) — visão temporal carinhosa
- Dialog inline na tarefa (reforça "tarefa é o centro")
- Classificação só quando valor não bate com contrato (reduz fricção — 90% dos casos)
- Competência vem da tarefa (cron criou)

**Próximo passo:** Fase NF-2 (validação automática: IA + regras cadastrais + regras de valor).

### FASE NF-2 · Validação automática de NF PJ ✅

**Concluído em:** 20/04/2026 (migration 20260420003218)  

Trigger `trg_nf_pj_auto` AFTER INSERT em `notas_fiscais_pj` roteia automaticamente:

- NF válida (CNPJ+valor contrato+justificativas OK) → status `aguardando_aprovacao` + tarefa `aprovacao_nf` pro RH
- NF inválida → status `precisa_correcao` + tarefa `correcao_nf` volta pro PJ com motivo inline
- Função `validar_nf_pj` retorna JSONB puro com erros + warnings
- `SubmeterNFDialog` ganhou props `modoCorrecao`, `motivoCorrecao` — mostra alert vermelho quando PJ reabre tarefa de correção
- Processo `emissao_nf_pj` evoluiu para v2

### FASE NF-3 + NF-4 (FECHAMENTO) · Aprovação RH + email + governança + KPIs ✅

**Concluído em:** 20/04/2026 (migration 20260420004044)  

Módulo NF PJ **completo** em 7 fases (NF-0.A → NF-4). Último prompt fecha o ciclo.

**Entregues:**

- Tabela `nf_pj_log_fiscal` dedicada (retenção perpétua, 3 RLS policies) — Dra. Renata
- 5 funções SQL: `aprovar_nf_pj`, `rejeitar_nf_pj`, `marcar_nf_enviada_pagamento`, `reabrir_nf_pj` (só super_admin — mecanismo de disputa do Thiago), `registrar_log_fiscal_nf`
- View `kpis_nf_pj_mensal` — folha contratual, despesa variável, taxa aprovação 1ª tentativa (base pro Fetely em Números)
- Componente `AprovarNFDialog` (317 linhas) — RH vê resumo completo + classificações + PDF + decide aprovar ou rejeitar
- Integração com template `nf-pagamento` (já existente!) para envio automático pro responsável pelo pagamento
- Processo `emissao_nf_pj` chega à **versão 3 (FINAL)** em Processos Fetely

**Fluxo completo ativo:**

1. Cron dia 25 cria tarefa `emissao_nf` pro PJ
2. PJ submete via `/minhas-notas`
3. Trigger valida automaticamente
4. Se OK → tarefa `aprovacao_nf` pro RH
5. RH aprova → email pro financeiro parametrizável
6. Status `enviada_pagamento` = FIM do fluxo Uauuu
7. Retorno de pagamento permanece manual (fora do escopo — confirmado)

**Governança ativa:**

- Log fiscal dedicado (separado de email genérico)
- Disputa formal via `reabrir_nf_pj` (só super admin)
- 6 KPIs expostos na view mensal
- Auditoria perpétua — NF paga nunca é deletada

**Doutrinas aplicadas neste módulo:**

- Código e processo nascem juntos (primeiro teste oficial) ✅
- Portal é orquestrador, email é auxiliar ✅
- Dimensão via tabela (4 categorias parametrizadas) ✅
- CLT = PJ mesmo tratamento (processo espelho) ✅
- Tem R humano? Vai pro mapa ✅
- Permissões revistas (PJ, admin_rh, super_admin) ✅

---

## 🔴 ALTA PRIORIDADE

### N001 · Controle de Ponto
**Tipo:** 🚀 Novo | **Prioridade:** 🔴 Alta | **Status:** 📋 Planejado  
**Responsável board:** Ricardo Mendes

Obrigatório para colaboradores CLT. Impacto direto no eSocial (CAGED, RAIS). Deve suportar turnos para unidade fabril de Joinville. Nenhuma alteração neste módulo sem trilha de auditoria completa.

**Dependências:** nenhuma — pode ser o próximo módulo.  
**Atenção:** validar com Dr. Marcos (NRs) antes de ativar para chão de fábrica.

---

### N002 · Relatórios com Auditoria
**Tipo:** 🚀 Novo | **Prioridade:** 🔴 Alta | **Status:** 📋 Planejado  
**Responsável board:** Ricardo Mendes

Trilha de auditoria completa para todos os módulos: folha, ponto, benefícios, admissões, movimentações. Requisito de compliance antes de escalar o sistema.

**Dependências:** todos os módulos existentes precisam expor eventos auditáveis.

---

### C001 · DPO designado formalmente + política de retenção LGPD
**Tipo:** 🔒 Compliance | **Prioridade:** 🔴 Alta | **Status:** 📋 Planejado  
**Responsável board:** Dra. Renata Souza (LGPD)

DPO mencionado em documentação mas não cadastrado formalmente. Política de retenção de candidatos (180 dias) mencionada no código mas sem trigger/função de expurgo. Obrigatório antes de ativar Recrutamento em produção com candidatos reais.

**Bloqueia:** ativação de Recrutamento com candidatos CLT reais.

---

## 🟡 MÉDIA PRIORIDADE

### NF-1 · Portal do PJ + Tarefa de Emissão
**Tipo:** 🚀 Novo | **Prioridade:** 🔴 Alta | **Status:** 📋 Planejado — próximo  
**Responsável board:** Beatriz Lemos (UX) + Ricardo Mendes (Ops)

Primeira fase com UI real do fluxo NF PJ:
- Tela `/minhas-notas` no portal PJ (timeline visual, status por competência)
- Cron mensal parametrizável cria tarefa "Emitir NF competência X" para cada PJ colaborador ativo
- Tarefa permite: anexar PDF + classificar valores (contrato/extra/reembolso) + justificativa antecipada
- Status inicial: `aguardando_validacao` (sem validação IA ainda — vem na NF-2)
- Evolui processo `emissao_nf_pj` para versão 1 em Processos Fetely

---

### NF-2 · Validação Automática (IA + regras)
**Tipo:** 🚀 Novo | **Prioridade:** 🟡 Média | **Status:** 💡 Ideia — depende da NF-1

---

### NF-3 · Aprovação RH + Envio Financeiro
**Tipo:** 🚀 Novo | **Prioridade:** 🟡 Média | **Status:** 💡 Ideia — depende da NF-2

---

### NF-4 · Governança + KPIs
**Tipo:** 🔧 Melhoria | **Prioridade:** 🟢 Baixa | **Status:** 💡 Ideia — depende da NF-3

---

### N003 · Avaliações de Desempenho
**Tipo:** 🚀 Novo | **Prioridade:** 🟡 Média | **Status:** 💡 Ideia  
**Responsável board:** Thiago Serrano

Ciclos de avaliação vinculados ao cargo (skills obrigatórias como régua). Baseline do processo seletivo vira ponto de partida para a primeira avaliação. Período de experiência CLT (D+45 e D+90) gera alertas automáticos.

**Dependências:** Cargos e Salários (skills por cargo), Recrutamento (scorecard).

---

### N004 · Treinamentos
**Tipo:** 🚀 Novo | **Prioridade:** 🟡 Média | **Status:** 💡 Ideia

Plano de treinamento vinculado ao cargo e disparado automaticamente no onboarding. Trilhas de desenvolvimento por nível (Jr → Pl → Sr).

**Dependências:** Cargos e Salários, Onboarding estruturado.

---

### N005 · Configurações avançadas
**Tipo:** 🚀 Novo | **Prioridade:** 🟡 Média | **Status:** 💡 Ideia

Parâmetros avançados do sistema: notificações, integrações, customizações de fluxo. Complementa o módulo de Parâmetros existente.

**Pertencimento (doutrina):** transversal — quando construída, vai em SNCFLayout + SNCFSidebar, não em AppLayout (People). Configurações de sistema servem todos os pilares.

---

### N006 · Dashboard Operacional do RH
**Tipo:** 🚀 Novo | **Prioridade:** 🟡 Média | **Status:** 💡 Ideia  
**Responsável board:** Ricardo Mendes + Beatriz Lemos

Dashboard **operacional** do RH — diferente do Dashboard Executivo (custos/headcount). Visão do pulso das ações em andamento:

- Convites pendentes, admissões em andamento, contratos vencendo
- Funil de recrutamento: vagas abertas × candidatos × etapas
- Onboardings em andamento com % de conclusão
- Alertas de compliance: período de experiência, documentos pendentes
- Indicadores: NPS interno, turnover, tempo médio de contratação
- Visão por gestor direto: pendências do time

**Dependências:** Ponto (N001), Avaliações (N003), Onboarding estruturado.

---

### P001 · Processo "Integração & Primeiro Dia Produtivo"
**Tipo:** 🏛 Estrutural (Processos Fetely) | **Prioridade:** 🟡 Média | **Status:** 💡 Ideia

Processo descoberto durante mapeamento do Onboarding (19/04/2026). Cobre os primeiros 30-60 dias do colaborador até atingir "integração produtiva completa". Já registrado em `processos_sugestoes` como processo futuro.

**Dependências:** ciclo de vida completo do colaborador mapeado (Onboarding + NF + Folha + Desligamento).

---

### FEN-EST · Fetely em Números · Construção estrutural
**Tipo:** 🏛 Estrutural | **Prioridade:** 🟡 Média | **Status:** 💡 Ideia

Após ter ~5 processos reais mapeados (hoje: 2), construir estrutura completa do pilar Fetely em Números:
- Tabelas: `kpis`, `kpis_metas`, `kpis_valores`, `kpis_processos`, `kpis_alertas`
- Integração Processos Fetely (aba "Números" por processo)
- Dashboards por perfil (CEO, pilar, operacional)
- Integração Fala Fetely (responder com processo + números juntos)

---

### ES001 · Segunda conversa estratégica pós-Uauuuu
**Tipo:** 🏛 Estrutural | **Prioridade:** 🟡 Média | **Status:** ⏸ Aguardando Flavio

Flavio tinha 2 conversas estratégicas pendentes após projeto Uauuuu (SNCF). A primeira era KPIs (virou Fetely em Números). A segunda permanece aguardando Flavio lembrar e trazer.

---

## 🟢 BAIXA PRIORIDADE

### REEMB-01 · Processo de Reembolso de Despesas (PJ + CLT)

**Tipo:** 🚀 Novo | **Prioridade:** 🟢 Baixa | **Status:** 💡 Ideia  
**Responsável board:** Ricardo Mendes + Thiago Serrano

Processo irmão da Emissão de NF PJ. Compartilha arquitetura (tarefa → anexo → validação → aprovação → pagamento), mas dados próprios (comprovante de despesa, política de reembolso, tipo de despesa). Serve tanto CLT quanto PJ.

**Dependência:** esperar Emissão de NF PJ concluir (validar arquitetura de tarefas antes de replicar).

**Componentes esperados:**
- Tela `/meus-reembolsos` no portal do colaborador (análogo a `/minhas-notas`)
- Categorias de despesa parametrizáveis
- Política de limite por categoria
- Aprovação em 2 níveis (gestor direto + RH/Financeiro)
- Classificação separada no DRE (não é folha, é despesa variável)

---

### M003 · Cargos e Salários — Filtros de ordenação
**Tipo:** 🔧 Melhoria | **Prioridade:** 🟢 Baixa | **Status:** 📋 Pendente  
**Área:** /cargos → listagem

Adicionar opções de ordenação na tabela de Cargos e Salários:
- Ordem alfabética A→Z / Z→A (padrão atual)
- Por faixa salarial F1 CLT mín crescente ou decrescente
- Por nível: Jr → Pl → Sr → Coordenação → Especialista → C-Level

Ordenação no frontend (dados já carregados). Persistir preferência no localStorage.

---

### B001 · Ensinar Flavio a usar SQL Editor do Supabase
**Tipo:** 🏛 Estrutural | **Prioridade:** 🟢 Baixa | **Status:** 💡 Ideia

Quando momento estiver calmo, guiar Flavio no uso do SQL Editor para diagnósticos e fixes pontuais. Desbloqueia autonomia operacional.

---

### B002 · Reativar Claude for Chrome em contextos controlados
**Tipo:** 🏛 Estrutural | **Prioridade:** 🟢 Baixa | **Status:** ⏸ Hold

Extensão instalada mas desativada por estarmos em produção crítica. Primeiro uso previsto: pilar Marca (captar mensagens Instagram @fetely.oficial). Regra: nunca em produção sem Flavio assistindo.

---

### B003 · Diretriz de segurança — Prompt Injection via GitHub
**Tipo:** 🔒 Compliance | **Prioridade:** 🟢 Baixa | **Status:** 💡 Ideia

Quando criarmos novos agentes/automações que leiam conteúdo externo (PRs de terceiros, issues, repositórios públicos), estabelecer diretriz de sanitização e "guardrails de contexto externo" para qualquer agente novo do SNCF.

**Hoje não é risco** (só Claude lê repo e só em resposta a publicação do Flavio).

---

### DT-01 · Migração de `isSuperAdmin` inline → PermissionGate

**Tipo:** 🔧 Melhoria técnica | **Prioridade:** 🟢 Baixa | **Status:** 📋 Planejado

~50 usos de `isSuperAdmin` espalhados em 20+ arquivos. Nem todos são equivalentes:

- Alguns são **lógica de negócio legítima** (ex: `const canSeeSalary = isSuperAdmin || ...`) e devem ficar inline

- Outros são **renderização condicional** (`{isSuperAdmin && <Button />}`) e ganham clareza/consistência ao migrar pra `<PermissionGate>`

- Usos em `ProtectedRoute` já são gates corretos

**Por que não fazer em massa:** análise caso a caso é obrigatória. Migração automática introduz risco de regressão em vários lugares simultaneamente.

**Recomendação:** quando atacar, fazer em **ondas por arquivo** (um componente por vez, validar, commitar). Não é bloqueador de nada.

**Arquivos com mais usos (priorizar no futuro):**

- `src/pages/GerenciarUsuarios.tsx` (8 usos)

- `src/pages/ContratoPJDetalhe.tsx` (6 usos)

- `src/pages/RecrutamentoDetalhe.tsx` (4 usos)

- demais com 2-3 usos cada

---

## 🏛 DOUTRINAS PERMANENTES (não são tarefas, são posturas)

Estas regras foram estabelecidas ao longo das sessões e devem ser respeitadas em todas as construções futuras:

1. **Dimensões sempre via tabela, nunca hardcode** — área, departamento, unidade, cargo, sistema vêm de tabelas-fonte. Nunca array literal com valores de negócio.
2. **Doutrina silencioso vs mapeado (Processos Fetely)** — "tem R humano/papel? Vai pro mapa. Não tem? Silencioso." Operações técnicas só entram se têm responsável identificável.
3. **Responsabilidade compartilhada de mapeamento** — toda construção/feature gera ou atualiza processo correspondente em Processos Fetely.
4. **GitHub é fonte de verdade** — `git pull` antes de qualquer afirmação sobre estado do sistema.
5. **Protocolo processo-dentro-de-processo** — processo novo descoberto durante mapeamento vai pra `processos_sugestoes` com `processo_id=NULL` sem parar o trabalho atual.
6. **CLT e PJ recebem mesmo tratamento** — mesmos processos, benefícios, onboarding, cultura. Diferença apenas nos deveres legais.
7. **Alimentar DNA TI Fetely continuamente** — toda doutrina/diretriz relevante deve ser capturada no doc vivo do pilar TI.

### Doutrina · Camada transversal (SNCF/Uauuu) vs pilar específico

Funcionalidade que atende **múltiplos sistemas** pertence à camada transversal (SNCF/Uauuu), não a um pilar específico (People, TI, Marca, etc).

**Sinais de pertencimento transversal:**

- Qualquer usuário de qualquer sistema pode acionar (ex: Reportes, Fala Fetely, Tarefas)

- É meta-funcionalidade sobre o sistema em si (ex: Configurações, Usuários, Processos)

- Audita ou gerencia múltiplos pilares (ex: Auditoria, Permissões)

**Na prática:**

- Rota dentro do bloco SNCFLayout em `App.tsx`

- Link no `SNCFSidebar`, não em AppSidebar/TISidebar

- URL pode começar com `/sncf/` ou `/admin/` — ambos sinalizam transversalidade

**Exemplos já aplicados:** Portal, Tarefas, Processos, Fala Fetely, Gerenciar Usuários, Meus Dados, Meus Acessos, Reportes do Sistema.

**Futuro:** N005 Configurações **nasce transversal** — SNCFLayout + SNCFSidebar desde o começo.

### Metodologia Uauuu é a constituição do trabalho

Toda doutrina, princípio e regra de como a Fetely constrói tecnologia está codificada em três lugares:

- **Visão geral e consulta dev** → `docs/METODOLOGIA_UAUUU.md`
- **Fluxo operacional (executar uma sessão)** → Processos Fetely, processo `trabalhar_no_uauuu`
- **Consulta pontual por tema** → Fala Fetely, cards com tag `metodologia`

Quando uma doutrina nova emergir, decidir em qual casa ela mora (geralmente Fala Fetely como card individual) e registrar ANTES que vire hábito invisível.

---

*Documento vivo · Fonte única de verdade do roadmap · Atualizar ao concluir item ou descobrir novo.*
*Última atualização: 20/04/2026 — Fase NF-1 completa (A + B). Processos silenciosos mapeados. Mesa produtiva, pronto pra NF-2.*
