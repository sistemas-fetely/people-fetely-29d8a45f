

## Diagnóstico

Analisei o banco de dados e o código e encontrei **dois problemas principais**:

### Problema 1: Detecção do tipo do colaborador ignora o campo `profiles.colaborador_tipo`

O hook `usePermissions.ts` (linhas 95-109) detecta se o usuário é CLT ou PJ buscando registros nas tabelas `colaboradores_clt` e `contratos_pj`. Porém, o Flavio não tem registros nessas tabelas — então `userTipos` retorna vazio `[]`, e **nenhuma permissão PJ ou CLT é aplicada**.

O campo `profiles.colaborador_tipo = 'pj'` (que foi configurado na tela de Gerenciar Usuários) é completamente ignorado pelo frontend.

### Problema 2: Permissões PJ incompletas para o perfil Colaborador

No banco, o perfil `colaborador` com `granted=true` tem:
- **CLT**: beneficios, colaboradores, ferias, folha_pagamento (view)
- **PJ**: contratos_pj, notas_fiscais, pagamentos_pj (view)
- **Faltando**: `dashboard` (view) para ambos, `ferias` (view) para PJ

---

## Plano de Correção

### Passo 1 — Corrigir `usePermissions.ts` para usar `profiles.colaborador_tipo`
Alterar a query `userTipos` para primeiro verificar o campo `profiles.colaborador_tipo`. Se estiver definido (`clt`, `pj`, `ambos`), usar esse valor. Só fazer fallback para as tabelas se for `auto`/null.

### Passo 2 — Adicionar permissões faltantes via migração SQL
Inserir as permissões que faltam para o perfil `colaborador`:
- `dashboard:view` para CLT e PJ
- `ferias:view` para PJ

### Passo 3 — Validar sidebar
Confirmar que os itens do sidebar respeitam as permissões corretamente — o usuário PJ deve ver apenas: Dashboard, Contratos PJ, Notas Fiscais, Pagamentos PJ, e Férias.

