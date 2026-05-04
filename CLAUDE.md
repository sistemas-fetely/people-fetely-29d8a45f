# CLAUDE.md — Sistema Nervoso Central Fetely (SNCF)
> Leia este arquivo inteiro antes de qualquer ação. É o briefing do projeto.

## Quem é a Fetely
Marca brasileira de celebração e lifestyle. Vende artigos para festa e mesa (velas numéricas Lumier + utensílios Célébrée). Filosofia: democratizar o luxo nas celebrações. Tese criativa: 70% Dopamina / 30% Luxo.
Filtro universal: "Isso tornaria um momento mais especial?" — vale para produto, código, tela, e-mail.
Frase síntese: "Gesto não se delega pro ChatGPT."

## Bateria de Testes — Delta v10 (PENDENTE)
Estes 5 cenários precisam ser testados em produção (people-fetely.lovable.app) antes de avançar qualquer sprint novo.

### Bateria 1 — Status granular
Cenário 1: Importar NF com 2+ boletos, lançar só 1 despesa. Esperado: badge azul "Parcial (1/N)" na tela NFsStage.
Cenário 2: Lançar o boleto restante. Esperado: badge muda para verde "Vinculada".
Cenário 3: Apagar uma das despesas vinculadas. Esperado: badge volta para azul "Parcial".

### Bateria 2 — Backfill
Cenário 4: Encontrar os 2 stages corrigidos manualmente. Esperado: valor e data_vencimento não aparecem mais como traço.
Cenário 5: Verificar status desses 2 stages. Esperado: status coerente (vinculada ou parcial, não nao_vinculada).

Risco conhecido: cache React Query pode atrasar badge. Fix pendente: qc.invalidateQueries queryKey nfs-stage no onSuccess.
