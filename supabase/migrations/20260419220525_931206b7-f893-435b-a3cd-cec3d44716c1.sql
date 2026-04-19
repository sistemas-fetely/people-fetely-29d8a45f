DROP VIEW IF EXISTS public.tarefas_emissao_nf_pendentes;

CREATE VIEW public.tarefas_emissao_nf_pendentes
WITH (security_invoker = true) AS
SELECT 
  t.id AS tarefa_id,
  t.colaborador_id AS contrato_id,
  t.colaborador_nome AS pj_nome,
  t.responsavel_user_id AS pj_user_id,
  t.titulo,
  t.prazo_data,
  t.status,
  t.created_at,
  cpj.razao_social,
  cpj.email_corporativo,
  cpj.valor_mensal,
  cpj.departamento
FROM public.sncf_tarefas t
LEFT JOIN public.contratos_pj cpj ON cpj.id = t.colaborador_id
WHERE t.tipo_processo = 'emissao_nf'
  AND t.status IN ('pendente', 'em_andamento')
ORDER BY t.prazo_data ASC NULLS LAST;

GRANT SELECT ON public.tarefas_emissao_nf_pendentes TO authenticated;

COMMENT ON VIEW public.tarefas_emissao_nf_pendentes IS 
  'Tarefas de emissão de NF PJ ainda pendentes. View com security_invoker=true (respeita RLS do consultante).';