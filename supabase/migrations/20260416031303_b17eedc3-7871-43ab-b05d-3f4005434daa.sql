
-- ═══ FIX: Adicionar admin_rh em TODAS as policies do sistema ═══

-- colaboradores_clt
DROP POLICY IF EXISTS "Super admin and HR can do everything on colaboradores" ON public.colaboradores_clt;
CREATE POLICY "Super admin and HR can do everything on colaboradores"
  ON public.colaboradores_clt FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- dependentes
DROP POLICY IF EXISTS "Super admin and HR can do everything on dependentes" ON public.dependentes;
CREATE POLICY "Super admin and HR can do everything on dependentes"
  ON public.dependentes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- colaborador_departamentos
DROP POLICY IF EXISTS "Super admin and HR can manage colaborador_departamentos" ON public.colaborador_departamentos;
CREATE POLICY "Super admin and HR can manage colaborador_departamentos"
  ON public.colaborador_departamentos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- colaborador_acessos_sistemas
DROP POLICY IF EXISTS "Super admin and HR can manage acessos" ON public.colaborador_acessos_sistemas;
CREATE POLICY "Super admin and HR can manage acessos"
  ON public.colaborador_acessos_sistemas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- colaborador_equipamentos
DROP POLICY IF EXISTS "Super admin and HR can manage equipamentos" ON public.colaborador_equipamentos;
CREATE POLICY "Super admin and HR can manage equipamentos"
  ON public.colaborador_equipamentos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- parametros
DROP POLICY IF EXISTS "Super admin and HR can manage parametros" ON public.parametros;
CREATE POLICY "Super admin and HR can manage parametros"
  ON public.parametros FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- contratos_pj
DROP POLICY IF EXISTS "Super admin and HR can manage contratos_pj" ON public.contratos_pj;
CREATE POLICY "Super admin and HR can manage contratos_pj"
  ON public.contratos_pj FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- notas_fiscais_pj
DROP POLICY IF EXISTS "Super admin and HR can manage notas_fiscais_pj" ON public.notas_fiscais_pj;
CREATE POLICY "Super admin and HR can manage notas_fiscais_pj"
  ON public.notas_fiscais_pj FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- pagamentos_pj
DROP POLICY IF EXISTS "Super admin and HR can manage pagamentos_pj" ON public.pagamentos_pj;
CREATE POLICY "Super admin and HR can manage pagamentos_pj"
  ON public.pagamentos_pj FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- posicoes
DROP POLICY IF EXISTS "Super admin and HR can manage posicoes" ON public.posicoes;
CREATE POLICY "Super admin and HR can manage posicoes"
  ON public.posicoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- folha_competencias
DROP POLICY IF EXISTS "Admin HR Fin can manage folha_competencias" ON public.folha_competencias;
CREATE POLICY "Admin HR Fin can manage folha_competencias"
  ON public.folha_competencias FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'));

-- holerites
DROP POLICY IF EXISTS "Admin HR Fin can manage holerites" ON public.holerites;
CREATE POLICY "Admin HR Fin can manage holerites"
  ON public.holerites FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'));

-- ferias_periodos
DROP POLICY IF EXISTS "Admin HR Fin can manage ferias_periodos" ON public.ferias_periodos;
CREATE POLICY "Admin HR Fin can manage ferias_periodos"
  ON public.ferias_periodos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'));

-- ferias_programacoes
DROP POLICY IF EXISTS "Admin HR Fin can manage ferias_programacoes" ON public.ferias_programacoes;
CREATE POLICY "Admin HR Fin can manage ferias_programacoes"
  ON public.ferias_programacoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'));

-- ferias_pj
DROP POLICY IF EXISTS "Admin HR Fin can manage ferias_pj" ON public.ferias_pj;
CREATE POLICY "Admin HR Fin can manage ferias_pj"
  ON public.ferias_pj FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'));

-- ferias_periodos_pj
DROP POLICY IF EXISTS "Admin HR Fin can manage ferias_periodos_pj" ON public.ferias_periodos_pj;
CREATE POLICY "Admin HR Fin can manage ferias_periodos_pj"
  ON public.ferias_periodos_pj FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'));

-- beneficios_colaborador
DROP POLICY IF EXISTS "Admin HR Fin can manage beneficios" ON public.beneficios_colaborador;
CREATE POLICY "Admin HR Fin can manage beneficios"
  ON public.beneficios_colaborador FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'));

-- beneficios_pj
DROP POLICY IF EXISTS "Admin HR Fin can manage beneficios_pj" ON public.beneficios_pj;
CREATE POLICY "Admin HR Fin can manage beneficios_pj"
  ON public.beneficios_pj FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'));

-- movimentacoes
DROP POLICY IF EXISTS "Admin HR Fin can manage movimentacoes" ON public.movimentacoes;
CREATE POLICY "Admin HR Fin can manage movimentacoes"
  ON public.movimentacoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh') OR has_role(auth.uid(), 'financeiro'));

-- contrato_pj_acessos_sistemas
DROP POLICY IF EXISTS "Super admin and HR can manage pj acessos" ON public.contrato_pj_acessos_sistemas;
CREATE POLICY "Super admin and HR can manage pj acessos"
  ON public.contrato_pj_acessos_sistemas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- contrato_pj_equipamentos
DROP POLICY IF EXISTS "Super admin and HR can manage pj equipamentos" ON public.contrato_pj_equipamentos;
CREATE POLICY "Super admin and HR can manage pj equipamentos"
  ON public.contrato_pj_equipamentos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- convites_cadastro
DROP POLICY IF EXISTS "HR can read convites" ON public.convites_cadastro;
CREATE POLICY "HR can read convites"
  ON public.convites_cadastro FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

DROP POLICY IF EXISTS "HR can create convites" ON public.convites_cadastro;
CREATE POLICY "HR can create convites"
  ON public.convites_cadastro FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

DROP POLICY IF EXISTS "HR can update convites" ON public.convites_cadastro;
CREATE POLICY "HR can update convites"
  ON public.convites_cadastro FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

DROP POLICY IF EXISTS "HR can delete convites" ON public.convites_cadastro;
CREATE POLICY "HR can delete convites"
  ON public.convites_cadastro FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));

-- email_send_log
DROP POLICY IF EXISTS "Admin HR can read email send log" ON public.email_send_log;
CREATE POLICY "Admin HR can read email send log"
  ON public.email_send_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_rh') OR has_role(auth.uid(), 'gestor_rh'));
