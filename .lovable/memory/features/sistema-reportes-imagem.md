---
name: Sistema de Reportes com upload de imagem
description: Botão "Reportar" permite anexar print opcional (max 5MB). Imagens vão para bucket público sistema-reportes em /reportes/{user_id}/
type: feature
---
- Bucket `sistema-reportes` (público, mas SELECT restrito a path `reportes/*`)
- Path de upload: `reportes/{user_id}/{timestamp}.{ext}`
- Coluna `sistema_reportes.imagem_url` armazena URL pública
- Tipos aceitos: image/* (validado no client). Máx 5MB
- Se upload falhar, report ainda é enviado (sem imagem) — não bloqueia
- `useCriarReporte` aceita `imagem_url` opcional no input
