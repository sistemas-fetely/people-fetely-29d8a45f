

## Problema

O sistema tem **dois cadastros independentes** que precisam estar vinculados mas não estão:

1. **Usuário do sistema** — tabela `profiles` (criado ao fazer signup via auth)
2. **Cadastro do colaborador** — tabela `colaboradores_clt` (campo `user_id`) ou `contratos_pj` (campo `created_by`)

Hoje, quando o admin aprova um usuário na tela de Gerenciar Usuários, ele apenas marca `approved = true` no `profiles`. Mas ninguém vincula esse usuário ao registro de colaborador CLT ou contrato PJ correspondente. Resultado: o sistema de permissões não consegue determinar o tipo do colaborador via tabelas, e as RLS policies que dependem de `user_id` (ex: "Colaborador can view own record") não retornam dados.

**Dados atuais confirmam o problema:**
- Flavio S (`3ee3e444`) tem `colaborador_tipo = pj` no profile, mas não existe nenhum registro em `contratos_pj` com `created_by = 3ee3e444`
- O único contrato PJ existente está vinculado ao outro Flavio (`e09f2bfc`)

## Solução

### Passo 1 — Adicionar campo `user_id` na tabela `contratos_pj`

Hoje a vinculação PJ usa `created_by`, que semanticamente significa "quem criou o registro" (geralmente o RH), não "qual usuário é este prestador". Criar um campo `user_id` dedicado, igual ao que existe em `colaboradores_clt`.

**Migração SQL:**
- `ALTER TABLE contratos_pj ADD COLUMN user_id uuid REFERENCES auth.users(id)`
- Atualizar RLS policies de `contratos_pj` para incluir `user_id = auth.uid()` para SELECT do próprio colaborador
- Atualizar tabelas dependentes (ferias_periodos_pj, ferias_pj, notas_fiscais_pj, pagamentos_pj) com policies que façam JOIN via `contratos_pj.user_id`

### Passo 2 — Vincular usuário ao cadastro na aprovação

Atualizar a edge function `manage-user` (action `approve`) para, ao aprovar um usuário:
1. Verificar se o profile tem `colaborador_tipo` definido
2. Buscar um convite (`convites_cadastro`) pelo email do usuário que tenha `contrato_pj_id` ou `colaborador_id` preenchido
3. Atualizar o registro CLT/PJ correspondente com o `user_id` do usuário aprovado

### Passo 3 — Adicionar vinculação manual na tela de Gerenciar Usuários

Para casos onde a vinculação automática não funciona (cadastros antigos, registros manuais), adicionar um botão/campo na tela de Gerenciar Usuários que permita ao admin vincular manualmente um usuário a um registro CLT ou PJ existente.

- Dropdown que lista colaboradores CLT sem `user_id` ou contratos PJ sem `user_id`
- Ao salvar, faz UPDATE no registro selecionado com o `user_id` do usuário

### Passo 4 — Atualizar `usePermissions` e RLS

- Alterar `usePermissions.ts` para usar `contratos_pj.user_id` em vez de `created_by`
- Atualizar a function SQL `get_user_colaborador_tipo` para usar `contratos_pj.user_id`
- Atualizar RLS policies de `contratos_pj` e tabelas relacionadas

### Arquivos alterados
- `supabase/functions/manage-user/index.ts` — vinculação automática na aprovação
- `src/pages/GerenciarUsuarios.tsx` — vinculação manual
- `src/hooks/usePermissions.ts` — usar `user_id` em vez de `created_by`
- **Migração SQL** — adicionar `user_id` em `contratos_pj`, atualizar RLS, atualizar function `get_user_colaborador_tipo`

