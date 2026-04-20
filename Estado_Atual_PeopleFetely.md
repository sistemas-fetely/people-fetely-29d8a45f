# Estado Atual · Fetely/Uauuu — Sistema Nervoso Central

## Documento de Continuidade entre Sessões

**Versão 5.0 · 20/04/2026 (final do dia)**

> **Para retomar:** leia este arquivo + `Melhorias_Roadmap_PeopleFetely.md` antes de qualquer movimento.
> **Para apresentar:** este arquivo é o resumo executivo do que foi construído.

---

## 🎯 O QUE A FETELY/UAUUU É HOJE

Sistema operacional completo da empresa Fetely, organizado em **4 pilares + 1 menu admin restrito**:

### Pilares vivos
1. **People Fetely** — RH completo (CLT + PJ tratados como pessoas iguais)
2. **TI Fetely** — gestão de ativos técnicos e infra
3. **SNCF / Uauuu** — camada transversal (tarefas, processos, mural, Fala Fetely)
4. **ADM SNCF** — configuração global restrita (Cargos, Parâmetros, Configurações, Reportes, Importações PDF)

### Pilares previstos no roadmap
5. **Administrativo** — BackOffice da empresa (contratos, sistemas, imóveis, seguros — futuro)

---

## ✅ O QUE FOI CONSTRUÍDO ATÉ HOJE

### MÓDULOS PRODUTIVOS (em uso)

**People Fetely:**
- Auth + Roles (6+ roles, RLS Supabase)
- Pessoas (lista unificada CLT+PJ com ações rápidas de contato)
- Colaboradores CLT (wizard completo de admissão)
- Contratos PJ (wizard + cadastro manual emergencial + data_nascimento)
- Organograma (3 visões: Visual, Sintético, Analítico)
- Recrutamento completo (vagas, kanban 8 colunas, candidatos, entrevistas IA, teste técnico, propostas, contratação)
- Convites de Cadastro (fluxo 1-clique até importação)
- Onboarding (checklist por colaborador)
- Movimentações
- Folha de Pagamento (com holerite)
- Pagamentos PJ
- **Notas Fiscais PJ** (módulo completo: cron mensal + portal `/minhas-notas` + validação automática + aprovação RH + envio financeiro)
- Férias e Benefícios
- Cargos e Salários (PPR com 5 faixas CLT/PJ)
- Visibilidade de Salário (política aplicada em 11+ telas)
- Avaliações e Treinamentos (placeholders)

**SNCF / Uauuu:**
- Portal `/sncf` com 2 colunas (Mural + Aniversariantes)
- Sistema de Tarefas SNCF (`sncf_tarefas`) com Minhas Tarefas e Tarefas do Time
- **Nova Tarefa + Editar** (Filosofia C-2: default pra si, atalho delegar) com permissões hierárquicas
- Botão "+ Tarefa" destacado em Tarefas do Time
- BadgePredictor teaser ("Análise IA · em breve")
- SmartBackButton em /tarefas (navegação inteligente)
- Reatribuição de tarefas pelo gestor
- **Mural Fetely MVP** (rotativo automático: aniversários + tempo de casa + opt-out individual)
- **Faixa Aniversariantes do mês** (grid 1-2-3 colunas, destaque dourado pra hoje)
- **Fala Fetely** (chat IA com base de conhecimento + sugestões pendentes)
- **Processos Fetely** (11 processos mapeados + sistema de mapeamento + base de conhecimento)
- **Importador de Processos via PDF + IA** (Edge Function + UI + revisão + Mermaid + sugestões automáticas + Fala Fetely rascunho + badge no detalhe + histórico)

**TI Fetely:**
- Dashboard
- Ativos (notebooks, headsets, monitores)
- Documentação placeholder (4 docs serão substituídos)

**ADM SNCF (renomeado de "Administração"):**
- Cargos e Salários
- Parâmetros
- Configurações
- Gerenciar Usuários
- Reportes do Sistema
- **Importações PDF** (histórico de tudo que foi importado via IA)

### NAVEGAÇÃO E UX
- 4 sidebars com identidade visual Fetely (verde + rosa #F4A7B9 como destaque ativo)
- Botão "Voltar ao Portal" em AdminLayout/TILayout
- AppHeader com busca **desativada** (Fala Fetely é a interface de descoberta)
- Pessoas com ações rápidas de contato (email, drawer, telefone) com cores semânticas
- Redirects legados (`/colaboradores` → `/pessoas`, `/cargos` → `/admin/cargos`, etc.)

### INTEGRAÇÕES E AUTOMAÇÕES
- Cron diário do Mural Fetely (geração automática 06:00 UTC)
- Cron mensal de NF PJ (solicitação automática dia 1)
- Edge Functions: send-transactional-email, score-candidato, gerar-teste-tecnico, fala-fetely-perguntar, importar-processo-pdf, atualizar-documentacao
- IA: Google Gemini 2.5 Flash via gateway Lovable
- E-mail: notify.fetelycorp.com.br
- Auth ES256 corrigido para Edge Functions

---

## 🌟 DESTAQUES PRA APRESENTAÇÃO AOS SÓCIOS

**1. NF PJ vira ciclo automático completo** — 7 fases de fluxo, do cadastro emergencial à aprovação financeira
**2. Mural Fetely** — coração celebrativo da empresa, com rotação automática + aniversariantes do mês com destaque dourado
**3. Importador PDF de Processos com IA** — feature mágica, transforma manuais antigos em processos estruturados em minutos
**4. Fala Fetely** — chat conversacional que responde sobre qualquer processo da empresa (com correção anti-alucinação implementada)
**5. Sistema de Tarefas SNCF** — todas as pendências da empresa em um único inbox unificado
**6. Reestruturação completa de menus em 3 sprints** — 4 sidebars com identidade Fetely + Regra de Ouro estabelecida pra novos módulos
**7. Política de Visibilidade de Salário** — sistema multi-camada que respeita LGPD + governança hierárquica

---

## 🚧 ESTADO TÉCNICO

**Stack:**
- Frontend: React + TypeScript + Vite + Tailwind + Shadcn/UI + React Query
- Backend: Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- IA: Google Gemini 2.5 Flash (gateway Lovable)
- E-mail: notify.fetelycorp.com.br
- Dev: Lovable Pro 3 (US$1.000/ano, renovação 23/03/2027)

**Repositório:** github.com/sistemas-fetely/people-fetely-29d8a45f (público)
**URL produção:** https://people-fetely.lovable.app

**Pendências técnicas conhecidas:**
- Redirect involuntário ocasional (suspeita: hot reload Lovable) — diagnóstico em backlog
- 4 documentos de TI placeholder esperando substituição
- 6 dashboards agregados ainda sem aplicar política de visibilidade salarial (S1c)

---

## 🎯 PRÓXIMOS PASSOS (ORDEM)

Conforme `Melhorias_Roadmap_PeopleFetely.md`:

**Urgente:**
1. Projeto Gestão do Líder (RACI, Radar ativo, reequilíbrio)
2. Projeto Navegação Transversal (BackButton + Recentes + Favoritos + Busca Global como ⌘K)
3. Módulo Predictor (análise IA de cumprimento)
4. Quadro de KPIs por Área

**Importante:**
5. Pilar Administrativo (BackOffice)
6. Documentação TI (substituir 4 placeholders)
7. Mural dedicado (`/mural` com submissão + inbox RH)

---

## 🧠 BOARDS CONSULTIVOS

### Board Jurídico
| Consultor | Área |
|---|---|
| Dr. Marcos Teixeira | Trabalhista & Compliance |
| Dra. Ana Cláudia Ferreira | Tributário & Fiscal |
| Dr. Pedro Cavalcanti | Societário & PI |
| Dra. Renata Souza | Regulatório & LGPD |

### Board People Fetely
| Especialista | Foco |
|---|---|
| Beatriz Lemos | Cultura & UX dos fluxos |
| Ricardo Mendes | Ops & Compliance |
| Camila Fonseca | Recrutamento & Onboarding |
| Thiago Serrano | Performance & LGPD |

---

## 🌱 CONTEXTO DO MOMENTO

**Hoje (20/04/2026):**
- Sessão de ~14h totais com pausas
- Lovable publicou ~25 prompts ao longo do dia
- Apresentação aos sócios planejada para 21/04/2026
- Sistema seedado com 15 CLT + 8 PJ + tarefas + vagas + NFs (dados demo marcados pra limpeza)

**Doutrinas vigentes consolidadas hoje:**
- Regra de Ouro dos Menus (pessoas/tecnologia/transversal/config global/administrativo)
- Roadmap sempre atualizado (lema da mesa)
- Protocolo pré-prompt (diagnóstico → proposta → OK → prompt)
- Filosofia C-2 em Tarefas (default pra si, atalho delegar)
- Fala Fetely é a interface de descoberta (busca tradicional fica obsoleta)

---

*Última atualização: 20/04/2026 — final da sessão. Próxima sessão: continuar com Gestão do Líder ou tema escolhido por Flavio.*
