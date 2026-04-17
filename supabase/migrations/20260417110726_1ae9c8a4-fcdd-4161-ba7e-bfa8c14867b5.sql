UPDATE public.sncf_documentacao SET conteudo = $DOC$
# Estado Atual — People Fetely & SNCF
## Documento de Continuidade
**Versão 2.0 | 17/04/2026**

> Este documento garante continuidade entre sessões de desenvolvimento.
> Leia este arquivo ao iniciar nova sessão para reconstruir todo o contexto em minutos.

---

## COMO INICIAR UMA NOVA SESSÃO

Cole esta mensagem ao abrir nova conversa no projeto:

> "Continuando o desenvolvimento do SNCF (Sistema Nervoso Central Fetely).
> Leia o Estado_Atual_PeopleFetely.md antes de começar.
> Repositório: github.com/sistemas-fetely/people-fetely-29d8a45f
> Produção: https://people-fetely.lovable.app"

---

## 1. VISÃO GERAL DO ECOSSISTEMA

**SNCF — Sistema Nervoso Central Fetely** é o ecossistema de sistemas interligados da Fetely. Mesmo projeto Supabase, mesmo Auth, módulos separados por rotas.

### Sistemas Implementados
- **Portal SNCF** (`/sncf`) — porta de entrada, cards dos sistemas
- **People Fetely** (`/*`) — RH completo CLT e PJ
- **TI Fetely** (`/ti/*`) — Gestão de TI, ativos e acessos
- **Bling ERP** (link externo) — https://www.bling.com.br/login
- **Mercos** (link externo) — https://app.mercos.com/login/
- **Shopify** (link externo) — https://accounts.shopify.com/lookup

### Cores por Sistema
- SNCF Portal: Verde Fetely #1A4A3A (cor âncora)
- People Fetely: Verde Fetely #1A4A3A
- TI Fetely: Verde Petróleo #3A7D6B
- Cada sistema externo com sua cor própria

---

## 2. MÓDULOS IMPLEMENTADOS — SESSÃO 15-17/04/2026

### ✅ SNCF — Base da Arquitetura
- Tabela `sncf_sistemas` — registro de sistemas do ecossistema
- Tabela `sncf_user_systems` — permissões de usuário por sistema
- Tabela `sncf_tarefas` — tabela unificada de tarefas (substitui onboarding_tarefas)
- Portal SNCF com cards dos sistemas + card "Minhas Tarefas" em destaque
- Roteamento: "/" redireciona para "/sncf"

### ✅ TI Fetely MVP — Gestão de Ativos
- Dashboard TI com KPIs
- Gestão de Ativos (CRUD completo)
- Condição: Ótima / Muito Boa / Boa / Inativo (trigger automático)
- Flag `em_manutencao` paralelo ao status
- Registro de manutenções (5 tipos: preventiva/corretiva/upgrade/garantia/formatação)
- Especificações técnicas dinâmicas por tipo
- Valor de mercado por IA (Claude API)
- Upload de fotos (bucket ti-ativos)
- Sidebar própria com cor verde petróleo

### ✅ Módulo de Tarefas SNCF — Completo (Fases 1-4)

**Tabela `sncf_tarefas` com RACI:**
- `responsavel_user_id` — R (quem executa)
- `accountable_user_id` — A (quem cobra)
- `informar_user_ids` — I (notificados)
- `bloqueante`, `motivo_bloqueio` — tarefas legais
- `evidencia_texto`, `evidencia_url` — evidência de conclusão

**Fase 1 — Minhas Tarefas (`/tarefas`):**
- Inbox unificado com filtros, agrupamento, tabs (Execução/Acompanhamento)

**Fase 2 — Tarefas do Time (`/tarefas/time`):**
- Visão dos subordinados com KPIs e indicador de sobrecarga

**Fase 3 — Templates e Offboarding:**
- `sncf_templates_processos` + `sncf_templates_tarefas`
- Template "Offboarding CLT Padrão" (14 tarefas legais)
- Template "Offboarding PJ Padrão"
- Editor de templates completo em `/templates`
- Fluxo de desligamento em `/desligamento/:id`

**Fase 4 — Portal SNCF:**
- Card "Minhas Tarefas" em destaque com contador

### ✅ Onboarding — Governança 100%
- Coordenador do processo
- Barra de progresso com % por área
- Resumo por área (RH/TI/Gestão/Colaborador)
- Notificação automática ao responsável
- Tela dedicada `/onboarding/:id`
- Bloqueantes (legais) com destaque visual no topo
- Evidência de conclusão obrigatória
- Tarefas atrasadas detectadas automaticamente

### ✅ Dashboard People — Reestruturado
**Aba Operacional (padrão):**
- "O que fazer agora" + "Alertas" lado a lado
- Card **Insights IA** com análise, prioridade, dica e notícia (web search)
- Números do Momento e Velocidade dinâmicos

**Aba Gestão:**
- Conteúdo anterior (KPIs financeiros, gráficos)

### ✅ Outras Implementações
- Convites com provisionamento + e-mail automático + fluxo de aprovação
- Formulário público padronizado (Foto Social primeiro)
- Wizard CLT/PJ simplificado (6 steps, sem etapa Empresa)
- Parâmetros de sistemas enriquecidos
- Cargos e Salários com exclusão inteligente
- PJ sem jornada/horário (Dr. Marcos — risco vínculo)

---

## 3. PENDÊNCIAS REGISTRADAS (ROADMAP)

### 🔴 Alta Prioridade
1. **Regra de visibilidade de salário** — PRIORIDADE MÁXIMA
2. **TI Fetely "Sem acesso" para Super Admin** — Bug no Portal SNCF
3. **3 melhorias do kanban de recrutamento**

### 🟡 Média Prioridade
4. Reorganização do menu ADMIN
5. Parâmetros unificados por sistema (campo `sistema`)
6. Ficha Novo Convite em etapas
7. Onboarding Fase 2 — Cobrança automática (Edge Function)
8. Onboarding Fase 3 — Integração Slack/Teams

### 🟢 Roadmap Futuro
9. **Projeto Uauu** — IA em todos os sistemas (notícias, Fetely na mídia, dicas)
10. Dashboard CEO — visão bird's eye
11. Fila unificada de tarefas (quando 3+ sistemas)
12. Templates adicionais (movimentação, admissão customizável)

---

## 4. BOARDS CONSULTIVOS

### Board Jurídico
- Dr. Marcos Teixeira — Trabalhista & Compliance
- Dra. Ana Cláudia Ferreira — Tributário & Fiscal
- Dr. Pedro Cavalcanti — Societário & PI
- Dra. Renata Souza — LGPD

### Board People Fetely
- Beatriz Lemos — Cultura & UX
- Ricardo Mendes — Ops & Compliance
- Camila Fonseca — Recrutamento & Onboarding
- Thiago Serrano — Performance & LGPD

---

## 5. ARQUITETURA TÉCNICA

| Componente | Detalhe |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind + Shadcn/UI |
| Backend | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| IA | Claude API (claude-sonnet-4) |
| E-mail | notify.fetelycorp.com.br |
| Dev | Lovable Pro 3 |
| Produção | https://people-fetely.lovable.app |
| Repo | github.com/sistemas-fetely/people-fetely-29d8a45f |

---

## 6. DECISÕES-CHAVE DE ARQUITETURA

- SNCF = mesmo Supabase, mesmo Auth (simplicidade)
- `sncf_tarefas` unificada (onboarding, offboarding, manual, etc.)
- Dashboard dinâmico baseado em atividade real
- Dashboard com abas (Operacional padrão + Gestão)
- PJ NÃO tem jornada/horário fixo (Dr. Marcos)
- Convites sem expiração
- Senhas NÃO armazenadas (LGPD)
- Cada sistema com cor própria dentro da paleta Fetely

---

## 7. DNA OPERACIONAL

- Automação e self service como lema
- CLT e PJ: mesmos processos, mesma experiência
- Toda funcionalidade reflete no portal do colaborador
- "WhatsApp do RH silencioso"
- Consultar boards antes de decisões críticas
- Questionar antes de executar
- "Gesto não se delega pro ChatGPT" — DNA Fetely

---

## 8. EMPRESA

**FETELY COMÉRCIO IMPORTAÇÃO E EXPORTAÇÃO LTDA** (Unipessoal)
- CNPJ: 63.591.078/0001-48
- Administrador: Joseph Emile Soued
- Usuário principal: **Flavio Simeliovich** (Super Admin)
- Marca FETÉLY registrada (classes 16, 21, 28)
- Operação: Atacado festa + fábrica descartáveis Joinville

---

*Última atualização: 17/04/2026 — SNCF completo, Módulo de Tarefas 100%, Onboarding com governança*
$DOC$ WHERE slug = 'estado-atual';

UPDATE public.sncf_documentacao SET conteudo = $DOC$
# Roadmap — People Fetely & SNCF
**Versão 2.0 | 17/04/2026**

> Pendências organizadas por prioridade: 🔴 Alta · 🟡 Média · 🟢 Baixa/Futuro

---

## 🔴 PRIORIDADE MÁXIMA

### 1. Regra de Visibilidade de Salário
**Pendente há múltiplas sessões.** Salário aparece em telas onde não deveria:
- Listagem Colaboradores CLT (colunas Salário + Encargos)
- Dashboard Gestão (Salário Médio CLT)

**Matriz proposta:**
- Admin RH: vê salários exceto C-Level
- Super Admin: vê tudo
- Gestor Direto: NÃO vê salário dos subordinados
- Financeiro: vê para folha
- Colaborador: vê só o próprio

### 2. TI Fetely "Sem acesso" para Super Admin
**Bug identificado no Portal SNCF.** Super Admin deveria ver todos os sistemas sempre. Ajustar lógica em `PortalSNCF.tsx`.

### 3. Kanban de Recrutamento — 3 Melhorias
Registrado para depois do onboarding (onboarding finalizado 17/04).
1. IA para correção/avaliação do teste
2. Melhorar texto avaliação IA na skill "motivação"
3. Destacar estágio do candidato nas abas

---

## 🟡 PRIORIDADE MÉDIA

### 4. Reorganização do Menu ADMIN (prioridade pois ninguém usa ainda)
- Cargos e Salários sai de ADMIN → seção de RH
- Gerenciar Usuários → Portal SNCF
- Parâmetros unificados (ver item 5)

### 5. Parâmetros Unificados por Sistema
- Campo `sistema` na tabela parâmetros (`global`/`people`/`ti`)
- Tela única com abas: Global | People Fetely | TI Fetely
- Acessível de qualquer sistema

### 6. Ficha Novo Convite em Etapas
Quebrar em wizard de 2-3 steps (básicos, profissional, provisionamento).

### 7. Onboarding Fase 2 — Cobrança Automática
Edge Function diária:
- E-mail ao responsável quando tarefa atrasa
- Escalação após 3 dias ao accountable
- Alerta crítico para tarefa LEGAL atrasada

### 8. Onboarding Fase 3 — Integração Slack/Teams
- Webhook para notificações
- Mensagem quando tarefa atribuída/atrasada
- Resumo diário ao coordenador

---

## 🟢 ROADMAP FUTURO

### 9. Projeto Uauu — IA em todos os sistemas
Versão expandida no Portal SNCF:
- Notícias do setor
- Fetely na mídia
- Eventos (festas, feiras)
- Dicas de carreira
- Aprendizado sobre a cultura Fetely

### 10. Dashboard CEO
- Estratégico (KPIs consolidados da empresa)
- Operacional Geral (pendências de todos os sistemas)
- Dependência: mais sistemas ativos (TI, Financeiro, Comercial)

### 11. Fila Unificada de Tarefas (`sncf_tarefas_pendentes`)
Migrar de consulta direta para fila centralizada quando tiver 3+ sistemas.

### 12. Templates Adicionais de Processos
- Movimentação (transferência/promoção)
- Admissão customizável (editável pelo RH, hoje hardcoded)
- Recorrentes (mensal, trimestral)

### 13. Tabela `sncf_metricas` Centralizada
Preparar caminho para Dashboard CEO. Cada sistema publica suas métricas-chave.

---

## REGISTRO DE DECISÕES (DNA do Projeto)

### Sobre Priorização
- **Terminar o que começamos antes de começar algo novo** (regra de ouro)
- Roadmap é roadmap — só atacar quando processos em andamento estiverem 100%
- Ideia durante execução: registrar no roadmap e continuar

### Sobre Arquitetura
- Pragmatismo agora, visão pro futuro
- Mesmo Supabase para todos os sistemas SNCF
- Consulta direta hoje, fila unificada quando 3+ sistemas

### Sobre Boards
- Consultar Board Jurídico + Board RH antes de decisões críticas
- Questionar, sugerir alternativas antes de executar
- Enriquecer com análise — não ser apenas executor

### Sobre UX
- DNA Fetely: autogestão + "WhatsApp do RH silencioso"
- Mostrar só o relevante agora (dinâmico)
- Inbox zero como meta
- Paleta Fetely, nunca azul/vermelho puro

---

*Atualizar sempre que nova ideia surgir ou item for concluído.*
*Última atualização: 17/04/2026*
$DOC$ WHERE slug = 'roadmap';

UPDATE public.sncf_documentacao SET conteudo = $DOC$
# RunBook Técnico — SNCF & People Fetely
**Versão 2.0 | 17/04/2026**

> Documentação técnica completa para desenvolvedores e treinamento.
> Arquitetura, tabelas, hooks, decisões e armadilhas conhecidas.

---

## 1. STACK TÉCNICA

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + Shadcn/UI |
| Roteamento | React Router v6 |
| Estado Servidor | TanStack Query (React Query) |
| Formulários | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL + Auth + RLS + Storage + Edge Functions) |
| IA | Claude API (claude-sonnet-4) via Lovable Gateway |
| E-mail | Edge Function `send-transactional-email` → notify.fetelycorp.com.br |
| IDE/Dev | Lovable Pro 3 |
| Repositório | github.com/sistemas-fetely/people-fetely-29d8a45f |
| Produção | https://people-fetely.lovable.app |

---

## 2. ARQUITETURA DO SNCF

### Filosofia
**SNCF = Sistema Nervoso Central Fetely.** Ecossistema de sistemas interligados:
- **Mesmo projeto Supabase** (um DPO, uma política LGPD)
- **Mesmo Auth** (login único)
- **Mesmo banco** (sem federação, tabelas compartilhadas quando fizer sentido)
- **Rotas separadas por sistema** (/sncf, /dashboard, /ti/*)
- **Permissões por sistema** via `sncf_user_systems`

### Rotas Principais
```
/sncf               → Portal SNCF (porta de entrada)
/dashboard          → People Fetely Dashboard (com abas Operacional/Gestão)
/tarefas            → Minhas Tarefas (unificada)
/tarefas/time       → Tarefas do Time (gestor)
/templates          → Templates de Processos (RH configura)
/onboarding         → Listagem de onboardings
/onboarding/:id     → Tela dedicada de um onboarding
/desligamento/:id   → Tela dedicada de um desligamento
/ti                 → TI Fetely Dashboard
/ti/ativos          → Gestão de Ativos (TI Fetely)
/colaboradores      → CLT
/contratos-pj       → PJ
/recrutamento       → Kanban de vagas
/convites-cadastro  → Pipeline de convites
...
```

### Tabelas SNCF
```sql
-- Sistemas do ecossistema
sncf_sistemas (id, slug, nome, descricao, icone, cor, ativo, ordem, rota_base)

-- Permissões de usuário por sistema
sncf_user_systems (user_id, sistema_id, role_no_sistema, ativo, concedido_por)

-- Tabela unificada de tarefas (substitui onboarding_tarefas)
sncf_tarefas (
  id, tipo_processo, sistema_origem, processo_id, processo_tipo,
  colaborador_id, colaborador_tipo, colaborador_nome,
  titulo, descricao, prioridade,
  area_destino, responsavel_role, responsavel_user_id,
  accountable_role, accountable_user_id, informar_user_ids,
  prazo_dias, prazo_data, status,
  concluida_em, concluida_por, evidencia_texto, evidencia_url,
  bloqueante, motivo_bloqueio,
  link_acao, criado_por, created_at, updated_at
)

-- Templates de processos (offboarding, movimentação, etc.)
sncf_templates_processos (id, nome, descricao, tipo_processo, tipo_colaborador, ativo)
sncf_templates_tarefas (template_id, ordem, titulo, area_destino, sistema_origem,
  responsavel_role, accountable_role, prazo_dias, prioridade, bloqueante, ...)
```

---

## 3. ARQUITETURA DE PERMISSÕES

### Roles do Sistema
| Role | Descrição |
|---|---|
| `super_admin` | Sócio/dono — acesso total (vê tudo sempre) |
| `admin_rh` | Gerente/coordenador RH |
| `gestor_rh` | Analista/assistente RH |
| `gestor_direto` | Líder de time |
| `financeiro` | Folha, pagamentos, NF |
| `colaborador` | Todo colaborador ativo |

### Como verificar roles
```typescript
// Hook usePermissions
const { userRoles, isSuperAdmin, isAdminRH, isGestor } = usePermissions();

// Função SQL has_role
SELECT has_role(auth.uid(), 'admin_rh');
```

### RLS (Row Level Security)
Toda tabela tem RLS ativo. Policies padrão:
- **Leitura**: authenticated
- **Escrita/delete**: super_admin + admin_rh (em maioria das tabelas)
- **SNCF tarefas**: HR (manage) + assigned user (update own)
- **TI ativos**: HR + users com acesso ao sistema 'ti'

**CRÍTICO**: role `admin_rh` deve estar em todas as policies junto com `super_admin`. Bug histórico recorrente.

---

## 4. MÓDULO DE TAREFAS SNCF

### Fluxo de Geração de Tarefas

**1. Automáticas (onboarding/offboarding):**
```
Processo iniciado → getTarefasDinamicas() ou query em sncf_templates_tarefas
→ Cria em onboarding_checklists (container)
→ Insert em batch em sncf_tarefas
→ Notifica responsáveis (notificacoes_rh)
```

**2. Manuais:**
```
Dashboard Operacional → NovaTarefaDialog
→ Insert em sncf_tarefas (tipo_processo='manual', sistema_origem='manual')
```

### Arquivos-chave
```
src/lib/onboarding-tarefas.ts       — Templates hardcoded (futuro: migrar pra sncf_templates)
src/pages/MinhasTarefas.tsx         — Tela individual
src/pages/TarefasDoTime.tsx         — Tela gestor
src/pages/TemplatesProcessos.tsx    — Editor de templates
src/pages/OnboardingDetalhe.tsx     — Detalhe onboarding
src/pages/DesligamentoDetalhe.tsx   — Detalhe desligamento
src/components/dashboard/NovaTarefaDialog.tsx
src/components/dashboard/DashboardOperacional.tsx
src/components/dashboard/InsightsIA.tsx
src/components/desligamento/IniciarDesligamentoDialog.tsx
```

### RACI Implementado
- **R (Responsible)** — `responsavel_user_id` + `responsavel_role` — quem EXECUTA
- **A (Accountable)** — `accountable_user_id` + `accountable_role` — quem COBRA
- **I (Informed)** — `informar_user_ids` (array) — quem é NOTIFICADO

### Query-padrão para "Minhas Tarefas"
```typescript
const { data } = await supabase
  .from("sncf_tarefas")
  .select("*")
  .or(`responsavel_user_id.eq.${user.id},accountable_user_id.eq.${user.id}`)
  .order("prazo_data", { ascending: true });
```

### Marcar atrasadas automaticamente (ao carregar tela)
```typescript
const hoje = new Date().toISOString().split("T")[0];
await supabase.from("sncf_tarefas")
  .update({ status: "atrasada" })
  .eq("status", "pendente")
  .lt("prazo_data", hoje);
```

---

## 5. TI FETELY

### Tabelas
```sql
ti_ativos (
  id, tipo, marca, modelo, numero_serie, numero_patrimonio,
  status, condicao, em_manutencao, estado,
  colaborador_id, colaborador_tipo, colaborador_nome,
  data_compra, valor_compra, valor_atual_mercado,
  especificacoes (JSONB), fotos (TEXT[]),
  localizacao, observacoes, ...
)

ti_ativos_historico (
  ativo_id, acao, tipo_manutencao, fornecedor, valor,
  data_inicio, data_fim, garantia_servico_ate,
  status_anterior, observacoes, ...
)
```

### Status vs Condição vs Em Manutenção
- **status**: `disponivel`, `atribuido`, `descartado` (situação de atribuição)
- **condicao**: `otima`, `muito_boa`, `boa`, `inativo` (estado físico)
- **em_manutencao**: boolean (flag paralela — um ativo atribuído pode estar em manutenção)

### Trigger: condição = inativo
```sql
CREATE TRIGGER ti_ativos_condicao_change
  BEFORE UPDATE ON ti_ativos
  EXECUTE FUNCTION ti_ativos_condicao_trigger();
-- Quando condicao = 'inativo', status muda para 'descartado' automaticamente
```

### Especificações Dinâmicas por Tipo
JSONB flexível em `especificacoes`:
- Notebook/Desktop: `{processador, ram, hd_tipo, hd_tamanho}`
- Monitor: `{tamanho, resolucao}`
- Celular: `{imei, numero_linha}`
- Headset: `{conexao, microfone}`

### IA para Valor de Mercado
Edge Function `estimar-valor-ativo` → Claude API → retorna valor numérico baseado em marca, modelo, ano, condição, especificações.

---

## 6. ONBOARDING — GOVERNANÇA

### Fluxo Completo
```
Colaborador aprovado → ConviteDetalhe.handleCriarColaborador()
  1. Insert em colaboradores_clt ou contratos_pj
  2. Update convites_cadastro (status='cadastrado', colaborador_id)
  3. Insert em onboarding_checklists (coordenador_user_id)
  4. getTarefasDinamicas() com dados_contratacao (provisionamento)
  5. Insert em batch em sncf_tarefas (tipo_processo='onboarding')
  6. Notifica responsáveis (notificacoes_rh)
```

### Tela Dedicada /onboarding/:id
- Header com nome, cargo, coordenador
- KPIs: total, concluídas, atrasadas, % progresso
- Tarefas agrupadas por `area_destino` (RH/TI/Gestão/Colaborador/Geral)
- Dentro de cada grupo: bloqueantes primeiro, depois por prazo
- Click no checkbox → dialog de conclusão com evidência obrigatória

### Bloqueantes (Prioridade Legal)
Tarefas com `bloqueante=true` têm destaque vermelho e aparecem primeiro. Exemplos:
- Registrar admissão no eSocial (prazo D-1, obrigação legal)
- Assinar contrato
- Entregar documentos rescisórios (offboarding)

---

## 7. DASHBOARD PEOPLE FETELY

### Arquitetura
```
Dashboard.tsx
├── Tabs
│   ├── DashboardOperacional (default)
│   │   ├── "O que fazer agora" (tarefas com ação direta)
│   │   ├── "Alertas" (informações críticas)
│   │   ├── InsightsIA (card com análise + notícia via web search)
│   │   ├── Números do Momento (KPIs dinâmicos)
│   │   └── Velocidade (métricas com dados históricos)
│   └── DashboardGestao
│       └── KPIs financeiros + gráficos (conteúdo anterior)
```

### Regras Dinâmicas
- KPIs só aparecem se valor > 0
- Seção Velocidade só aparece com dados suficientes (5+ registros)
- "Tudo em dia!" quando não há pendências
- Card InsightsIA com cache diário no localStorage

### InsightsIA
```
Key cache: insights_ia_YYYY-MM-DD
Tool: web_search_20250305 (Claude API)
Retorna JSON: { analise, prioridade_do_dia, dica_produtividade, noticia: {titulo, resumo, fonte, url} }
Notícia tem link externo clicável
```

---

## 8. CONVITES DE CADASTRO

### Fluxo Completo
```
1. RH cria convite (ConvitesCadastro.tsx) com dados_contratacao (provisionamento)
   → Insert em convites_cadastro
   → E-mail automático enviado (template 'convite-cadastro')
   → status = 'email_enviado'

2. Colaborador acessa /cadastro/:token (CadastroPublico.tsx)
   → Auto-save parcial em convites_cadastro.dados_preenchidos
   → IMPORTANTE: auto-save usa RPC autosave_convite_cadastro (NÃO dispara e-mail)
   → Submit final usa RPC submit_convite_cadastro (dispara e-mail 'cadastro-recebido')
   → status = 'preenchido'

3. RH revisa e aprova (ConviteDetalhe.tsx)
   → status = 'aprovado'
   → Banner "Pronto para criar o colaborador" com CTA

4. RH clica "Criar Colaborador"
   → handleCriarColaborador cria direto (sem wizard)
   → status = 'cadastrado'
   → Onboarding automático gerado
```

### Campos de Provisionamento (dados_contratacao)
```json
{
  "tipo_contrato_clt": "indeterminado",
  "jornada_semanal": "44",
  "horario_trabalho": "08:00-17:00",
  "local_trabalho": "Escritório",
  "email_corporativo_formato": "nome.sobrenome@fetely.com.br",
  "sistemas_ids": ["uuid1", "uuid2"],
  "equipamentos": [{"tipo": "notebook"}, {"tipo": "monitor"}],
  "celular_corporativo": true
}
```

---

## 9. ARMADILHAS CONHECIDAS

### Auto-save no Formulário Público
**PROBLEMA**: Antes, auto-save chamava `submit_convite_cadastro` e disparava e-mail prematuro.
**SOLUÇÃO**: Criada RPC separada `autosave_convite_cadastro` que só salva dados_preenchidos sem mudar status nem enviar e-mail.

### PJ com Jornada/Horário
**PROBLEMA**: Definir jornada fixa e horário configura vínculo empregatício (Dr. Marcos).
**SOLUÇÃO**: Campos condicionais `form.tipo === "clt"` no formulário de convite. StepDadosProfissionaisPJ NÃO tem esses campos.

### RLS Inconsistente
**PROBLEMA**: Várias tabelas tinham policies só com `super_admin`, bloqueando `admin_rh`.
**SOLUÇÃO**: Adicionar `admin_rh` em todas as policies. Sempre verificar no teste.

### Case Mismatch em Selects
**PROBLEMA**: `departamento` no convite salvo como "comercial" (minúsculo), Select esperava "Comercial".
**SOLUÇÃO**: Match case-insensitive no Select:
```typescript
value={(departamentos || []).find(d => 
  d.label.toLowerCase() === (watch("departamento") || "").toLowerCase()
)?.label || watch("departamento") || ""}
```

### Duplicidade de Uploads
**PROBLEMA**: Upload do mesmo documento criava duplicatas no array `uploadedFiles`.
**SOLUÇÃO**: Filter por key antes de push:
```typescript
const newFiles = uploadedFiles.filter(f => f.key !== key);
newFiles.push({ key, name, url });
```

### JWT e Fuso Horário
**PROBLEMA**: `new Date(data)` causava problemas de fuso.
**SOLUÇÃO**: Split manual de data ISO:
```typescript
const [y, m, d] = dateStr.split("-");
const date = new Date(+y, +m - 1, +d, 12, 0); // noon evita fuso
```

### Modelo de IA
**USAR SEMPRE**: `claude-sonnet-4-20250514` (não gemini nem outros).

### Idempotency Key em E-mails
Usar sempre `idempotencyKey` único (ex: `convite-${id}-${Date.now()}`) para evitar duplicação.

---

## 10. PADRÕES DE CÓDIGO

### Hooks Customizados
```typescript
useAuth()              — user, profile, signOut
usePermissions()       — roles, isSuperAdmin, isAdminRH, etc.
useParametros(cat)     — lista de parâmetros por categoria
useCargos(tipo)        — cargos filtrados por tipo (clt/pj/ambos)
```

### Validação
Sempre React Hook Form + Zod. Schemas em `src/lib/validations/`.

### Permissões na UI
```tsx
<ProtectedRoute permModule="colaboradores" permAction="create">
  <NovoColaborador />
</ProtectedRoute>

<PermissionGate module="folha" action="view">
  <FolhaContent />
</PermissionGate>
```

### Loading e Feedback
- Skeleton em listagens
- Toast para ações (success/error)
- `disabled` durante saves

---

## 11. BOARDS CONSULTIVOS

### Quando consultar
- **Dr. Marcos (Trabalhista)**: Qualquer regra de CLT/PJ, jornada, rescisão, eSocial, NRs
- **Dra. Ana Cláudia (Tributário)**: Folha, encargos, INSS, IRRF, regime tributário
- **Dr. Pedro (Societário/PI)**: Contratos comerciais, proteção de marca, estrutura
- **Dra. Renata (LGPD)**: Dados pessoais, política de retenção, DPO
- **Beatriz Lemos (UX)**: Fluxos de usuário, layout, experiência
- **Ricardo Mendes (Ops)**: Compliance, auditoria, folha, ponto
- **Camila Fonseca (Recrutamento)**: Onboarding, processo seletivo
- **Thiago Serrano (Performance/LGPD)**: Avaliações, LGPD operacional

---

## 12. PROCESSOS EM ANDAMENTO

Veja `Melhorias_Roadmap_PeopleFetely.md` para pendências completas.

**Prioridade Máxima pendente:**
1. Regra de visibilidade de salário
2. Bug TI Fetely "Sem acesso" para Super Admin
3. 3 melhorias do kanban de recrutamento

---

*Atualizado em 17/04/2026 após implementação completa do SNCF + Módulo de Tarefas + Onboarding com governança.*
$DOC$ WHERE slug = 'runbook-tecnico';

UPDATE public.sncf_documentacao SET conteudo = $DOC$
# Guia do Usuário — SNCF & People Fetely
## Manual completo por perfil e módulo
**Versão 2.0 | 17/04/2026 | Documento Vivo**

> Este guia é para quem usa o SNCF no dia a dia.
> Linguagem simples, sem termos técnicos.
> Organizado por perfil e por módulo.

---

## COMO ACESSAR O SISTEMA

1. Acesse **https://people-fetely.lovable.app**
2. Entre com seu e-mail corporativo e senha
3. Você cai no **Portal SNCF** — tela de entrada do ecossistema
4. Clique no sistema que deseja acessar

---

## QUAL É O SEU PERFIL?

| Perfil | Quem é | O que consegue fazer |
|---|---|---|
| **Super Admin** | Sócio/dono | Acesso total a todos os sistemas |
| **Admin RH** | Gerente/coordenador RH | Gestão completa de pessoas (exceto salários C-Level) |
| **Gestor RH** | Analista/assistente RH | Operações do dia a dia |
| **Gestor Direto** | Líder de time | Acompanha o próprio time |
| **Financeiro** | Responsável financeiro | Folha, pagamentos, NFs |
| **Colaborador CLT/PJ** | Funcionário/prestador | Próprios dados e tarefas |

---

# PARTE 1 — PORTAL SNCF

## O que é o Portal SNCF

É a porta de entrada do ecossistema Fetely. Aqui você escolhe qual sistema usar: People (RH), TI, Bling (ERP), Mercos (vendas), Shopify (loja online).

## Card "Minhas Tarefas"

No topo do portal, você vê um card de destaque com:
- **Centro de Trabalho**
- Quantas tarefas ativas você tem
- Botão "Ver Tarefas"

Esse é o seu **inbox de trabalho** — tudo que precisa ser feito por você, de qualquer sistema, aparece aqui.

## Cards dos Sistemas

Abaixo do card Minhas Tarefas, cada sistema aparece como um card:
- **People Fetely** — Gestão de Pessoas (RH)
- **TI Fetely** — Gestão de TI
- **Bling ERP** — link externo (abre em nova aba)
- **Mercos** — link externo
- **Shopify** — link externo

Se um sistema mostra **"Sem acesso"**, significa que você não tem permissão nele. Peça ao Admin RH para liberar.

---

# PARTE 2 — MINHAS TAREFAS

## Para QUALQUER colaborador

### Como acessar
- Pelo Portal SNCF → clique no card "Ver Tarefas"
- Pelo menu lateral do People Fetely → **Minhas Tarefas**
- Pelo menu lateral do TI Fetely → **Minhas Tarefas**
- URL direta: `/tarefas`

### O que você vê

**KPIs no topo:**
- Pendentes — tarefas com prazo futuro
- Atrasadas — tarefas que passaram do prazo
- Em andamento — tarefas que você começou
- Concluídas hoje — o que você fechou no dia
- Acompanhamento — tarefas de outros que você cobra

**Filtros:**
- Status (Ativas, Pendentes, Atrasadas, Concluídas, Todas)
- Tipo (Onboarding, Manual, Manutenção)
- Sistema (People Fetely, TI Fetely, Manual)
- Agrupar por (Prioridade, Área, Prazo, Processo)

**Duas abas:**
- **Minha Execução** — tarefas que VOCÊ precisa fazer (você é o responsável)
- **Acompanhamento** — tarefas que OUTROS executam mas VOCÊ cobra (você é o accountable)

### Como concluir uma tarefa
1. Clique no círculo à esquerda do título da tarefa
2. Abre um diálogo pedindo:
   - **O que foi feito?** (obrigatório, mínimo 5 caracteres) — descreva brevemente
   - **Link de evidência** (opcional) — URL de comprovação
3. Clique em **Concluir**

A evidência fica registrada e pode ser consultada depois.

### Tarefas especiais: LEGAL

Tarefas marcadas com o selo **⚠ Legal** são obrigações legais (eSocial, contratos, rescisão). Têm prazo vinculado à lei e devem ser priorizadas. Se atrasam, podem gerar multa.

Essas tarefas **sempre aparecem no topo** das listas.

### Criar nova tarefa (manual)

Clique no botão **+ Nova Tarefa** no topo direito.

Campos:
- **Título** (obrigatório)
- **Descrição** (opcional)
- **Prioridade**: Urgente / Normal / Baixa
- **Área destino**: RH / TI / Gestão / Financeiro / Geral
- **Atribuir a**: Mim mesmo / Todos da área / Usuário específico
- **Quem acompanha**: Você (padrão) ou outro usuário
- **Prazo**: data limite (padrão: 3 dias)
- **Colaborador relacionado** (opcional)

Ao criar, a tarefa aparece para quem você atribuiu. Se atribuiu para uma área, todos os usuários dessa área veem.

---

# PARTE 3 — TAREFAS DO TIME (Gestor)

## Para GESTOR DIRETO / ADMIN RH / SUPER ADMIN

### Como acessar
- Menu lateral do People Fetely → **Tarefas do Time**
- URL: `/tarefas/time`

### O que você vê

**KPIs no topo:**
- Subordinados (quantos você lidera)
- Tarefas ativas (total no time)
- Atrasadas
- Legais atrasadas (destaque vermelho)
- Média/pessoa (indicador de sobrecarga)

**Lista de subordinados:**
Cada subordinado aparece como card mostrando:
- Nome, cargo, departamento
- Quantas tarefas ativas
- Quantas atrasadas
- Badge **Sobrecarga** se tem mais de 10 tarefas ativas
- Lista das próximas 3 tarefas (expandir para ver todas)

### Ações no time
- **Reatribuir tarefa** — move tarefa de um subordinado para outro
- **Concluir tarefa** pelo gestor (com evidência)
- **Criar nova tarefa** para qualquer subordinado

---

# PARTE 4 — DASHBOARD PEOPLE FETELY

## Para ADMIN RH / GESTOR RH

### Como acessar
- Menu lateral → **Dashboard**
- URL: `/dashboard`

### Duas abas

**🗂️ Aba Operacional (padrão)** — o que fazer agora
**📊 Aba Gestão** — números e tendências

### Aba Operacional

**"O que fazer agora"** (lado esquerdo):
- Lista de pendências priorizadas
- Cada item tem botão de ação direto (Aprovar, Criar, Resolver, Ver)
- Tarefas LEGAIS atrasadas em destaque vermelho
- Click na linha leva ao local da ação

**"Alertas"** (lado direito):
- 🔴 Crítico (vermelho) — contratos vencendo, experiência expirando
- 🟡 Atenção (amarelo) — documentos vencendo, folha aberta
- 🟢 Informativo (verde) — aniversários de empresa

**Card Insights IA:**
- **Análise do momento** — interpretação dos dados do seu RH
- **Prioridade do dia** — o que fazer primeiro
- **Dica** — sugestão contextual de produtividade
- **Notícia** — matéria relevante do setor (link externo)
- Atualização diária, botão para refresh sob demanda

**Números do momento:** KPIs dinâmicos (só aparecem se > 0)

**Velocidade:** métricas de performance (aparece com dados históricos)

### Aba Gestão

Visão financeira e estratégica:
- Custos (Total, Folha CLT, PJ)
- Headcount (total, em experiência, férias)
- Salário médio
- Gráficos de evolução
- Gráficos por departamento

---

# PARTE 5 — ONBOARDING

## Para QUEM COORDENA (geralmente RH)

### Como acessar
- Menu lateral → **Onboarding**

### Listagem de Onboardings
Cada card mostra:
- Nome do colaborador
- Cargo e departamento
- Badge CLT/PJ
- Status (Em andamento / Concluído / Com atrasos)
- Barra de progresso com %
- Quantas tarefas concluídas / total
- Se tem tarefas atrasadas, destacado em vermelho
- Coordenador do processo
- Resumo por área: RH 3/5 · TI 1/3 · Gestão 0/2

### Tela dedicada (clique no card)

Abre `/onboarding/:id` com:
- **KPIs**: total, concluídas, atrasadas (com quantas são legais), % progresso
- **Tarefas agrupadas por área** (RH, TI, Gestão, Colaborador, Geral)
- Dentro de cada área: bloqueantes (legais) no topo, depois por prazo

### Concluir tarefas
Mesma lógica de Minhas Tarefas: click no círculo → preenche observação → salva com evidência.

### Tarefas de TI
Ficam na área TI no onboarding. **Quem executa é a equipe de TI** (acessa pelo TI Fetely), mas o RH acompanha o progresso aqui.

---

# PARTE 6 — DESLIGAMENTO

## Para ADMIN RH / SUPER ADMIN

### Como iniciar um desligamento

1. Vá em **Colaboradores CLT** (ou Colaboradores PJ)
2. Clique no colaborador
3. No detalhe, clique em **Iniciar Desligamento**
4. Preencha:
   - Data de desligamento
   - Motivo (Sem justa causa, Com justa causa, Pedido de demissão, Acordo, Fim de contrato PJ)
   - Observações
   - ✅ Tem aviso prévio de 30 dias?
5. Clique em **Iniciar**

### O que acontece
- Processo de desligamento criado com tarefas baseadas no template
- Tarefas com prazos LEGAIS (eSocial, rescisão, documentos) geradas automaticamente
- Tarefas atribuídas: RH (cálculo rescisão, eSocial), TI (revogar acessos, recolher equipamentos), Financeiro (pagamento)
- Colaborador marcado como "Desligamento em andamento"
- Aparece banner no detalhe com link para acompanhar

### Tela de acompanhamento
Em `/desligamento/:id`:
- Mesma estrutura do onboarding
- Motivo e data visíveis
- Cor vermelha (indicativo de desligamento)
- Tarefas legais em destaque

---

# PARTE 7 — TEMPLATES DE PROCESSOS

## Para ADMIN RH / SUPER ADMIN

### Como acessar
- URL: `/templates`
- Menu lateral (se configurado)

### O que é

São os "moldes" dos processos do ciclo de vida do colaborador. Quando o sistema gera um onboarding ou desligamento, ele usa o template como base.

### Templates que vêm prontos
- **Offboarding CLT Padrão** — 14 tarefas com prazos legais
- **Offboarding PJ Padrão** — encerramento simplificado

### Editar um template
Clique no template → abre lista de tarefas.

Cada tarefa tem:
- Título e descrição
- Área destino (RH, TI, Gestão, etc.)
- Responsável (role ou usuário)
- Accountable (quem cobra)
- Prazo em dias (D-1 = 1 dia antes, D+0 = no dia, D+5 = 5 dias depois)
- Badge **Legal** se é obrigação legal
- Badge **Urgente** se é prioritária

### Criar novo template
Botão **+ Novo Template** no topo. Preencha:
- Nome
- Tipo (onboarding/offboarding/movimentação)
- Para CLT, PJ ou ambos
- Adicione tarefas uma por uma

---

# PARTE 8 — TI FETELY

## Para quem tem acesso ao sistema TI

### Como acessar
- Portal SNCF → card **TI Fetely**
- URL: `/ti`

### Dashboard TI
- KPIs: Total de ativos, Disponíveis, Atribuídos, Em manutenção, **Tarefas pendentes de TI**
- Seção "Tarefas Pendentes" — tarefas do onboarding/manutenção que TI precisa executar

### Gestão de Ativos (`/ti/ativos`)

**Filtros:** Tipo, Status, Condição

**Coluna da tabela:**
- Tipo, Marca/Modelo, Nº Série, Nº Patrimônio
- Status (Disponível/Atribuído/Descartado)
- Condição (Ótima/Muito Boa/Boa/Inativo)
- Badge **🔧 Manutenção** se está em manutenção paralelamente
- Colaborador (se atribuído)
- Localização

**Click na linha** → abre edição do ativo.

### Cadastrar/Editar Ativo

Campos principais:
- **Tipo, Marca, Modelo** — identificação
- **Nº Série, Nº Patrimônio** — controle
- **Status** — disponível/atribuído/descartado
- **Condição** — física (ótima/muito boa/boa/inativo)
  - Se escolher "Inativo", status muda para "Descartado" automaticamente
- **Data e valor de compra** — histórico financeiro
- **Valor atual de mercado** — pode estimar com IA (botão "Estimar com IA")
- **Localização** — de parâmetros
- **Especificações técnicas** — por tipo:
  - Notebook/Desktop: Processador, RAM, HD/SSD (tipo e tamanho)
  - Monitor: Tamanho, Resolução
  - Celular: IMEI, Linha
  - Headset: Conexão, Microfone
- **Fotos** — até 5 fotos do equipamento

### Registrar Manutenção (na ficha do ativo)

Clique em **+ Registrar Manutenção** na seção Histórico.

Campos:
- **Tipo**: Preventiva / Corretiva / Upgrade / Garantia / Formatação
- **Descrição do serviço** (obrigatório)
- Fornecedor, Valor
- Data início e fim
- Garantia do serviço até

**Se não preencher data fim** → ativo marcado como **Em Manutenção** (flag paralelo).
**Quando concluir** (preencher data fim) → flag removida, ativo volta ao estado normal.

---

# PARTE 9 — CONVITES DE CADASTRO

## Para RH (Admin RH, Gestor RH)

### Fluxo completo

1. **RH cria convite** (`/convites-cadastro` → + Novo Convite)
   - Dados básicos: nome, e-mail, tipo CLT/PJ, cargo, departamento
   - Dados profissionais: salário, jornada (só CLT), horário (só CLT), local
   - Provisionamento: e-mail corporativo, sistemas, equipamentos, celular
   - **E-mail automático enviado ao colaborador**

2. **Colaborador preenche** (link no e-mail)
   - Formulário público `/cadastro/:token`
   - Upload de documentos (Foto Social, RG, Contrato Social se PJ)
   - Auto-save a cada mudança (não dispara e-mails)
   - Submit final — e-mail "Cadastro Recebido" enviado

3. **RH revisa** (status: Preenchido)
   - Pode **Devolver com comentário** se faltou algo
   - Ou **Aprovar** se está tudo certo

4. **Aprovado** — aparece banner na tela do convite
   - Botão destacado: **Criar Colaborador CLT** (ou PJ)
   - Clique cria o colaborador direto (sem wizard)

5. **Criado** — colaborador existe no sistema
   - Onboarding automático gerado
   - Tarefas distribuídas por área (RH, TI, Gestão)
   - Coordenador definido

### Funil no topo da tela

Mostra quantos convites em cada fase:
- 📧 Enviado
- ✍️ Preenchido
- ↩️ Devolvido
- ✅ Aprovado
- 🎉 Cadastrado

### Ações na listagem

Menu ⋮ em cada convite:
- Copiar link
- Reenviar e-mail
- Editar
- Suspender lembretes (ícone envelope)
- Excluir

---

# PARTE 10 — PERGUNTAS FREQUENTES

**Esqueci minha senha.**
Tela de login → "Esqueci minha senha" → e-mail de redefinição.

**Não vejo o sistema que preciso no Portal SNCF.**
Aparece "Sem acesso"? Peça ao Admin RH para liberar acesso ao sistema.

**Minha tarefa está com área "Geral" — por quê?**
A tarefa foi criada antes do campo "área destino" existir. Novas tarefas vêm com área correta.

**Criei uma tarefa manual mas não consigo achar depois.**
Ela aparece em Minhas Tarefas (se atribuiu a você) ou Tarefas do Time (se atribuiu a subordinado).

**Tarefa LEGAL atrasada — o que significa?**
É uma obrigação com prazo legal (eSocial, contrato, rescisão). Pode gerar multa se atrasa. Resolva com urgência.

**Quero desligar um colaborador.**
Vá em Colaboradores CLT/PJ → clique nele → **Iniciar Desligamento**.

**O que é "Coordenador" do onboarding?**
É quem acompanha o processo inteiro e garante que tudo está sendo feito. Normalmente é o RH que criou o convite.

**Por que TI precisa marcar a tarefa como concluída com evidência?**
Compliance. Registra quem fez, quando, e o que foi feito. Auditável.

**Insights IA não carregou.**
Aguarde o refresh automático (1x/dia) ou clique no botão 🔄 no canto do card.

---

*Documento vivo — atualizar sempre que um módulo for alterado.*
*Próximos módulos a documentar: Folha de Pagamento, Benefícios, Recrutamento detalhado.*
*Última atualização: 17/04/2026*
$DOC$ WHERE slug = 'guia-usuario';

UPDATE public.sncf_documentacao SET conteudo = $DOC$
# People Fetely — Status & Arquitetura
**Documento Vivo | Versão 3.0 — Abril/2026**

---

## 1. Visão Geral

People Fetely é o sistema de **Gestão de RH e Colaboradores** da Fetely, primeiro sistema do ecossistema **SNCF (Sistema Nervoso Central Fetely)**. Suporta vínculos **CLT** e **PJ** com os mesmos processos e experiência.

- **Repositório**: github.com/sistemas-fetely/people-fetely-29d8a45f
- **Produção**: https://people-fetely.lovable.app
- **Lovable**: https://lovable.dev/projects/11784988-62f9-4cd1-8be6-369fc74dc5cb
- **Stack**: React + TypeScript + Vite + Tailwind + Shadcn/UI + Supabase
- **Filosofia**: autogestão — cada colaborador é dono dos próprios processos
- **Princípio**: WhatsApp do RH silencioso — tudo via sistema ou e-mail automático

---

## 2. Ecossistema SNCF

| Sistema | Slug | Rota | Status |
|---|---|---|---|
| Portal SNCF | sncf | /sncf | ✅ Ativo |
| People Fetely | people | / (dashboard) | ✅ Ativo |
| TI Fetely | ti | /ti | ✅ Ativo (MVP) |
| Bling ERP | bling | (link externo) | ✅ Link |
| Mercos | mercos | (link externo) | ✅ Link |
| Shopify | shopify | (link externo) | ✅ Link |

---

## 3. Boards Consultivos

### Board Jurídico
| Consultor | Especialidade |
|---|---|
| Dr. Marcos Teixeira | Trabalhista & Compliance (vínculo PJ, eSocial, NRs) |
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

## 4. Sistema de Roles

| Role | Descrição |
|---|---|
| `super_admin` | Acesso total — vê tudo sempre |
| `admin_rh` | Gestão completa (exceto salários C-Level) |
| `gestor_rh` | Operações dia a dia |
| `gestor_direto` | Líder de time |
| `financeiro` | Folha, pagamentos, NFs |
| `colaborador` | Próprios dados |

---

## 5. Módulos do People Fetely

### ✅ Implementados

| Módulo | Status | Observações |
|---|---|---|
| Auth + Roles | ✅ Completo | 6 roles, RLS em todas as tabelas |
| Portal SNCF | ✅ Completo | Card "Minhas Tarefas" em destaque |
| Dashboard (Operacional + Gestão) | ✅ Completo | Com Insights IA (análise + notícia) |
| Colaboradores CLT | ✅ Completo | Wizard 6 steps simplificado |
| Contratos PJ | ✅ Completo | Sem jornada/horário (Dr. Marcos) |
| Organograma | ✅ Completo | 3 visões: Visual, Synthetic, Analytic |
| Convites de Cadastro | ✅ Completo | Com provisionamento, 5 fases, criação direta |
| Formulário Público de Cadastro | ✅ Completo | Foto Social padronizada |
| Notas Fiscais PJ | ✅ Completo | Upload pelo colaborador PJ |
| Pagamentos PJ | ✅ Completo | — |
| Folha de Pagamento | ✅ Completo | Com holerite |
| Férias | ✅ Completo | CLT + PJ |
| Benefícios | ✅ Completo | — |
| Movimentações | ✅ Completo | — |
| Cargos e Salários | ✅ Completo | Com proteção C-Level + exclusão inteligente |
| Parâmetros | ✅ Completo | Geral + CLT + PJ (sistemas enriquecidos) |
| Gerenciar Usuários | ✅ Completo | 3 abas: Usuários / Grupos / Perfis |
| Recrutamento (Kanban) | ✅ Completo | 8 colunas, IA, propostas |
| **Minhas Tarefas** | ✅ **NOVO** | Inbox unificado com RACI |
| **Tarefas do Time** | ✅ **NOVO** | Visão gestor com sobrecarga |
| **Templates de Processos** | ✅ **NOVO** | Editor de templates |
| **Onboarding com Governança** | ✅ **NOVO** | RACI, evidência, prioridade legal |
| **Desligamento** | ✅ **NOVO** | Template offboarding com prazos legais |
| **Insights IA** | ✅ **NOVO** | Card no Dashboard com web search |

### ⚠️ Placeholders

| Módulo | Prioridade | Observações |
|---|---|---|
| Ponto (Controle de Ponto) | 🔴 Alta | Obrigatório CLT, impacta eSocial |
| Avaliações | 🟡 Média | Vinculado ao cargo e skills |
| Treinamentos | 🟡 Média | Vinculado ao onboarding |
| Relatórios | 🔴 Alta | Trilha de auditoria |
| Configurações | 🟡 Média | — |

---

## 6. Arquitetura de Dados — SNCF

### Tabelas SNCF (cross-sistema)
- `sncf_sistemas` — registro dos sistemas
- `sncf_user_systems` — permissões por usuário e sistema
- `sncf_tarefas` — **tabela universal de tarefas** (RACI, bloqueante, evidência)
- `sncf_templates_processos` — templates de processos
- `sncf_templates_tarefas` — tarefas de cada template

### Tabelas TI Fetely
- `ti_ativos` — inventário (com condição, flag manutenção, fotos, especificações JSONB)
- `ti_ativos_historico` — histórico de manutenções (5 tipos)

### Tabelas People Fetely (principais)
- `colaboradores_clt`, `contratos_pj`
- `convites_cadastro` (com `dados_contratacao` JSONB)
- `cargos` (unificada — substituiu parametros categoria)
- `onboarding_checklists` (com `coordenador_user_id`)
- `vagas`, `candidatos`, `entrevistas_candidato`, `ofertas_candidato`
- `folha_competencias`, `holerites`, `dependentes`
- `beneficios_colaborador`, `beneficios_pj`
- `notificacoes_rh`

---

## 7. Decisões de Arquitetura Registradas

| Data | Decisão | Motivação |
|---|---|---|
| Abr/2026 | Tabela `cargos` unificada | FK frágil por texto, flag C-Level inexistente |
| Abr/2026 | Convites sem expiração | DNA Fetely: autogestão |
| Abr/2026 | Portal de candidatura público | Autoatendimento |
| Abr/2026 | Convite gera colaborador direto (sem wizard) | Elimina redundância pós-aprovação |
| 17/04/2026 | SNCF = mesmo Supabase, mesmo Auth | Simplicidade, DPO único |
| 17/04/2026 | Dashboard com abas (Op + Gestão) | Menos navegação |
| 17/04/2026 | `sncf_tarefas` universal (RACI) | Suporta onboarding/offboarding/manual |
| 17/04/2026 | Cor por sistema dentro da paleta Fetely | Reconhecimento visual |
| 17/04/2026 | PJ sem jornada/horário | Dr. Marcos — risco vínculo |
| 17/04/2026 | Senhas NÃO armazenadas | LGPD |

---

## 8. Diretrizes Técnicas

- **Hook de cargos**: `useCargos(filtroTipo?)` — nunca `useParametros("cargo")`
- **Tipos TypeScript**: centralizar em `src/types/index.ts`
- **Formulários**: React Hook Form + Zod
- **Permissões**: `ProtectedRoute` + `PermissionGate` + `usePermissions()`
- **Tabela `role_permissions`**: `role_name, module, permission, granted, colaborador_tipo`
- **Loading states**: skeleton screens
- **Toasts**: feedback para todas ações
- **Modelo IA**: sempre `claude-sonnet-4-20250514`

---

## 9. Impactos Futuros

- **Unidade fabril Joinville**: Ponto (turnos), NRs 1/6/12/17, eSocial chão de fábrica
- **eSocial CLT**: admissão, CAGED, RAIS — validação Jurídico antes
- **DPO designado**: obrigatório antes de escalar — Thiago + Dra. Renata
- **Templates adicionais**: movimentação, admissão customizável
- **Dashboard CEO**: quando mais sistemas do SNCF estiverem ativos

---

## 10. Prioridades Pendentes (ver Roadmap)

### 🔴 Prioridade Máxima
1. Regra de visibilidade de salário
2. Bug TI Fetely "Sem acesso" para Super Admin
3. 3 melhorias do kanban de recrutamento

### 🟡 Prioridade Média
4. Reorganização do menu ADMIN
5. Parâmetros unificados por sistema
6. Ficha Novo Convite em etapas
7. Onboarding Fase 2 (cobrança automática via Edge Function)
8. Onboarding Fase 3 (integração Slack/Teams)

---

*Documento vivo — atualizar a cada novo módulo, decisão de arquitetura ou mudança de processo.*
*Última atualização: 17/04/2026*
$DOC$ WHERE slug = 'status-modulos';