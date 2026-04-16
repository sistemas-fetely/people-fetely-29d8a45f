---
name: Onboarding checklist module
description: Auto-created checklist when collaborator is created (wizard) with dynamic provisioning-based tasks
type: feature
---
- Tables: onboarding_checklists (colaborador_id, colaborador_tipo, status), onboarding_tarefas (checklist_id, titulo, responsavel_role, prazo_dias, prazo_data, status)
- Default tasks defined in src/lib/onboarding-tarefas.ts (9 tasks, 2 CLT-only)
- getTarefasDinamicas() generates tasks based on provisioning data (email, systems, equipment, phone) — replaces generic tasks with specific ones
- Checklist auto-created in CadastroColaboradorCLT.tsx at creation time (not on activation)
- ColaboradorDetalhe.tsx and ContratoPJDetalhe.tsx check for existing checklist before creating (dedup guard)
- Page: /onboarding — HR sees all checklists with progress, gestor sees team, colaborador sees own tasks
- Overdue tasks marked by process-invite-reminders cron job daily
- When all tasks done: checklist status → concluido, HR notified
