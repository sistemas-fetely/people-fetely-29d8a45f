

## Plano: Aplicar permissões granulares em ContratosPJ, ContratoPJDetalhe e PagamentosPJ

### Problema
A página `ContratosPJ.tsx` (e provavelmente `ContratoPJDetalhe.tsx` e `PagamentosPJ.tsx`) não usa `usePermissions`. Qualquer usuário com acesso ao módulo — incluindo Colaborador com apenas `view` — consegue ver e usar os botões "Novo Contrato", "Editar", "Excluir" e o botão "Editar" no drawer de visualização.

### Solução
Aplicar o mesmo padrão já usado em `NotasFiscais.tsx`: importar `usePermissions`, calcular `canCreate`, `canEdit`, `canDelete` e condicionar a renderização dos controles.

### Implementação

#### Passo 1 — `ContratosPJ.tsx`
- Importar `usePermissions`
- Calcular: `canCreate = hasPermission("contratos_pj", "create")`, `canEdit`, `canDelete`
- Esconder botão **"Novo Contrato"** se `!canCreate`
- No dropdown de ações por linha: esconder "Editar" se `!canEdit`, esconder "Excluir" se `!canDelete`
- No drawer de visualização: esconder botão "Editar" do `DialogFooter` se `!canEdit`
- Se só tem "Visualizar", simplificar o dropdown

#### Passo 2 — `ContratoPJDetalhe.tsx`
- Importar `usePermissions`
- Esconder botões de edição/exclusão conforme permissões do módulo `contratos_pj`

#### Passo 3 — `PagamentosPJ.tsx`
- Importar `usePermissions`
- Condicionar ações de criação/edição/exclusão conforme permissões do módulo `pagamentos_pj`

### Arquivos alterados
- `src/pages/ContratosPJ.tsx`
- `src/pages/ContratoPJDetalhe.tsx`
- `src/pages/PagamentosPJ.tsx`

