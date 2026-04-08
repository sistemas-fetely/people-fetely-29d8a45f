
## Fase 1 — Banco de dados e estrutura base
- Criar tabela `posicoes` (id, titulo_cargo, nivel_hierarquico, departamento, area, filial, status, id_pai, colaborador_id, salario_previsto, centro_custo)
- Criar função recursiva `get_organograma_tree()` para buscar a árvore completa
- Seed com dados mock realistas (CEO → Diretores → Gerentes → Coordenadores → Analistas)
- RLS policies por role

## Fase 2 — Página base + Modo Sintético (tabela)
- Página `/organograma` com tabs (Visual, Sintético, Analítico)
- Toolbar global com filtros (departamento, filial, vínculo, status)
- Modo Sintético com tabela hierárquica colapsável usando @tanstack/react-table
- Drawer lateral com abas (Perfil, Equipe, Posição)
- Rodapé com totais

## Fase 3 — Modo Visual (árvore com React Flow)
- Instalar @xyflow/react
- Renderizar árvore top-down com cards compactos/expandidos
- Zoom, pan, minimap, centralizar
- Cards diferenciados por vínculo/status (cores, bordas)
- Busca com destaque de nós
- Filtro de departamento colapsando ramos

## Fase 4 — Modo Analítico (Dashboard)
- KPIs principais (cards)
- Distribuição por departamento (barras horizontais)
- Pirâmide hierárquica
- CLT vs PJ (donut)
- Mapa de cobertura (treemap)
- Span of Control por gestor (tabela)
- Evolução headcount (linha — dados mock)
- Custo de estrutura (visível por role)

## Fase 5 — Gestão e exportação
- Modal criar/editar posição
- Drag & drop para mover posições
- Exportação PNG/PDF/Excel
- Permissões por role
- Persistência de filtros na URL

**Recomendação:** Implementar Fase 1 + 2 agora, depois iterar nas demais. Quer que eu comece?
