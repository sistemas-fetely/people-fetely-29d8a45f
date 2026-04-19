# Acesso do Colaborador ao People Fetely

> **Versão**: 1.0 — abril/2026
> **Alvo**: colaboradores Fetely (CLT e PJ), RH, TI, Jurídico
> **Mantido por**: TI Fetely

---

## Visão geral

O acesso ao People Fetely segue o lema **"WhatsApp do RH silencioso"** — tudo self-service, sem depender de resposta humana no dia a dia. RH só atua em exceções. Este documento descreve o fluxo completo de acesso, desde a criação até a recuperação.

---

## 1. Criação de acesso (primeiro contato)

### Pré-requisitos
Antes de qualquer usuário poder ser criado, a Fetely precisa ter:
- [x] Pelo menos 1 **cargo** cadastrado em `/cargos`
- [x] Pelo menos 1 **departamento** cadastrado em `/parametros`
- [x] Pelo menos 1 **unidade** cadastrada em `/parametros`
- [x] Pelo menos 1 **domínio corporativo** cadastrado em `/parametros` (ex: `fetely.com.br`)
- [x] Template "analista" ativo (fallback do sistema)

Se algum estiver faltando, o sistema exibe banner crítico no topo de qualquer tela.

### Fluxo

1. **RH cadastra o colaborador** via wizard em `/colaboradores/novo` (CLT) ou `/contratos-pj/novo` (PJ), OU importa de um convite pendente em `/convites-cadastro`.

2. **O colaborador fornece seus dados pessoais**, que ficam separados dos dados corporativos:
   - **Dados pessoais**: email pessoal, telefone pessoal, endereço. Uso privado.
   - **Dados corporativos**: email corporativo (ex: `nome.sobrenome@fetely.com.br`). Único email usado para acesso oficial ao sistema.

3. **Ao finalizar o cadastro com a opção "Criar acesso" marcada**, o sistema:
   - Cria o usuário no Supabase Auth sem senha
   - Valida que o email_corporativo bate com um domínio configurado
   - Gera um magic link de primeiro acesso (TTL: 24h)
   - Envia email `boas-vindas-portal` pro email corporativo
   - Envia email `aviso-email-pessoal` pro email pessoal (só informativo, "suas credenciais foram pro corporativo")
   - Aplica template de perfis (colaborador + área derivada do departamento)

4. **O colaborador recebe o email corporativo**, clica em "Ativar meu acesso" → é redirecionado para `/reset-password`.

5. **Na tela de ativação** (primeiro acesso especificamente):
   - Define senha forte (ver seção 3)
   - Lê e aceita o Termo de Uso v1.0
   - Ao submeter:
     - Senha definida no Supabase Auth
     - `profiles.acesso_ativado_em` populado (trigger do banco)
     - `profiles.termo_uso_aceito_em` + `termo_uso_versao` populados

6. **Está dentro**. Login futuro via `/login`.

---

## 2. Recuperação de senha (self-service)

Qualquer colaborador que esqueceu a senha:

1. Acessa `/login`, clica em **"Esqueci minha senha"**
2. Em `/recuperar-senha` informa seu email corporativo
3. Recebe email `recuperacao-senha` com link de 1 hora
4. Clica no link → `/reset-password` → define nova senha
5. Volta pra `/login` e entra

**Sem RH, sem ticket, sem espera.** É isso que self-service significa na Fetely.

Taxa de tentativas: 5 tentativas falhas em 15 min disparam bloqueio temporário do Supabase Auth (nativo).

---

## 3. Política de senha forte

Toda senha definida no People Fetely precisa atender 6 critérios, exibidos em tempo real enquanto o colaborador digita:

1. Pelo menos **12 caracteres**
2. Pelo menos **1 letra maiúscula**
3. Pelo menos **1 letra minúscula**
4. Pelo menos **1 número**
5. Pelo menos **1 caractere especial**
6. **Não pode conter partes do email** (ex: se email é `bruna.foshi@...`, senha "bruna123!" é rejeitada)

**Configuração adicional no painel Supabase** (a fazer na próxima revisão do projeto):
- Habilitar "Minimum password length: 12"
- Habilitar "Password Strength: Strong"
- Habilitar "Leaked Password Protection (HIBP)"
- Configurar rate limit de tentativas

---

## 4. Termo de uso

Ao primeiro acesso, colaborador aceita o Termo de Uso v1.0 cobrindo:
- Uso aceitável dos sistemas
- Confidencialidade de informações
- Proteção de dados (LGPD)
- Monitoramento e auditoria
- Ativos corporativos (saída do colaborador)
- Consequências de descumprimento

Versão vigente está em `parametros.categoria='termo_uso'` e é exibida no rodapé da tela de aceite. Ao atualizar texto, incrementar versão — colaboradores são re-solicitados no próximo login.

---

## 5. Revogação de acesso (saída)

Quando colaborador é desligado/inativado:
- Status do colaborador muda pra `inativo` na tabela de origem
- Trigger de desativação deve ser implementado para marcar `profiles.approved = false` e revogar atribuições ativas (**pendente** — a implementar em fase futura; hoje é manual via Gerenciar Usuários)
- Logs de acesso ficam preservados para auditoria

---

## 6. Auditoria e transparência

- **Logs de acesso**: toda consulta a dado sensível (ex: salário) fica em `acesso_dados_log`
- **Transparência ao titular**: colaborador vê quem consultou seu salário em `/meus-acessos`
- **Log de envio de email**: `email_send_log` registra todos os emails enviados, com status de entrega
- **Primeiro acesso ativado**: `profiles.acesso_ativado_em` serve como comprovação contratual (Dr. Marcos)

---

## 7. Pontos de contato e escalação

- **Sistema indisponível**: TI Fetely
- **Email corporativo não chegou**: RH deve primeiro verificar `email_send_log`; se tiver saído OK, orientar colaborador a checar spam e ativação do inbox corporativo
- **Link expirado**: self-service em `/recuperar-senha`
- **Erro "email corporativo inválido"**: domínio não cadastrado em `/parametros` — TI/RH adiciona
- **Dúvidas LGPD**: DPO designado (pendente — Dra. Renata)

---

## Changelog

### v1.0 — 19/04/2026
- Separação ficha pessoal vs corporativa
- Email corporativo obrigatório pra criação de acesso
- Magic link de 1º acesso para email corporativo
- Cópia informativa para email pessoal
- Página custom de definir senha com identidade Fetely
- Termo de uso v1.0 com aceite obrigatório no primeiro acesso
- Indicador visual de força de senha
- Página de recuperação self-service
- Template de email "recuperacao-senha" separado
- `profiles.acesso_ativado_em` — prova contratual
