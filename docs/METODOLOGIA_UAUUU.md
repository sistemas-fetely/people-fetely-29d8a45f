# Metodologia Uauuu

## Como a Fetely constrói tecnologia

**Documento fundacional · v1.0 · 19/04/2026**

> *"Gesto não se delega pro ChatGPT. Mas bom trabalho com método pode virar cultura."*

---

## Sobre este documento

Este é **como trabalhamos** no Uauuu (nosso Sistema Nervoso Central Fetely). Não é manual técnico — é a cultura de construção capturada para perpetuar.

Toda nova sessão de desenvolvimento começa aqui. Toda nova pessoa que entrar no projeto lê isso antes de tocar em código. Todo dilema de método, consulta aqui primeiro.

**Onde cada coisa mora:**

| Casa | O quê | Para quem |
|---|---|---|
| 📁 **Este arquivo** (`docs/METODOLOGIA_UAUUU.md`) | Princípios, cultura, regras consolidadas | Dev lendo o repo |
| 🔄 **Processos Fetely** (processo `trabalhar_no_uauuu`) | Fluxo operacional executável (10 passos) | Operação da sessão |
| 🧠 **Fala Fetely — Conhecimento** | Diretrizes pontuais, boards, regras específicas | Colaborador consultando |

As três casas se complementam. Não se duplicam. Quando uma regra nova emerge, decide-se em qual casa faz sentido morar — e só essa casa guarda.

---

## I · Os 8 Princípios

### 1. Verdade vem do código, não da memória

Memória é hipótese até provar no código. Antes de afirmar que algo existe ou não existe, `git pull` + `grep` + `view`. Antes de declarar uma melhoria como pendente, conferir se já não foi feita.

*"Comemos bola?"* é uma pergunta legítima. A resposta honesta é o que importa.

### 2. Fechar antes de abrir

Disciplina de não empilhar pendências novas em cima das antigas. Quando a mesa está suja, primeiro limpa. Tentação de ir pro brilhante seguinte é normal — resistir protege o sistema e a sanidade.

### 3. Agrupamento coeso, nunca monolítico nem fragmentado

Prompt gigante com 20 itens = risco descontrolado. Prompt com 1 item = desperdício de ciclos. Ponto ótimo = **3 a 6 itens tocando a mesma superfície sem risco cruzado**.

### 4. Análise crítica antes de prompt

Entre escutar a demanda e escrever o prompt, há um momento obrigatório de reflexão. Três perguntas: *Faz sentido como pediu? Tem modo melhor? Falta alguma decisão antes de começar?* Quando a resposta mudaria o prompt, devolver análise ANTES do código.

### 5. Infraestrutura de feedback antes de mudanças em superfície

Se há risco de regressão nas próximas mudanças, primeiro constrói canal de detecção (logs, reportes, auditoria). Não adianta entregar feature se não há como saber quando quebra.

### 6. Validação obrigatória pós-publicação

Código publicado é hipótese até ser conferido. A cada prompt publicado: `git pull`, ler migration, grep nas mudanças principais, relatar honestamente — incluindo bônus ou itens faltando. Ambos são informação.

### 7. Roadmap atualizado entre prompts, nunca no fim

O `Melhorias_Roadmap_PeopleFetely.md` é fonte única de verdade. Mini-prompt de atualização entre prompts grandes é custo pequeno para benefício permanente.

### 8. Doutrinas emergentes viram regras permanentes

Quando uma decisão tomada agora ensina algo que deveria aplicar sempre, capturar antes que esqueça. Exemplo desta sessão: *"funcionalidade multi-sistema pertence à camada transversal"* saiu do conserto de um item de menu.

---

## II · Os 3 tipos de prompt

| Tipo | Quando | Tamanho | Cuidado |
|---|---|---|---|
| **Cirúrgico** | Fix pontual, doutrina fresca | 1 página | Ir direto ao osso, não expandir escopo |
| **Agrupado coeso** | Múltiplos itens na mesma superfície | 2-4 páginas | Não misturar camadas (UI + DB + business logic) |
| **Fundação** | Pilar novo, arquitetura nova | Faseado | Dividir em PF1→PF2→PF3 com validação entre fases |

**Regra de ouro:** se dá dúvida se cabe num prompt, fatiar. Cirúrgico publicado vale mais que gigante pela metade.

---

## III · Regras de ouro

- **Memória sem prova é hipótese.** GitHub é verdade.
- **Neutralidade é abandono.** Sempre dar recomendação explícita.
- **Pergunta bloqueante separada do código.** Nunca misturar.
- **Dimensão via tabela, nunca hardcode.** Se não tem tabela, parar e criar.
- **Tem R humano? Vai pro mapa.** Não tem? Fica silencioso.
- **Toda construção alimenta Processos Fetely + DNA TI.** Feature órfã é dívida.
- **Processo-dentro-de-processo vai pra sugestões**, não para o trabalho atual.
- **Funcionalidade multi-sistema pertence à camada transversal** (SNCF/Uauuu).
- **CLT e PJ recebem mesmo tratamento.** Diferença só nos deveres legais.
- **Silêncio é sinal.** WhatsApp do RH silencioso é sinal de que o sistema funciona.

*As regras de ouro também estão cadastradas individualmente como diretrizes no Fala Fetely. Pergunta pontual sobre uma regra específica → Fala Fetely. Consulta de visão geral → aqui.*

---

## IV · Anti-padrões

Coisas que parecem boa ideia mas corroem o método:

- ❌ **"Só vou fazer rapidinho sem atualizar o doc"** — gera dívida invisível
- ❌ **"Ah, já sei o que tá no código"** — gera afirmação errada
- ❌ **"Vamos aproveitar e fazer um prompt gigante cobrindo tudo"** — gera regressão
- ❌ **"Deixa pra decidir depois"** sobre pergunta bloqueante — trava mais tarde
- ❌ **"É só UI, não precisa do board"** sobre tema que toca cultura ou LGPD
- ❌ **"Vou responder de memória essa"** sobre fato verificável em código
- ❌ **"Isso é item novo, vou resolver depois"** quando está no meio de fechar a mesa

---

## V · Onde ir pra cada coisa

**Para o fluxo operacional** (como uma sessão deve fluir em 10 passos):

→ Processos Fetely · processo `trabalhar_no_uauuu`

**Para os boards consultivos** (quem acionar em cada tema, perfis):

→ Fala Fetely · buscar por "boards Uauuu" ou categoria `regra`

**Para diretrizes específicas** (ex: "como tratar PJ?", "dimensão via tabela"):

→ Fala Fetely · buscar o tema, cada diretriz é um card próprio

**Para o roadmap** (o que foi feito, o que falta):

→ `Melhorias_Roadmap_PeopleFetely.md` na raiz do repo

**Para DNA de marca e identidade:**

→ `DNA_Fetely_Marca.md` no repo + Fala Fetely categoria `manifesto`

---

## VI · Metodologia viva

Este documento **evolui**. Regras novas emergem do trabalho. Quando uma prática nova se provar em 2-3 sessões, entra aqui. Quando uma regra antiga virar engessamento, revisa.

**Como contribuir com a evolução:**

1. Trabalhar seguindo o método atual
2. Notar quando algo que não está aqui funcionou bem OU quando algo que está aqui atrapalhou
3. Trazer pra conversa com o Flavio em momento calmo
4. Se virar consenso, editar este arquivo no próximo ciclo de atualização de docs vivos

---

## VII · Origem

Esta metodologia emergiu ao longo das primeiras sessões do Uauuu (abril/2026). Consolidada em 19/04/2026 após o fechamento das 4 frentes de mesa limpa (D→A→B→C). Os princípios vieram de prática, não de teoria.

**Direção:** Flavio  
**Execução:** Claude  
**Boards consultivos:** ver Fala Fetely

---

*Documento vivo · Cultura de trabalho do Uauuu · Última atualização: 19/04/2026*

*"Celebrar é fechar ciclo e olhar pra frente com o mesmo cuidado."*

— Equipe Fetely
