---
name: Fala Fetely conversas favoritas + identidade
description: Conversas do Fala Fetely podem ser fixadas (favorita), exibidas no topo. Frases motivacionais/pensando/sugestões reformuladas no tom Fetely (provocativo, divertido)
type: feature
---
- `fala_fetely_conversas.favorita` (boolean default false): fixa conversa no topo da lista
- Lista de conversas: ordem `favorita DESC, updated_at DESC`
- UI da lista: ícone Star (toggle) + Trash2 direto (sem dropdown). Hover-only no desktop
- Frases motivacionais, "pensando..." e cards de sugestão usam tom Fetely (questionador/celebrativo)
- Cores da identidade Fetely (#1A4A3A verde, #E91E63 rosa, #FF9800 laranja, #3A7D6B verde claro) são intencionais — ignorar lint warnings de "hardcoded colors" nesse arquivo
