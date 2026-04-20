# Roadmap & Melhorias · Fetely/Uauuu

> **Documento vivo.** Lema: **"Roadmap sempre atualizado."**
> Última atualização: 20/04/2026 (final da sessão)

---

## 🔴 URGENTE — Próximos temas em ordem

### 1. Projeto Gestão do Líder · Tarefas inteligentes
**Escopo:**
- RACI completo (`accountable_user_id`)
- Férias cruzando com tarefas (alertas)
- Radar do Líder ativo (ausências, desequilíbrio)
- Reatribuição com motivo + histórico
- Reequilíbrio em massa

### 2. Projeto Navegação Transversal
**Escopo:**
- `SmartBackButton` no sistema inteiro
- `state.from` universal em todos `navigate()`
- **Recentes** (auto): tabela `usuario_paginas_recentes`
- **Favoritos** (manual): tabela `usuario_paginas_favoritas`
- **Busca Global ⌘K** integrada (Recentes + Favoritos + busca em pessoas/tarefas/processos) — único lugar de descoberta paralela ao Fala Fetely

### 3. Módulo Predictor · Análise IA de cumprimento
**Escopo:**
- View de tempo médio por tipo de tarefa (SLA empírico)
- Cruzar carga + férias + histórico + capacidade
- Predição via Gemini 2.5 Flash
- Plano de ação auto-sugerido (líder + colaborador)
- Já tem teaser ativo: `BadgePredictor` em `/tarefas/time`

### 4. Quadro de KPIs por Área
**Escopo:**
- Cadastro de KPI por área (Comercial, RH, TI, etc.)
- Campos: nome, fórmula, meta, unidade, frequência, R
- Captura de "KPI candidato" durante mapeamento
- Alimenta Gestão à Vista
- Conexão com Mural Fetely (celebra meta batida)

---

## 🟡 IMPORTANTE — Em aberto

### 5. Pilar Administrativo · BackOffice
**Aplicação Regra de Ouro:** dor não é RH nem TI → pilar próprio.
**Escopo:**
- Contratos com fornecedores/prestadores não-colaboradores (XPM, Mirandinha, etc.)
- Sistemas/SaaS mensais (cross com TI: 2 responsáveis — R Admin + R TI)
- Imóveis (sede SP + Joinville + futuras)
- Seguros corporativos
- Despesas operacionais recorrentes
- Compras corporativas
- Ativos físicos (móveis primeiro; computadores/headsets/monitores ainda em decisão)
- ❌ NÃO entra: Folha (People), NFs PJ (People), Licenças software (TI gerencia ativo)

**Estrutura:**
- Layout próprio (`AdministrativoLayout`)
- Sidebar dedicado
- Tabela `contratos_administrativos` com tipos
- Dashboard de vencimentos com alertas
- Auditoria

**Estimativa:** 6-8 prompts sequenciais — sprint inteiro.

### 6. Documentação TI Fetely · Reformular placeholders
- Apagar: RunBook, Guia, Estado, Roadmap (placeholders)
- Criar: DNA TI Fetely, Arquitetura SNCF, Manual Deploys, Roadmap TI

### 7. Redirect involuntário pra tela inicial
**Suspeitas ranqueadas:**
1. Hot reload Lovable
2. Race ProtectedRoute
3. onAuthStateChange em refresh

**Próximo passo:** pedir 3 info ao Flavio

### 8. Mural Fetely · Página dedicada `/mural`
- Rota dedicada com filtros e histórico
- Submissão pela comunidade (casamento, nascimento, reconhecimento)
- Inbox RH para aprovação
- Opt-out em `/meus-dados`
- Integração com KPIs (celebra meta)
- Integração com movimentações (promoção)

### 9. Visibilidade Salário · Dashboards agregados (S1c)
- 6 dashboards ainda sem aplicar `politica_visibilidade_salario`

### 10. Sugestões Fala Fetely → alertas RH
- Sugestões de processo viram tarefas/alertas pro RH

---

## 🟢 BACKLOG — Não-urgente

### 11. Delegação fora da árvore de liderança
- Líder A → pessoa do time do líder B com regras de governança

### 12. Ensinar Flavio SQL Editor Supabase
- Quando tiver tempo

### 13. Ativar Claude for Chrome
- Captar Instagram + pesquisa

### 14. Prompt Injection via GitHub
- Guardrails quando agentes lerem repos externos

### 15. Mapa Mental Fetely · Base Conhecimento
- Estruturar e cadastrar quando Flavio trouxer

---

## ✅ ENTREGUES · 20/04/2026

- ✅ Reestruturação completa de menus (4 sidebars + estética Fetely)
- ✅ Menu **ADM SNCF** (renomeado de "Administração")
- ✅ Grupo SNCFSidebar **"Curadoria"** (renomeado)
- ✅ Mural Fetely MVP (schema + cron + rotação + opt-out)
- ✅ Faixa Aniversariantes do mês (grid adaptável + destaque dourado)
- ✅ Portal layout 2 colunas (Mural 65% + Lista 35%)
- ✅ `data_nascimento` em `contratos_pj`
- ✅ Navegação unificada Pessoas CLT+PJ
- ✅ Nova Tarefa + Editar (Filosofia C-2)
- ✅ Botão "+ Tarefa" destacado em /tarefas/time
- ✅ SmartBackButton em /tarefas + BadgePredictor teaser
- ✅ Voltar ao Portal no AdminLayout/TILayout
- ✅ Seed completo pra apresentação (15 CLT + 8 PJ + tarefas + vagas + NFs)
- ✅ **Importador PDF de Processos completo** (Edge + UI + revisão IA + Mermaid + sugestões + Fala Fetely rascunho + badge + histórico admin)
- ✅ Busca topo desativada (Fala Fetely brilha como interface de descoberta)
- ✅ Documentos vivos atualizados

## ✅ ENTREGUES · 19/04/2026
- ✅ Módulo NF PJ completo (7 fases)
- ✅ Correção crítica Fala Fetely (incidente NF PJ)
- ✅ Processos Fetely (11 processos + base de conhecimento)
- ✅ Doutrina silencioso vs mapeado

---

## 📐 Doutrinas permanentes vigentes

1. **GitHub é verdade** — `git pull` antes de responder
2. **Dimensão via tabela, nunca hardcode**
3. **CLT e PJ têm mesmo tratamento cultural** — operacionais podem divergir
4. **Feature sem processo é feature órfã**
5. **Narrativa de processo vence diretriz cultural**
6. **Multi-sistema = camada transversal SNCF/Uauuu**
7. **"Tem R humano? Vai pro mapa."**
8. **Regra de Ouro dos Menus:** pessoas → People, tecnologia → TI, transversal → SNCF, config global → ADM SNCF, gestão administrativa → Administrativo (futuro)
9. **Fechar antes de abrir**
10. **Protocolo pré-prompt:** diagnóstico → proposta → OK → prompt
11. **Roadmap sempre atualizado** — lema da mesa
12. **Fala Fetely é a interface de descoberta** — busca tradicional vira obsoleta
13. **Predictor + KPIs são futuro próximo** — Flavio é formado em dados
