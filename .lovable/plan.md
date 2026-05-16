## Objetivo

Refazer ponta-a-ponta a integração com o Bling: **OAuth + edge function de sync + UI de configuração**, cobrindo Produtos, Contas a Receber, Pedidos de Venda, NFe e Contatos.

A versão atual (`sync-bling-financeiro` 517 linhas + `ConfiguracaoIntegracao` 954 linhas + `BlingCallback`) tem dois problemas estruturais:

1. **Tudo num único endpoint monolítico** — `tipo: "..."` switch gigante, sem isolamento por entidade.
2. **Sem entidades novas** — não busca NFe, não cria/atualiza Contatos como entidade primária (só side-effect de contas/pedidos), e Produtos vem incompleto (sem categoria/marca/estoque/situação).

---

## Escopo

### 1. Banco — uma migration

Ajustes mínimos pra suportar as novas entidades:

- **`nfs_emitidas`** (nova) — NFe emitidas vindas do Bling: `bling_id`, `numero`, `serie`, `chave_acesso`, `data_emissao`, `data_saida`, `tipo` (entrada/saida), `situacao`, `valor_nota`, `parceiro_id`, `pedido_venda_id` (FK opcional), `xml_url`, `pdf_url`, `origem`, timestamps. RLS: SELECT autenticado, INSERT/UPDATE só service role.
- **`integracoes_sync_cursor`** (nova) — controle de paginação/incremental por entidade: `sistema`, `entidade` (produtos|contas_receber|pedidos|nfe|contatos), `ultima_pagina`, `ultimo_id`, `ultima_data_corte`, `em_execucao`, timestamps. UNIQUE (sistema, entidade).
- **`parceiros_comerciais`**: já tem `bling_id`, ok. Sem alteração de schema.
- **`produtos`**: já tem campos essenciais, ok.

### 2. Edge function — reescrita modular

Substituir `sync-bling-financeiro/index.ts` por arquitetura em handlers:

```text
supabase/functions/sync-bling-financeiro/
  index.ts                  # router + auth + token refresh
  bling-client.ts           # fetch + retry 429 + refresh on 401
  sync-contatos.ts          # PRIMEIRO: contatos viram parceiros
  sync-produtos.ts          # categorias, marca, estoque
  sync-contas-receber.ts    # usa parceiros já sincronizados
  sync-pedidos.ts           # idem
  sync-nfe.ts               # nova
  oauth.ts                  # token_exchange + refresh
```

Pontos-chave:
- **Ordem correta de sync** ao rodar "tudo": contatos → produtos → contas_receber → pedidos → nfe. Garante FKs já populadas.
- **Cursor persistente** por entidade — retoma de onde parou após timeout de 120s.
- **Tipos aceitos** no router: `ping`, `token_exchange`, `sync` (com `entidades: string[]` opcional, default todas), `limpar_travados`, `desconectar`.
- **Refresh proativo** do token (margem 5min antes de expirar).
- **Backoff exponencial** em 429/5xx.
- **Log estruturado** em `integracoes_sync_log`, um registro por entidade por execução.

### 3. UI — duas telas

**`ConfiguracaoIntegracao.tsx` (reescrever)**:
- Card "Conexão": status (Conectado/Desconectado/Token expirado), botão Conectar/Reconectar/Desconectar, exibição do token_expires_at.
- Card "Credenciais OAuth": campos client_id/client_secret editáveis (gravados em `integracoes_config`).
- Card "Sincronização por entidade": tabela com 5 linhas (Contatos, Produtos, Contas a Receber, Pedidos, NFe) — cada uma com: última sync, status, contagem da última execução, botão "Sincronizar" individual + botão global "Sincronizar tudo".
- Card "Histórico" (últimas 20 execuções de `integracoes_sync_log`), com badge de status e detalhes expansíveis.

**`BlingCallback.tsx`**: mantido, só ajusta a chamada pra novo formato (`tipo: "oauth.exchange"`).

**`ImportarDados.tsx`**: o card "Sincronizar com Bling" passa a chamar `tipo: "sync"` sem array (= tudo).

---

## Decisões que preciso confirmar antes de codar

1. **NFe**: criar tabela nova `nfs_emitidas` específica pra Bling, ou usar a `nfs_stage` existente (que hoje é pra XMLs importados manualmente)? Recomendo nova — origem e ciclo de vida diferentes.
2. **Contatos**: hoje viram `parceiros_comerciais` só por side-effect de contas/pedidos. Sincronizar todos os contatos do Bling vai inflar a tabela. Trazer **todos** ou só **clientes** (`/contatos?tipoContato=C`)?
3. **Periodicidade**: sync continua **manual** (botão), ou quer **cron job** (pg_cron a cada X horas)?
4. **Pagar (`/contas/pagar`)**: ficou de fora do escopo — confirma?

---

## Detalhes técnicos

- **Endpoints Bling v3** usados: `/contatos`, `/produtos`, `/contas/receber`, `/pedidos/vendas`, `/nfe`. Todos com paginação `limite=100&pagina=N`.
- **Filtro incremental** via `dataEmissao[gte]` / `dataInicial` quando o endpoint suporta; senão paginação full + dedup por `bling_id`.
- **Auth**: `verify_jwt = true` (já é o default), validação de `super_admin` em `user_roles` (mantém regra atual).
- **Token refresh**: dispara quando `token_expires_at - now() < 5min` OU em 401 da API.
- **Tratamento 429**: já tem retry simples; trocar por backoff exponencial (1s → 2s → 4s, max 3 tentativas).
- **Timeout**: edge tem 150s; cortar em 120s e devolver `{ continuar: true, cursor: ... }` pra UI poder chamar de novo automaticamente.
- **Tipos TS**: gerar `types.ts` interno da edge function com shape de cada entidade Bling pra ter autocomplete e evitar `any`.

---

## Não escopo (não vou mexer)

- Tela `/administrativo/configuracao-integracao` legacy se houver — só refatorar a principal.
- Outras integrações em `integracoes_config` (se existirem além do Bling).
- Lógica de conciliação financeira (Stages 1/2/3) — independente.
