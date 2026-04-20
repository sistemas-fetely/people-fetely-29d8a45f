-- ============================================================
-- Correção crítica: ressalva no card "CLT e PJ recebem o mesmo tratamento"
-- Motivação: card absoluto causou alucinação do Fala Fetely sobre
-- processo de NF PJ em 20/04/2026, gerando risco trabalhista.
-- ============================================================

UPDATE public.fala_fetely_conhecimento
SET
  titulo = 'CLT e PJ recebem o mesmo tratamento CULTURAL (mas processos operacionais podem divergir)',
  conteudo = E'**Princípio de DNA Fetely aplicado CULTURALMENTE.**\n\n⚠️ **Ressalva importante:** este princípio aplica-se à **cultura, pertencimento e tratamento pessoal** — NÃO a processos operacionais legais/fiscais.\n\n## O que é IGUAL (CLT e PJ)\n\n- **Cultura e pertencimento:** mesma expectativa, mesmo acesso a treinamentos, mesma voz em decisões\n- **Onboarding cultural:** quem chega passa pelo mesmo ritual de boas-vindas\n- **Benefícios não-legais:** quando aplicável (ex: vale-cultura, flexibilidade)\n- **Comunicação:** tudo via sistema ou email automático, sem WhatsApp informal\n- **Portal do colaborador:** dados pessoais, tarefas, acessos — equivalentes\n\n## O que é DIFERENTE (CLT e PJ) — crítico\n\n- **Fluxo de remuneração:** CLT = folha mensal automatizada; PJ = emissão de NF mensal via `/minhas-notas` (processo `emissao_nf_pj`)\n- **Documentação legal:** contratos distintos, vínculos distintos\n- **Encargos fiscais:** CLT tem INSS/FGTS/IRRF na fonte; PJ emite NF com impostos próprios\n- **Subordinação:** CLT é subordinado; PJ tem autonomia (crítico para não gerar vínculo empregatício)\n- **Desligamento:** CLT tem rescisão formal; PJ tem encerramento de contrato\n\n## ⚠️ Risco trabalhista\n\nTratar processos operacionais CLT e PJ como idênticos **caracteriza vínculo empregatício disfarçado** — o famoso "PJ pejotizado". Isso pode gerar:\n- Reconhecimento de vínculo CLT pela Justiça do Trabalho\n- Passivo retroativo (FGTS, férias, 13º, INSS)\n- Multas e responsabilização dos sócios\n\n## Na prática\n\n**Para CULTURA e tratamento:** "CLT e PJ são iguais, são todos Fetely."\n\n**Para PROCESSOS OPERACIONAIS:** sempre consultar o processo específico em Processos Fetely. Se é NF, é `emissao_nf_pj`. Se é folha, é `fechamento_folha_clt`. Cada um tem seu fluxo, seu portal, sua tarefa própria — e é ASSIM que preserva a autonomia PJ.\n\n## Frase-guia corrigida\n\n*"O que importa é quem você é, não o regime contratual" (cultura) + "respeitamos a natureza legal de cada contrato" (operação).*\n\n---\n\n**Histórico:** este card foi refinado em 20/04/2026 após incidente em que o Fala Fetely aplicou literalmente "CLT=PJ" a pergunta sobre processo de NF, gerando resposta de risco trabalhista. O incidente virou regra: **diretrizes culturais nunca determinam fluxo operacional**.',
  tags = ARRAY['metodologia','dna','clt','pj','igualdade','cultura','risco_trabalhista','compliance'],
  updated_at = now()
WHERE titulo = 'CLT e PJ recebem o mesmo tratamento';

-- Auditoria da correção
INSERT INTO public.audit_log (acao, tabela, dados_depois, justificativa)
VALUES (
  'CARD_FALA_FETELY_REFINADO',
  'fala_fetely_conhecimento',
  jsonb_build_object(
    'card', 'CLT e PJ recebem o mesmo tratamento',
    'motivo', 'Incidente de alucinação sobre processo NF PJ em 20/04/2026',
    'risco_evitado', 'vinculo_empregaticio_caracterizacao',
    'refinado_em', now()
  ),
  'Refinamento crítico após incidente de alucinação em 20/04/2026 — card absoluto gerava risco trabalhista'
);