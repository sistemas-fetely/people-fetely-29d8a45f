# Doutrina: Silencioso vs Mapeado

> **Regra simples:** tem R (Responsável humano ou de papel)? Vai pro mapa. Não tem? Fica silencioso.

## O problema que resolvemos

Todo sistema tem centenas de fluxos acontecendo: triggers, validações, envios automáticos, botões que disparam X, regras que executam Y. Se mapeássemos *tudo* em Processos Fetely, a base viraria ruído e ninguém conseguiria encontrar o que importa. Se mapeássemos *pouco*, processos críticos ficariam órfãos.

Esta doutrina define a linha.

## O critério

Pergunta única a fazer antes de criar um processo em Processos Fetely:

> **"Existe uma pessoa (ou papel) que é *Responsável* por essa operação acontecer corretamente, e a quem perguntaríamos se desse errado?"**

- **Sim** → É processo. Vai pro mapa. Mesmo que seja um processo técnico.
- **Não** → É operação silenciosa. Fica na lógica do sistema, sem mapeamento.

## Exemplos

### Silencioso (NÃO mapear)

| Fluxo | Por quê é silencioso |
|---|---|
| Trigger que marca `acesso_ativado_em` no primeiro login | Automação pura. Se falhar, é bug, não processo. |
| Validação que bloqueia deleção de cargo em uso | Regra de integridade. R é o sistema. |
| Função que sincroniza `sncf_templates` com `processos` | Bastidor arquitetural. |
| Rate limit de 5 tentativas de login | Configuração. Não tem R humano na execução rotineira. |
| Log automático de consulta a salário | Efeito colateral obrigatório. |

### Mapeado (DEVE ter em Processos Fetely)

| Processo | Por quê tem R |
|---|---|
| Acesso do Colaborador ao People Fetely | RH é R na criação, colaborador é R no primeiro login, RH é R em reenvios. |
| Visibilidade de Salário | DPO é A, RH é R operacional, Jurídico é C. |
| Fechamento de Folha | Financeiro é R, Diretoria é A. |
| Integração People ↔ Mercus (futuro) | TI é R (mesmo sendo técnico), Gerente Fiscal é A. |
| Estrutura Organizacional (áreas/departamentos) | Admin RH é R ao criar, Super Admin é A. |

## O que fazer ao decidir

Quando for construir ou melhorar algo, pare e pergunte:

1. **O que acabei de construir tem R humano ou de papel?**
2. Se sim → abrir `/processos/novo/editar`, preencher identidade, narrativa, RACI (na narrativa mesmo, em seção própria), tags dimensionais.
3. Se não → siga. O código é suficiente; comentários técnicos no próprio código bastam.

## Quando em dúvida

Dúvida = mapeie. Custo de mapear algo pequeno é baixo; custo de não mapear algo importante pode ser alto (compliance, LGPD, continuidade).

## Revisão periódica

Processos ficam vivos. A cada 6 meses, Super Admin revisa a base e:
- Arquiva processos obsoletos
- Consolida duplicatas
- Promove para "vigente" rascunhos maduros
- Redefine R em processos órfãos
