

## Plano: Benefícios com abas CLT e PJ (espelhando Férias)

### Situação atual
- A página Benefícios é monolítica, usando apenas a tabela `beneficios_colaborador` que referencia `colaboradores_clt`
- Não existe tabela `beneficios_pj` para contratos PJ
- A página Férias já tem o padrão correto: wrapper com abas + componentes `FeriasCLTView` e `FeriasPJView`

### O que será feito

#### 1. Migração SQL — Criar tabela `beneficios_pj`
Mesma estrutura de `beneficios_colaborador`, mas com `contrato_id` referenciando `contratos_pj`:
- Campos: id, contrato_id (FK → contratos_pj), tipo, descricao, operadora, numero_cartao, valor_empresa, valor_desconto, data_inicio, data_fim, status, observacoes, created_at, updated_at
- RLS: Admin/HR/Fin ALL, PJ user SELECT own (via contratos_pj.user_id), Gestor direto SELECT
- Trigger `update_updated_at_column` no UPDATE

#### 2. Hook `useBeneficiosPJ` — CRUD para benefícios PJ
Novo arquivo `src/hooks/useBeneficiosPJ.ts` espelhando `useBeneficios.ts`:
- `useBeneficiosPJ()` — query com join em `contratos_pj(contato_nome, tipo_servico, departamento)`
- `useCriarBeneficioPJ()`, `useEditarBeneficioPJ()`, `useExcluirBeneficioPJ()`

#### 3. Componente `BeneficiosCLTView`
Extrair o conteúdo atual de `Beneficios.tsx` para `src/components/beneficios/BeneficiosCLTView.tsx`. Recebe props `canManage` e `isAdmin` (igual FeriasCLTView).

#### 4. Componente `BeneficiosPJView`
Criar `src/components/beneficios/BeneficiosPJView.tsx` espelhando a CLT view, mas usando o hook PJ e buscando contratos PJ no select do formulário.

#### 5. Refatorar `Beneficios.tsx` — wrapper com abas
Mesmo padrão de `Ferias.tsx`:
- Importa `useAuth` e `usePermissions`
- Calcula `showCLT`/`showPJ` baseado em roles e `userTipos`
- Renderiza `Tabs` com `TabsTrigger` CLT e PJ condicionais
- Cada aba renderiza o componente view correspondente

### Arquivos alterados
- **Migração SQL** — criar `beneficios_pj` + RLS + trigger
- `src/hooks/useBeneficiosPJ.ts` — novo
- `src/components/beneficios/BeneficiosCLTView.tsx` — novo (extraído de Beneficios.tsx)
- `src/components/beneficios/BeneficiosPJView.tsx` — novo
- `src/pages/Beneficios.tsx` — refatorar para wrapper com abas

