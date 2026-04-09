

## Diagnóstico

Encontrei **dois problemas** na tela de Configurar Perfis:

### Problema 1: Dashboard armazenado com tipo errado
O módulo `dashboard` é da categoria "geral", e a UI renderiza com `colaborador_tipo = "all"`. Porém no banco de dados, o dashboard do perfil `colaborador` está gravado com `colaborador_tipo = clt` e `pj` (não `all`). Resultado:
- A UI mostra o switch desmarcado (porque procura a key `dashboard:view:all` que não existe no Map)
- Ao salvar, tenta fazer `UPDATE ... WHERE colaborador_tipo = 'all'` mas a row tem `clt`/`pj` — **zero rows afetadas**

### Problema 2: Módulos geral faltantes no banco
Os módulos `organograma` e `movimentacoes` **não têm nenhuma row** em `role_permissions` para o perfil `colaborador`. Quando o usuário marca e salva, o `UPDATE` não encontra row para atualizar — **nada acontece**.

### Problema 3: Criação de novos itens não gera INSERT
O `savePermissions` usa **somente UPDATE**. Se a permissão não existia antes no banco, nunca será criada. Deveria usar **UPSERT** para garantir que permissões novas sejam inseridas.

## Solução

### Passo 1 — Migração: normalizar dados existentes
- DELETE as rows de dashboard com `colaborador_tipo` = `clt`/`pj` para o perfil `colaborador`
- INSERT rows faltantes para todos os módulos "geral" com `colaborador_tipo = 'all'` para todos os perfis existentes
- INSERT rows faltantes para `organograma` e `movimentacoes`

### Passo 2 — Trocar UPDATE por UPSERT no save
Em `ConfigurarPerfis.tsx`, alterar o `savePermissions` para usar `.upsert()` ao invés de `.update()`, usando o constraint unique `(role_name, module, permission, colaborador_tipo)`. Isso garante que:
- Permissões existentes são atualizadas
- Permissões novas são inseridas

### Passo 3 — Adicionar RLS policy de INSERT/UPDATE para role_permissions
Verificar se o perfil `super_admin` tem permissão de INSERT na tabela `role_permissions` (atualmente pode ter apenas UPDATE, o que impediria o upsert).

### Arquivos alterados
- **Migração SQL** — normalizar dados e inserir rows faltantes
- `src/pages/ConfigurarPerfis.tsx` — trocar `.update()` por `.upsert()` no `savePermissions`

