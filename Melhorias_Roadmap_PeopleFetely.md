# Roadmap & Melhorias — Fetely/Uauuu

> **Documento vivo.** Atualizado em toda sessão que gerar decisão, feature ou pendência.
> Lema: **"Roadmap sempre atualizado."**
> 
> Última atualização: 20/04/2026

---

## 🎯 Como usar este documento

**Ordem de ataque:** seções organizadas por prioridade (🔴 urgente → 🟢 backlog).
**Ao entrar em nova sessão:** ler este arquivo antes de decidir o próximo movimento.
**Ao fechar temas:** mover do "em aberto" pra "entregues".

---

## 🔴 URGENTE — Próximos temas em ordem

### 1. Projeto Gestão do Líder · Tarefas inteligentes pro time
**Contexto:** navegando em Minhas Tarefas e Tarefas do Time, Flavio identificou 6 achados sistêmicos.
**Escopo previsto:**
- RACI completo no modelo de tarefa (adicionar `accountable_user_id`)
- Férias cruzando com tarefas (alerta pra líder quando alguém de férias tem pendências)
- Radar do Líder ativo (ausências, desequilíbrio de carga)
- Reatribuição com motivo obrigatório + histórico de reatribuições
- Reequilíbrio em massa (selecionar N tarefas, redistribuir em 1 clique)
**Estimativa:** 2-3 prompts sequenciais grandes.

### 2. Projeto Navegação Transversal
**Contexto:** BackButton hoje não tem padrão. Criamos `SmartBackButton` pontualmente em /tarefas, mas sistema inteiro sofre do mesmo problema. Flavio propôs também sistema de navegação personalizada (Recentes + Favoritos).
**Escopo previsto:**
- Aplicar `SmartBackButton` em todas as telas-detalhe do sistema
- Revisar todos os `navigate()` pra passar `state.from` + `fromLabel`
- Documentar padrão no DNA TI Fetely
- **Recentes** (automático): tabela `usuario_paginas_recentes` registra últimas N páginas acessadas por usuário, exibe atalho rápido (local UI a definir: ⌘K, header dropdown, sidebar?)
- **Favoritos** (manual): tabela `usuario_paginas_favoritas`, botão "favoritar" em headers de páginas-chave, lista personalizada por colaborador
- Decisão de UI: ⌘K global vs dropdown header vs seção sidebar (analisar trade-offs no início do projeto)
**Estimativa:** 3-4 prompts (varredura BackButton + sistema de Recentes + sistema de Favoritos + UI integrada).

### 3. Módulo Predictor · Análise inteligente de cumprimento
**Contexto:** Flavio é formado em dados, ADORA esse tema. Feature mágica que usa IA (Gemini) pra prever se colaborador vai entregar tarefas no prazo.
**Lógica:**
- Sistema calcula tempo médio por tipo de tarefa (SLA empírico)
- Cruza carga atual + férias + histórico da pessoa
- Prediz risco de não cumprimento
- Sugere plano de ação pro líder E pro colaborador
**Pré-requisito:** view de tempo médio por tipo, tabela de KPIs por área.
**Teaser já ativo:** `BadgePredictor` em `/tarefas/time` ("Análise IA · em breve").
**Estimativa:** 3-4 prompts — é módulo novo.

### 4. Quadro de KPIs por Área
**Contexto:** Flavio propôs e enxerga conexão direta com Gestão à Vista + Predictor.
**Escopo previsto:**
- Cadastro de KPI por área de negócio (Comercial, RH, TI, Produto, etc.)
- Campos: nome, fórmula, meta, unidade, frequência, responsável
- Captura de oportunidade de KPI durante mapeamento de processos (já marcado como "KPI candidato")
- Alimenta Gestão à Vista com dados reais
- Futura conexão com Mural Fetely (celebração automática quando meta bate)
**Estimativa:** 2 prompts (cadastro + exibição).

---

## 🟡 IMPORTANTE — Temas em aberto

### 5. Pilar Administrativo · BackOffice da empresa
**Contexto:** Flavio propôs (20/04/2026) novo pilar paralelo a People/TI/SNCF. Cuida de TUDO que não é pessoa nem infra técnica — gestão das relações operacionais e contratuais.
**Aplicação da Regra de Ouro dos Menus:** dor não é RH (não é pessoa) nem TI (não é infra) → pilar próprio.
**Escopo previsto:**
- **Contratos** com fornecedores/prestadores não-colaboradores (XPM, Mirandinha, etc. — hoje em markdown no Jurídico Board)
- **Sistemas/SaaS mensais** (Lovable, Supabase, ferramentas) — **cross com TI**: 2 responsáveis (R Admin = comercial/financeiro, R TI = técnico/integrações)
- **Imóveis** (sede SP + Joinville + futuras)
- **Seguros** corporativos
- **Despesas operacionais recorrentes** (água, luz, internet, contabilidade)
- **Compras corporativas** (pedidos, fornecedores não-PJ)
- **Ativos físicos** (móveis primeiro; computadores/headsets/etc. ainda em decisão se migram de TI ou ficam lá)
- ❌ NÃO entra: Folha (People), NFs PJ (People), Licenças de software (TI gerencia ativo)
**Estrutura técnica prevista:**
- Layout próprio (`AdministrativoLayout`)
- Sidebar dedicado
- Tabela `contratos_administrativos` com tipos (fornecedor, sistema, imóvel, seguro, despesa, compra, ativo_fisico)
- Dashboard de vencimentos com alertas
- Histórico e auditoria
**Sub-pendências quando atacar:**
- Decidir migração de ativos TI → Administrativo (computadores, headsets, monitores)
- Migrar `/ti/ativos` para nova rota com redirect
- Renomear grupo "Curadoria" do SNCFSidebar se necessário
**Estimativa:** 6-8 prompts sequenciais — sprint inteiro.

### 6. Documentação TI Fetely · Reformular placeholders
**Contexto:** `/ti/documentacao` tem 4 docs com conteúdo "a ser preenchido". Plano aprovado:
- Apagar: RunBook Técnico, Guia do Usuário, Estado Atual, Roadmap (todos placeholder)
- Criar novos 4 úteis: **DNA TI Fetely**, **Arquitetura SNCF** (4 camadas), **Manual de Deploys** (Lovable + Supabase + cron), **Roadmap TI**
**Estimativa:** 1 prompt médio.

### 7. Redirect involuntário pra tela inicial
**Contexto:** Flavio relatou que sistema volta pra tela inicial sozinho durante uso.
**Suspeitas ranqueadas:**
1. Hot reload do Lovable (mais provável — ambiente dev)
2. Race condition no ProtectedRoute
3. onAuthStateChange em refresh de token
**Próximo passo:** pedir 3 informações ao Flavio quando ele retomar:
- Quando acontece (toda navegação? depois de tempo parado? F5?)
- Qual tela é "inicial" (/sncf? /dashboard?)
- Mensagens de erro no console
**Estimativa:** 30min de diagnóstico + 1 prompt de fix.

### 8. Mural Fetely · Página dedicada `/mural`
**Contexto:** hoje item do menu aponta pra `/sncf` (quick fix). Feature completa virá com:
- Rota dedicada `/mural` com visão completa e filtros
- Submissão pela comunidade (colaborador propõe celebração: casamento, nascimento, reconhecimento)
- Inbox RH para aprovação de submissões
- Opt-out em `/meus-dados` (UI da preferência `mural_preferencias_usuario`)
- Integração com KPIs (quando quadro estiver pronto — celebra meta batida)
- Integração com movimentações (promoção = card automático)
**Estimativa:** 2-3 prompts sequenciais.

### 9. Visibilidade de Salário · Dashboards agregados (S1c)
**Contexto:** infraestrutura principal implementada em 11+ telas. 
**Pendência:** 6 dashboards agregados ainda não aplicam a política `politica_visibilidade_salario`.
**Estimativa:** 1 prompt de varredura.

### 10. Sugestões pendentes do Fala Fetely como alertas para RH
**Contexto:** Flavio mencionou (projeto Uauuuu pós-implementação) que quer:
- Sugestões de processo captadas no Fala Fetely viram atividades/alertas pro RH
- Aparecem no dashboard, inbox de tarefas
- Desenho do fluxo pendente
**Estimativa:** 1 prompt médio.

---

## 🟢 BACKLOG — Não-urgente mas importante

### 11. Delegação de tarefa fora da árvore de liderança
**Contexto:** hoje reatribuição só pra liderados diretos. Futuro:
- Líder A pode delegar tarefa pra pessoa do time do líder B
- Requer regras de governança: aprovação do líder B? aceite da pessoa? registro de responsabilidade cruzada?
**Estimativa:** 1 prompt de desenho + 2 de implementação.

### 12. Ensinar Flavio a usar SQL Editor do Supabase
**Contexto:** hoje toda query de diagnóstico vira prompt pro Lovable. Quando momento for mais calmo, ensinar Flavio a rodar queries diretamente — ganho de velocidade pra ele.

### 13. Ativar Claude for Chrome
**Contexto:** desligado porque estamos em produção crítica. Quando estabilizar, usar em:
- Pilar Marca: captar mensagens do Instagram @fetely.oficial
- Pesquisa e comparação de referências
- Regra: nunca em produção sem Flavio assistindo, preferir ambientes isolados.

### 14. Prompt Injection via GitHub · Guardrails
**Contexto:** importante mas não urgente. Quando agentes/automações lerem repos externos ou PRs de terceiros, risco de instruções maliciosas escondidas em README/comentários/issues. Hoje não é risco (só Claude lê, só em resposta a publicação do Flavio).
**Ação quando escalar:** estabelecer diretriz de sanitização e "guardrails de contexto externo".

### 15. Mapa Mental da Fetely · Base de Conhecimento
**Contexto:** Flavio vai trazer doc cobrindo universo, diretrizes, ideias, conceitos. Ajudar a:
- Estruturar em categorias (mercado, manifesto, conceito, diretriz)
- Cadastrar na base via Edge Function `atualizar-documentacao` ou direto em `/fala-fetely/conhecimento`.

---

## ✅ ENTREGUES RECENTEMENTE · Abril 2026

### 20/04/2026
- ✅ Reestruturação completa de menus (4 sidebars + estética Fetely)
- ✅ Menu **ADM SNCF** (anteriormente "Administração") + rotas `/admin/*` + redirects legados
- ✅ Mural Fetely MVP: schema, job automático, rotação, opt-out
- ✅ Faixa Aniversariantes do mês com destaque dourado
- ✅ Portal layout 2 colunas (Mural 65% + Lista 35%)
- ✅ `data_nascimento` em `contratos_pj`
- ✅ Navegação unificada Pessoas CLT+PJ
- ✅ Nova Tarefa + Editar (Filosofia C-2: default pra si, atalho delegar)
- ✅ Botão destacado "+ Tarefa" em /tarefas/time
- ✅ SmartBackButton em /tarefas + BadgePredictor teaser
- ✅ Voltar ao Portal no AdminLayout/TILayout
- ✅ Seed completo pra apresentação (15 CLT + 8 PJ + tarefas + vagas + NFs)
- ✅ **Importador PDF de Processos** (Edge Function + UI + revisão IA + preview Mermaid + sugestões automáticas + Fala Fetely rascunho + badge detalhe + histórico admin)
- ✅ Renomeações: "Administração" → "ADM SNCF" + grupo SNCFSidebar → "Curadoria"

### 19/04/2026
- ✅ Módulo NF PJ completo (7 fases): cadastro emergencial, cron mensal, portal, validação automática, aprovação RH, envio financeiro
- ✅ Correção crítica Fala Fetely (incidente alucinação NF PJ)
- ✅ Processos Fetely: sistema de mapeamento + 11 processos + base de conhecimento
- ✅ Doutrina de processo mapeado vs silencioso ("tem R? vai pro mapa")

---

## 📐 Doutrinas permanentes vigentes

1. **GitHub é verdade** — `git pull` antes de responder sobre estado do sistema
2. **Dimensão via tabela, nunca hardcode** — se falta tabela, construir primeiro
3. **CLT e PJ têm mesmo tratamento cultural** — processos operacionais podem divergir
4. **Feature sem processo é feature órfã** — toda construção gera/atualiza Processos Fetely
5. **Narrativa de processo vence diretriz cultural** em "como fazer"
6. **Multi-sistema = camada transversal SNCF/Uauuu**
7. **"Tem R humano? Vai pro mapa."** — silencioso vs mapeado
8. **Regra de ouro dos menus:** pessoas → People, tecnologia → TI, transversal → SNCF, configuração global → ADM SNCF, gestão administrativa empresa → Administrativo (futuro)
9. **Fechar antes de abrir** — concluir tema antes de começar outro
10. **Protocolo pré-prompt:** diagnóstico → proposta → OK → prompt
11. **Roadmap sempre atualizado** — lema da mesa
12. **Predictor + KPIs são futuro próximo** — Flavio é formado em dados, explorar com profundidade
