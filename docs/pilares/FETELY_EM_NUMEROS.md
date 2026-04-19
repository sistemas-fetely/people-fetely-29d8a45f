# Fetely em Números

> *"Medir não é controlar. É saber se estamos indo para o lugar certo."*

**Versão 0.1 · Documento Vivo · Abril 2026**

---

## Por que existe

A Fetely nasceu com alma antes de produto. Com produto antes de escala. Agora entra num momento onde **precisamos saber se estamos chegando onde queremos**. Números são isso — não são o objetivo, são a bússola.

Este pilar cuida da medição de tudo que importa: desde "quanto tempo leva pra contratar" até "qual a taxa de retorno de lojista". Não é dashboard financeiro. Não é BI técnico. É **a forma Fetely de saber como vamos**.

## Os 5 princípios

### I — Medir o que importa, não o que impressiona

Cada KPI precisa responder uma pergunta real de alguém da Fetely. Se ninguém age com o número, o número não existe. Vaidade de métrica é inimigo — "número bonito que não muda decisão" não entra.

### II — Todo KPI tem dono

Número órfão é número morto. Todo KPI tem uma pessoa (ou papel) responsável por ele: quem acompanha, quem age, quem explica a variação.

### III — KPI vive em processo, não no vácuo

Número fora de contexto engana. Cada KPI está conectado a um processo em Processos Fetely — quando você olha o processo, vê os números. Quando olha o número, vê o processo.

### IV — Frequência honesta

Nem tudo precisa ser medido diariamente. Medir com frequência errada distorce decisão. Cada KPI tem **sua** frequência — diária, semanal, mensal, trimestral — e respeita ela.

### V — Meta e realidade lado a lado

Número sozinho não diz nada. Meta sem número é promessa. A Fetely coloca os dois lado a lado sempre, e celebra quando acerta, investiga quando erra.

---

## Arquitetura futura (será construída quando tivermos base)

Quando atingirmos ~5 processos reais mapeados em Processos Fetely, construiremos:

**Tabelas:**

- `kpis` — catálogo de KPIs (nome, descrição, fórmula, unidade, dono, frequência)

- `kpis_metas` — meta atual por período

- `kpis_valores` — histórico de valores medidos

- `kpis_processos` — FK ligando KPI a processo (muitos-para-muitos)

- `kpis_alertas` — regras de alerta (valor fora da meta por X dias)

**Integração com Processos Fetely:**

Cada processo terá uma aba "Números" que mostra os KPIs vinculados e seu estado atual.

**Integração com Fala Fetely:**

Quando alguém perguntar "como tá o recrutamento?", o Fala Fetely responde com processo + números juntos.

**Dashboards:**

- Visão CEO — macro estratégico

- Visão pilar — dono de cada área

- Visão operacional — KPIs por processo

---

## KPIs identificados até aqui (seed)

### Processo: Recrutamento

*Identificados no mapeamento de 19/04/2026 — ainda não implementados.*

- ⏱ **Tempo total da vaga** — dias entre `status=publicada` e `status=contratado`. Meta: ≤ 20 dias.

- 📊 **Tempo médio por etapa** — quantos dias cada candidato fica em cada coluna do kanban

- 📉 **Taxa de conversão do funil** — recebido → triagem → entrevista → teste → proposta → contratado

- 🌐 **Taxa de resposta externa** — % de candidatos que cumprem prazo de teste e proposta

- ✅ **Taxa de aceite de proposta** — propostas aceitas / enviadas

- 🎯 **Score médio dos contratados** — calibração do IA

- 📥 **Origem dos contratados** — portal, indicação, LinkedIn, etc.

*Próximos processos a mapear trarão mais KPIs candidatos.*

---

## Quando vamos construir

**Critério:** atingir ~5 processos reais mapeados em Processos Fetely com KPIs candidatos identificados.

**Status hoje:** 1 processo mapeado (Recrutamento). Faltam 4.

**Próximos processos no caminho:**

1. Onboarding CLT + PJ

2. Emissão de NF PJ

3. Fechamento de Folha

4. Desligamento CLT + PJ

5. Produção de Lote Joinville

Quando cruzarmos esse marco, paramos, olhamos o conjunto de KPIs identificados, e construímos a estrutura real.

---

## Relação com outros pilares

- **Processos Fetely** — toda métrica vive ligada a um processo. Sem processo, não tem KPI.

- **Fala Fetely** — é a boca: responde perguntas usando processos + números juntos.

- **TI Fetely** — cuida da infraestrutura que sustenta a medição.

- **People** — KPIs de operação de pessoas (recrutamento, folha, onboarding).

- **Marca** — KPIs de presença e alcance (seguidores, engajamento, menção).

- **Operação** — KPIs de fábrica (produção, qualidade, estoque).

- **Comercial** — KPIs de giro (vendas, ticket médio, recorrência).

- **Financeiro** — KPIs de saúde (fluxo, margem, contas).

---

*Celebrar também é medir. Ver o número subir é parte da festa.* 🎉

---

*Fetely · #celebreoqueimporta · Documento vivo, atualizado a cada processo mapeado.*
