

## Plano: Mover Férias e Benefícios para categoria "Geral" nas permissões

### Problema atual
Ambos os módulos `ferias` e `beneficios` estão na categoria `"clt"` no array `MODULES` (linhas 25-26 de `usePermissions.ts`). Isso faz com que na tela de Configurar Perfis eles só apareçam na coluna CLT, impedindo que permissões sejam configuradas para usuários PJ.

### Solução

#### Passo 1 — Alterar categoria dos módulos
Em `src/hooks/usePermissions.ts`, mover `ferias` e `beneficios` de `category: "clt"` para `category: "geral"`.

#### Passo 2 — Migração SQL: normalizar dados existentes
- DELETE rows de `role_permissions` onde `module` in (`ferias`, `beneficios`) e `colaborador_tipo` in (`clt`, `pj`)
- INSERT rows com `colaborador_tipo = 'all'` para todos os perfis que tinham permissões nesses módulos, preservando os grants existentes

#### Passo 3 — Página Férias (já tem abas CLT/PJ)
Já implementado — a lógica de filtrar abas por tipo do colaborador já existe em `Ferias.tsx`.

#### Passo 4 — Página Benefícios
Atualmente é CLT-only (sem abas). Não precisa de alteração na UI por enquanto — o objetivo agora é apenas garantir que as permissões possam ser configuradas corretamente para ambos os tipos.

### Arquivos alterados
- `src/hooks/usePermissions.ts` — mover `ferias` e `beneficios` para `category: "geral"`
- **Migração SQL** — normalizar `role_permissions` para ambos os módulos

