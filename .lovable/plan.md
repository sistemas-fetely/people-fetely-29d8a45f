

## Plano: Redesign visual baseado no moodboard Fetély

### Análise do Moodboard
O moodboard da Fetély apresenta uma paleta vibrante e moderna com:
- **Rosa/coral** como cor dominante (~`#E8707A` / `#F28B82`)
- **Verde escuro** como contraste forte (~`#1A5C3A` / `#2D6A4F`)
- **Creme/bege** para fundos suaves (~`#F5EDDD` / `#FDF6EC`)
- **Padrões geométricos**: ondas, xadrez, losangos — identidade visual lúdica e sofisticada
- Estética feminina, colorida, artesanal mas elegante

### O que muda

#### 1. Paleta de cores (index.css)
Substituir o tema corporate blue por cores inspiradas na marca:

| Token | Atual (azul corporativo) | Novo (Fetély) |
|-------|--------------------------|---------------|
| `--primary` | `215 70% 28%` (azul escuro) | `~352 55% 55%` (rosa Fetély) |
| `--sidebar-background` | `215 70% 18%` (azul escuro) | `~160 55% 22%` (verde escuro) |
| `--sidebar-primary` | azul claro | rosa claro |
| `--background` | cinza claro | creme/bege `~40 40% 96%` |
| `--card` | branco puro | branco quente `~40 30% 99%` |
| `--accent` | cinza | rosa suave com baixa saturação |
| `--ring` | azul | rosa |
| Charts | azul/verde/laranja | rosa, verde escuro, coral, creme |

Manter as cores semânticas (success verde, warning laranja, destructive vermelho) mas ajustar tonalidades para harmonizar.

#### 2. Sidebar (`AppSidebar.tsx`)
- Fundo verde escuro (identidade Fetély) com texto claro
- Itens ativos com destaque em rosa/coral
- Hover com fundo verde levemente mais claro
- Ícones com estilo mais suave (rounded)
- Separadores entre grupos com opacidade sutil
- Logo e nome com mais destaque visual
- Botão de sair mais estilizado

#### 3. Botões de navegação (sidebar items)
- Border-radius maior (`rounded-lg` → `rounded-xl`)
- Transição mais suave com `transition-all duration-200`
- Item ativo: fundo rosa translúcido com borda left rosa sólida (accent bar)
- Hover: fundo com leve tint rosa
- Ícones com tamanho ligeiramente maior e cor rosa quando ativo
- Espaçamento interno mais generoso (`py-2.5 px-4`)

#### 4. Header (`AppHeader.tsx`)
- Fundo creme/bege harmonizado com o novo background
- Breadcrumb com cor rosa no item ativo
- Botões de ação (sino, dark mode) com hover rosa suave

#### 5. Cards e componentes gerais
- `card-shadow` mais suave e quente
- Border radius aumentado para `0.75rem`
- StatCard: ícones com fundo rosa translúcido no variant default
- Badges com tons da paleta Fetély

#### 6. Botão primário (`button.tsx`)
- Fundo rosa Fetély com hover mais escuro
- Border-radius mais arredondado

### Arquivos alterados
- `src/index.css` — nova paleta completa (light + dark)
- `src/components/AppSidebar.tsx` — estilos de navegação refinados
- `src/components/AppHeader.tsx` — harmonização com nova paleta
- `src/components/StatCard.tsx` — ajuste dos variant styles
- `mem://design/tokens` — atualizar documentação da paleta

### Escopo preservado
- Toda lógica de negócio, permissões e funcionalidades permanecem intocadas
- Apenas CSS variables, classes de estilo e apresentação visual são alterados
- Dark mode será adaptado para a nova paleta

