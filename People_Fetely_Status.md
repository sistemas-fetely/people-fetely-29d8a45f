# People Fetely · Status & Arquitetura

**Documento Vivo · Versão 4.0 · 20/04/2026**

---

## 1. Visão Geral

Sistema web completo de Gestão de RH e Colaboradores para a Fetely.

| Item | Detalhe |
|---|---|
| Stack | React + TypeScript + Vite + Tailwind + Shadcn/UI + Supabase + React Query |
| Repositório | github.com/sistemas-fetely/people-fetely-29d8a45f |
| URL produção | https://people-fetely.lovable.app |
| Ferramenta dev | Lovable Pro 3 |
| Filosofia | Autogestão — colaborador dono dos próprios processos, RH atua em exceções |
| Doutrina | "WhatsApp do RH silencioso — tudo via sistema ou e-mail automático" |

---

## 2. Módulos Implementados ✅

### Núcleo Operacional
| Módulo | Status |
|---|---|
| Auth + Roles | ✅ Completo (6+ roles, RLS) |
| Pessoas (lista unificada CLT+PJ) | ✅ Completo + ações rápidas de contato |
| Colaboradores CLT | ✅ Wizard completo |
| Contratos PJ | ✅ Wizard + cadastro manual + data_nascimento |
| Organograma | ✅ 3 visões (Visual, Sintético, Analítico) |
| Convites de Cadastro | ✅ Fluxo 1-clique |
| Onboarding | ✅ Checklist por colaborador |
| Movimentações | ✅ |
| Recrutamento | ✅ Completo (vagas, kanban, IA, propostas, contratação) |

### Folha & Benefícios
| Módulo | Status |
|---|---|
| Folha de Pagamento | ✅ Com holerite |
| Pagamentos PJ | ✅ |
| **Notas Fiscais PJ** | ✅ Ciclo completo (cron + portal + validação + aprovação) |
| Férias | ✅ |
| Benefícios | ✅ |

### Cargos & Visibilidade
| Módulo | Status |
|---|---|
| Cargos e Salários | ✅ Tabela `cargos` unificada com PPR (5 faixas CLT/PJ) |
| Política de Visibilidade Salarial | ✅ Aplicada em 11+ telas (S1c pendente: 6 dashboards) |

### Placeholders ⚠️
| Módulo | Prioridade |
|---|---|
| Ponto | 🔴 Alta — Ricardo Mendes |
| Avaliações | 🟡 Média — Thiago Serrano |
| Treinamentos | 🟡 Média |
| Relatórios com Auditoria | 🔴 Alta |

---

## 3. Sistema de Roles

| Role | Tipo | Quem é |
|---|---|---|
| `super_admin` | Sistema | Sócio/dono — acesso total |
| `admin_rh` | Sistema | Gerente/coordenador RH |
| `gestor_rh` | Sistema | Analista/assistente RH |
| `gestor_direto` | Auto+Manual | Líder de time — vê só seu departamento |
| `financeiro` | Sistema | Financeiro/contabilidade |
| `colaborador` | Auto | Todo colaborador ativo |

---

## 4. Decisões de Arquitetura Vigentes

| Data | Decisão | Motivação |
|---|---|---|
| Abr/2026 | Tabela `cargos` unificada | FK frágil por texto, flag C-Level inexistente |
| Abr/2026 | Hook `useCargos` em todos os wizards | Fonte única de verdade |
| Abr/2026 | Portal de candidatura público em `/vagas/:id` | Autoatendimento + LGPD |
| Abr/2026 | Convite de cadastro automático ao contratar | Resolve gap dos dados soltos |
| Abr/2026 | Schema flexível `mural_publicacoes` | Suporta 8 tipos (celebração, KPI, marca, comunicado) |
| Abr/2026 | `data_nascimento` em `contratos_pj` | DNA: PJ é colaborador também |
| Abr/2026 | Filosofia C-2 em Tarefas | Tela "Minhas Tarefas" é literal |
| Abr/2026 | Reestruturação 4 sidebars + Regra de Ouro | Identidade Fetely + governança de menus |

---

## 5. Diretrizes Técnicas Permanentes

- Hook de cargos: `useCargos(filtroTipo?)` — nunca `useParametros("cargo")`
- Tipos centralizados em `src/types/index.ts`
- React Hook Form + Zod (validação tempo real)
- Permissões: PermissionGate + ProtectedRoute (`permModule` + `permAction` em App.tsx)
- Dimensão sempre via tabela, nunca hardcode
- Edge Functions: usar `getUser(token)` e não `getClaims()` (ES256)
- IA: só `google/gemini-2.5-flash` confirmado funcionando
- Idempotency keys com `Date.now()` em e-mails

---

## 6. Boards Consultivos

### Board Jurídico
- Dr. Marcos Teixeira — Trabalhista & Compliance
- Dra. Ana Cláudia Ferreira — Tributário & Fiscal
- Dr. Pedro Cavalcanti — Societário & PI
- Dra. Renata Souza — Regulatório & LGPD

### Board People Fetely
- Beatriz Lemos — Cultura & UX
- Ricardo Mendes — Ops & Compliance
- Camila Fonseca — Recrutamento & Onboarding
- Thiago Serrano — Performance & LGPD

---

*Última atualização: 20/04/2026*
