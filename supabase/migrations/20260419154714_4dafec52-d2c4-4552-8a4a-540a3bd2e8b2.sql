-- Recreate processos_unificados view to expose diagrama_mermaid
DROP VIEW IF EXISTS public.processos_unificados;

CREATE VIEW public.processos_unificados AS
SELECT
  p.id,
  p.codigo,
  p.nome,
  p.descricao,
  p.narrativa,
  p.diagrama_mermaid,
  p.natureza_valor,
  p.status_valor,
  p.versao_atual,
  p.versao_vigente_em,
  p.owner_user_id,
  p.owner_perfil_codigo,
  pr.full_name AS owner_nome,
  p.area_negocio_id,
  ap.label AS area_nome,
  p.template_sncf_id,
  p.sensivel,
  p.updated_at,
  p.created_at,
  
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.area_id, 'label', pr2.label)), '[]'::jsonb)
   FROM public.processos_tags_areas a
   JOIN public.parametros pr2 ON pr2.id = a.area_id
   WHERE a.processo_id = p.id) AS tags_areas,
  
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', d.departamento_id, 'label', pr3.label)), '[]'::jsonb)
   FROM public.processos_tags_departamentos d
   JOIN public.parametros pr3 ON pr3.id = d.departamento_id
   WHERE d.processo_id = p.id) AS tags_departamentos,
  
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', u.unidade_id, 'label', un.nome)), '[]'::jsonb)
   FROM public.processos_tags_unidades u
   JOIN public.unidades un ON un.id = u.unidade_id
   WHERE u.processo_id = p.id) AS tags_unidades,
  
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', c.cargo_id, 'label', cg.nome)), '[]'::jsonb)
   FROM public.processos_tags_cargos c
   JOIN public.cargos cg ON cg.id = c.cargo_id
   WHERE c.processo_id = p.id) AS tags_cargos,
  
  (SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.sistema_id, 'label', ss.nome)), '[]'::jsonb)
   FROM public.processos_tags_sistemas s
   JOIN public.sncf_sistemas ss ON ss.id = s.sistema_id
   WHERE s.processo_id = p.id) AS tags_sistemas,
  
  (SELECT coalesce(jsonb_agg(tc.tipo), '[]'::jsonb)
   FROM public.processos_tags_tipos_colaborador tc
   WHERE tc.processo_id = p.id) AS tags_tipos_colaborador,
  
  (SELECT COUNT(*) FROM public.processos_log_consultas WHERE processo_id = p.id) AS total_consultas,
  (SELECT COUNT(*) FROM public.processos_log_consultas WHERE processo_id = p.id AND consultado_em > now() - interval '30 days') AS consultas_30d,
  (SELECT COUNT(*) FROM public.processos_sugestoes WHERE processo_id = p.id AND status = 'pendente') AS sugestoes_pendentes

FROM public.processos p
LEFT JOIN public.profiles pr ON pr.user_id = p.owner_user_id
LEFT JOIN public.parametros ap ON ap.id = p.area_negocio_id;

ALTER VIEW public.processos_unificados SET (security_invoker = true);
GRANT SELECT ON public.processos_unificados TO authenticated;