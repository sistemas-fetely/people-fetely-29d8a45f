-- 2 doutrinas emergentes capturadas em 19/04/2026 (sessão NF PJ)
INSERT INTO public.fala_fetely_conhecimento (
  categoria, titulo, conteudo, area_negocio, publico_alvo, fonte, tags, ativo, origem
)
SELECT * FROM (VALUES
  (
    'diretriz',
    'Processo espelho entre CLT e PJ',
    E'**Doutrina permanente do Uauuu.**\n\nQuando um processo da Fetely existe em formato CLT, existe ou deve existir em formato PJ equivalente — são **processos espelho**. A única diferença é o registro legal de cada lado.\n\n**Exemplos:**\n- Fechamento de folha CLT ↔ Emissão de NF PJ (ambos: ciclo mensal de remuneração)\n- Admissão CLT ↔ Início de contrato PJ (ambos: onboarding unificado)\n- Avaliação CLT ↔ Revisão de contrato PJ (futuro)\n\n**Regra prática:** ao desenhar processo para um dos lados, explicitar no bloco "Conexões" do processo o espelho do outro lado (ainda que o outro lado esteja pendente de mapeamento). Isso honra a diretriz "CLT e PJ recebem o mesmo tratamento".\n\n**Origem:** emergiu na conversa sobre NF PJ em 19/04/2026 — Flavio identificou que "esse processo é o espelho do pagamento de salário CLT".',
    NULL::text, 'todos', 'Aprendizado emergente 19/04/2026 — sessão NF PJ',
    ARRAY['metodologia', 'doutrina', 'clt', 'pj', 'espelho', 'processo'],
    true, 'manual'
  ),
  (
    'diretriz',
    'Permissões revistas a cada feature nova',
    E'**Doutrina permanente do Uauuu.**\n\nToda feature nova obrigatoriamente passa por revisão do módulo de permissões. É parte inseparável do processo de construção — não é "coisa pra fazer depois".\n\n**Checklist obrigatório:**\n\n1. **Qual `permModule` ela usa?** Existe ou precisa criar?\n2. **Quais perfis devem enxergar?** (`super_admin`, `admin_rh`, `gestor_direto`, `colaborador`, `financeiro`, etc)\n3. **Matriz de permissões reflete a decisão?** Checar `/gerenciar-usuarios` → aba Perfis e Permissões\n4. **`ProtectedRoute` da rota está configurado?**\n5. **`PermissionGate` nos botões de ação crítica?**\n\n**Regra:** nunca deploy sem revisar a matriz. Feature órfã de permissão é dívida imediata — usuário certo sem acesso vira suporte; usuário errado com acesso vira risco.\n\n**Na prática do Ciclo Uauuu:** essa checklist entra no passo 6 (Escrita do prompt) — toda vez que um prompt for escrever código que cria feature nova, explicitar as permissões no próprio prompt. E no passo 8 (Validação), verificar se a matriz foi efetivamente atualizada.\n\n**Origem:** Flavio cobrou em 19/04/2026 — "Lembra de ajustar as permissões no perfil de acordo com a construção, isso faz parte do nosso processo, certo?". Ponto aceito e formalizado.',
    NULL::text, 'todos', 'Aprendizado emergente 19/04/2026 — cobrança do Flavio',
    ARRAY['metodologia', 'doutrina', 'permissoes', 'processo', 'checklist', 'seguranca'],
    true, 'manual'
  )
) AS v(categoria, titulo, conteudo, area_negocio, publico_alvo, fonte, tags, ativo, origem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.fala_fetely_conhecimento f WHERE f.titulo = v.titulo
);