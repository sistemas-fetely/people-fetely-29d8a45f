-- Seed de tipos de report
INSERT INTO public.parametros (categoria, valor, label, ordem, ativo) VALUES
  ('tipo_reporte', 'bug',        '🐛 Bug — algo não funciona', 1, true),
  ('tipo_reporte', 'ui_confuso', '🧩 Confusão de UI — não entendi', 2, true),
  ('tipo_reporte', 'sugestao',   '💡 Sugestão de melhoria', 3, true),
  ('tipo_reporte', 'dado_errado','📊 Dado errado — algo aqui está incorreto', 4, true),
  ('tipo_reporte', 'outro',      '✍️ Outro — descrever abaixo', 5, true)
ON CONFLICT (categoria, valor) DO NOTHING;

-- Seed de status de tratamento
INSERT INTO public.parametros (categoria, valor, label, ordem, ativo) VALUES
  ('status_reporte', 'recebido',      'Recebido',         1, true),
  ('status_reporte', 'em_analise',    'Em análise',       2, true),
  ('status_reporte', 'em_correcao',   'Em correção',      3, true),
  ('status_reporte', 'resolvido',     'Resolvido',        4, true),
  ('status_reporte', 'duplicado',     'Duplicado',        5, true),
  ('status_reporte', 'nao_procede',   'Não procede',      6, true)
ON CONFLICT (categoria, valor) DO NOTHING;

-- Tabela principal
CREATE TABLE IF NOT EXISTS public.sistema_reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reportado_por UUID REFERENCES auth.users(id),
  reportado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  rota TEXT NOT NULL,
  titulo_tela TEXT,
  user_agent TEXT,
  viewport_width INTEGER,
  tipo_valor TEXT NOT NULL,
  descricao TEXT NOT NULL,
  passos_reproduzir TEXT,
  status_valor TEXT NOT NULL DEFAULT 'recebido',
  prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta','critica')),
  atribuido_a UUID REFERENCES auth.users(id),
  resolvido_em TIMESTAMPTZ,
  resposta_admin TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reportes_status ON public.sistema_reportes(status_valor, reportado_em DESC);
CREATE INDEX IF NOT EXISTS idx_reportes_autor ON public.sistema_reportes(reportado_por, reportado_em DESC);
CREATE INDEX IF NOT EXISTS idx_reportes_atribuido ON public.sistema_reportes(atribuido_a) WHERE atribuido_a IS NOT NULL;

COMMENT ON TABLE public.sistema_reportes IS 
  'Canal formal de report de bugs/sugestões/confusões. Qualquer authenticated user pode inserir. Admin RH e Super Admin gerenciam.';

ALTER TABLE public.sistema_reportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reportes_read_autor" ON public.sistema_reportes
  FOR SELECT TO authenticated
  USING (reportado_por = auth.uid());

CREATE POLICY "reportes_read_admins" ON public.sistema_reportes
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
  );

CREATE POLICY "reportes_insert_self" ON public.sistema_reportes
  FOR INSERT TO authenticated
  WITH CHECK (reportado_por = auth.uid());

CREATE POLICY "reportes_update_admin" ON public.sistema_reportes
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_rh'::app_role)
  );

DROP TRIGGER IF EXISTS trg_reportes_updated_at ON public.sistema_reportes;
CREATE TRIGGER trg_reportes_updated_at
  BEFORE UPDATE ON public.sistema_reportes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();