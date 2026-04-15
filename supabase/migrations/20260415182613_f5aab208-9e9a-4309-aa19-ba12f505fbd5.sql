
-- Criar tabela
CREATE TABLE IF NOT EXISTS public.skills_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill TEXT NOT NULL,
  area TEXT NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'todos',
  tipo TEXT NOT NULL DEFAULT 'ambos',
  ativo BOOLEAN DEFAULT true,
  criado_por TEXT DEFAULT 'sistema',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill, area, nivel)
);

-- Validation trigger for nivel
CREATE OR REPLACE FUNCTION public.validate_skill_catalogo_nivel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.nivel NOT IN ('jr', 'pl', 'sr', 'coordenacao', 'especialista', 'c_level', 'todos') THEN
    RAISE EXCEPTION 'nivel inválido: %', NEW.nivel;
  END IF;
  IF NEW.tipo NOT IN ('obrigatoria', 'desejada', 'ambos') THEN
    RAISE EXCEPTION 'tipo inválido: %', NEW.tipo;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_skill_catalogo
BEFORE INSERT OR UPDATE ON public.skills_catalogo
FOR EACH ROW EXECUTE FUNCTION public.validate_skill_catalogo_nivel();

ALTER TABLE public.skills_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read skills_catalogo"
ON public.skills_catalogo FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can read skills_catalogo"
ON public.skills_catalogo FOR SELECT TO anon USING (true);

CREATE POLICY "Staff can insert skills_catalogo"
ON public.skills_catalogo FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador')
);

CREATE POLICY "Staff can update skills_catalogo"
ON public.skills_catalogo FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador')
);

CREATE POLICY "Staff can delete skills_catalogo"
ON public.skills_catalogo FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador')
);

-- SEED
INSERT INTO public.skills_catalogo (skill, area, nivel, tipo) VALUES
-- Design Jr
('Figma básico', 'Design', 'jr', 'obrigatoria'),
('Canva', 'Design', 'jr', 'obrigatoria'),
('CorelDraw', 'Design', 'jr', 'desejada'),
('Photoshop básico', 'Design', 'jr', 'obrigatoria'),
('Illustrator básico', 'Design', 'jr', 'obrigatoria'),
('Design de Redes Sociais', 'Design', 'jr', 'obrigatoria'),
('Edição de Imagem', 'Design', 'jr', 'obrigatoria'),
-- Design Pl
('Figma avançado', 'Design', 'pl', 'obrigatoria'),
('Adobe Illustrator', 'Design', 'pl', 'obrigatoria'),
('Adobe Photoshop', 'Design', 'pl', 'obrigatoria'),
('Design de Embalagem', 'Design', 'pl', 'obrigatoria'),
('UX/UI', 'Design', 'pl', 'desejada'),
('Tipografia', 'Design', 'pl', 'obrigatoria'),
('Identidade Visual', 'Design', 'pl', 'obrigatoria'),
('Adobe InDesign', 'Design', 'pl', 'desejada'),
-- Design Sr
('Direção de Arte', 'Design', 'sr', 'obrigatoria'),
('Design de Produto', 'Design', 'sr', 'obrigatoria'),
('Motion Design', 'Design', 'sr', 'desejada'),
('Design System', 'Design', 'sr', 'desejada'),
('Gestão de Marca', 'Design', 'sr', 'obrigatoria'),
('After Effects', 'Design', 'sr', 'desejada'),
-- Design Coordenação
('Gestão de Times Criativos', 'Design', 'coordenacao', 'obrigatoria'),
('Briefing e Aprovação', 'Design', 'coordenacao', 'obrigatoria'),
('Planejamento de Projetos Criativos', 'Design', 'coordenacao', 'obrigatoria'),
-- Marketing Jr
('Gestão de Mídias Sociais', 'Marketing', 'jr', 'obrigatoria'),
('Copywriting básico', 'Marketing', 'jr', 'obrigatoria'),
('Canva', 'Marketing', 'jr', 'obrigatoria'),
('Agendamento de Posts', 'Marketing', 'jr', 'obrigatoria'),
('Edição de Vídeo básica', 'Marketing', 'jr', 'desejada'),
('Análise de Métricas básica', 'Marketing', 'jr', 'desejada'),
-- Marketing Pl
('Marketing Digital', 'Marketing', 'pl', 'obrigatoria'),
('SEO', 'Marketing', 'pl', 'obrigatoria'),
('Tráfego Pago', 'Marketing', 'pl', 'obrigatoria'),
('Email Marketing', 'Marketing', 'pl', 'obrigatoria'),
('Google Analytics', 'Marketing', 'pl', 'obrigatoria'),
('Meta Ads', 'Marketing', 'pl', 'obrigatoria'),
('Copywriting avançado', 'Marketing', 'pl', 'obrigatoria'),
('Inbound Marketing', 'Marketing', 'pl', 'desejada'),
-- Marketing Sr
('Branding', 'Marketing', 'sr', 'obrigatoria'),
('Estratégia de Conteúdo', 'Marketing', 'sr', 'obrigatoria'),
('Growth Marketing', 'Marketing', 'sr', 'desejada'),
('Planejamento de Campanha', 'Marketing', 'sr', 'obrigatoria'),
('Trade Marketing', 'Marketing', 'sr', 'desejada'),
-- Marketing Coordenação
('Planejamento de Marketing', 'Marketing', 'coordenacao', 'obrigatoria'),
('Gestão de Agências', 'Marketing', 'coordenacao', 'obrigatoria'),
('Budget de Marketing', 'Marketing', 'coordenacao', 'obrigatoria'),
-- Comercial Jr
('Prospecção Ativa', 'Comercial', 'jr', 'obrigatoria'),
('CRM básico', 'Comercial', 'jr', 'obrigatoria'),
('Atendimento ao Cliente', 'Comercial', 'jr', 'obrigatoria'),
('Excel básico', 'Comercial', 'jr', 'obrigatoria'),
('Técnicas de Vendas', 'Comercial', 'jr', 'obrigatoria'),
-- Comercial Pl
('Negociação', 'Comercial', 'pl', 'obrigatoria'),
('Gestão de Carteira', 'Comercial', 'pl', 'obrigatoria'),
('CRM avançado', 'Comercial', 'pl', 'obrigatoria'),
('Análise de Dados Comerciais', 'Comercial', 'pl', 'obrigatoria'),
('Apresentações Comerciais', 'Comercial', 'pl', 'obrigatoria'),
-- Comercial Sr
('Key Account Management', 'Comercial', 'sr', 'obrigatoria'),
('Estratégia Comercial', 'Comercial', 'sr', 'obrigatoria'),
('Forecast de Vendas', 'Comercial', 'sr', 'obrigatoria'),
('Desenvolvimento de Canais', 'Comercial', 'sr', 'desejada'),
('Vendas B2B', 'Comercial', 'sr', 'obrigatoria'),
-- Comercial Especialista
('Trade Marketing', 'Comercial', 'especialista', 'obrigatoria'),
('Sell-in / Sell-out', 'Comercial', 'especialista', 'obrigatoria'),
('Gestão de Distribuidores', 'Comercial', 'especialista', 'obrigatoria'),
-- RH Jr
('Recrutamento & Seleção básico', 'RH', 'jr', 'obrigatoria'),
('Triagem de Currículos', 'RH', 'jr', 'obrigatoria'),
('Entrevistas por Competências', 'RH', 'jr', 'obrigatoria'),
('Excel básico', 'RH', 'jr', 'obrigatoria'),
('DP básico', 'RH', 'jr', 'desejada'),
-- RH Pl
('HRBP', 'RH', 'pl', 'obrigatoria'),
('Gestão de Desempenho', 'RH', 'pl', 'obrigatoria'),
('Folha de Pagamento', 'RH', 'pl', 'obrigatoria'),
('Legislação CLT', 'RH', 'pl', 'obrigatoria'),
('eSocial', 'RH', 'pl', 'desejada'),
('Clima Organizacional', 'RH', 'pl', 'obrigatoria'),
('Onboarding', 'RH', 'pl', 'obrigatoria'),
-- RH Sr
('Gestão de Cultura', 'RH', 'sr', 'obrigatoria'),
('OKRs / KPIs', 'RH', 'sr', 'obrigatoria'),
('People Analytics', 'RH', 'sr', 'desejada'),
('Employer Branding', 'RH', 'sr', 'desejada'),
('Planejamento Estratégico de RH', 'RH', 'sr', 'obrigatoria'),
-- Logística Jr
('Controle de Estoque', 'Logística', 'jr', 'obrigatoria'),
('Excel básico', 'Logística', 'jr', 'obrigatoria'),
('Recebimento e Expedição', 'Logística', 'jr', 'obrigatoria'),
('WMS básico', 'Logística', 'jr', 'desejada'),
-- Logística Pl
('Gestão de Estoque', 'Logística', 'pl', 'obrigatoria'),
('Logística de Distribuição', 'Logística', 'pl', 'obrigatoria'),
('Importação / Exportação', 'Logística', 'pl', 'obrigatoria'),
('Roteirização', 'Logística', 'pl', 'desejada'),
('KPIs de Logística', 'Logística', 'pl', 'obrigatoria'),
-- Logística Sr
('Supply Chain', 'Logística', 'sr', 'obrigatoria'),
('S&OP', 'Logística', 'sr', 'obrigatoria'),
('Gestão de Fornecedores', 'Logística', 'sr', 'obrigatoria'),
('Comex avançado', 'Logística', 'sr', 'desejada'),
-- Logística Coordenação
('Gestão de Armazém', 'Logística', 'coordenacao', 'obrigatoria'),
('Planejamento Logístico', 'Logística', 'coordenacao', 'obrigatoria'),
-- TI Jr
('React / TypeScript', 'TI', 'jr', 'obrigatoria'),
('HTML / CSS', 'TI', 'jr', 'obrigatoria'),
('Git', 'TI', 'jr', 'obrigatoria'),
('SQL básico', 'TI', 'jr', 'obrigatoria'),
('APIs REST', 'TI', 'jr', 'desejada'),
-- TI Pl
('Node.js', 'TI', 'pl', 'obrigatoria'),
('Python', 'TI', 'pl', 'desejada'),
('SQL / PostgreSQL', 'TI', 'pl', 'obrigatoria'),
('Arquitetura de Software', 'TI', 'pl', 'desejada'),
('Testes automatizados', 'TI', 'pl', 'desejada'),
('CI/CD', 'TI', 'pl', 'desejada'),
-- TI Sr
('Arquitetura de Sistemas', 'TI', 'sr', 'obrigatoria'),
('Cloud (AWS / GCP)', 'TI', 'sr', 'desejada'),
('Segurança da Informação', 'TI', 'sr', 'desejada'),
('Liderança Técnica', 'TI', 'sr', 'obrigatoria'),
-- Operacional Jr
('Operação de Máquinas', 'Operacional', 'jr', 'obrigatoria'),
('Controle de Qualidade básico', 'Operacional', 'jr', 'obrigatoria'),
('Procedimentos de Segurança', 'Operacional', 'jr', 'obrigatoria'),
('Leitura de Ordens de Produção', 'Operacional', 'jr', 'obrigatoria'),
-- Operacional Pl
('Gestão de Produção', 'Operacional', 'pl', 'obrigatoria'),
('Lean Manufacturing', 'Operacional', 'pl', 'desejada'),
('Controle de Qualidade', 'Operacional', 'pl', 'obrigatoria'),
('Indicadores de Produção', 'Operacional', 'pl', 'obrigatoria'),
-- Operacional Especialista
('Melhoria Contínua', 'Operacional', 'especialista', 'obrigatoria'),
('Six Sigma', 'Operacional', 'especialista', 'desejada'),
('Gestão de Times Operacionais', 'Operacional', 'especialista', 'obrigatoria'),
('PPCP', 'Operacional', 'especialista', 'desejada'),
-- Financeiro Jr
('Excel avançado', 'Financeiro', 'jr', 'obrigatoria'),
('Contas a Pagar / Receber', 'Financeiro', 'jr', 'obrigatoria'),
('Conciliação Bancária', 'Financeiro', 'jr', 'obrigatoria'),
('Noções de Contabilidade', 'Financeiro', 'jr', 'desejada'),
-- Financeiro Pl
('Fluxo de Caixa', 'Financeiro', 'pl', 'obrigatoria'),
('DRE / Balanço', 'Financeiro', 'pl', 'obrigatoria'),
('Planejamento Orçamentário', 'Financeiro', 'pl', 'obrigatoria'),
('BI / Power BI', 'Financeiro', 'pl', 'desejada'),
('Fiscal / Tributário básico', 'Financeiro', 'pl', 'desejada'),
-- Financeiro Sr
('Controladoria', 'Financeiro', 'sr', 'obrigatoria'),
('Análise Financeira avançada', 'Financeiro', 'sr', 'obrigatoria'),
('M&A / Due Diligence', 'Financeiro', 'sr', 'desejada'),
('Gestão de Riscos', 'Financeiro', 'sr', 'desejada'),
-- Produto Jr
('Figma básico', 'Produto', 'jr', 'obrigatoria'),
('Pesquisa com Usuários', 'Produto', 'jr', 'obrigatoria'),
('Documentação de Requisitos', 'Produto', 'jr', 'obrigatoria'),
('SQL básico', 'Produto', 'jr', 'desejada'),
-- Produto Pl
('Product Discovery', 'Produto', 'pl', 'obrigatoria'),
('Gestão de Backlog', 'Produto', 'pl', 'obrigatoria'),
('Métricas de Produto', 'Produto', 'pl', 'obrigatoria'),
('UX Research', 'Produto', 'pl', 'obrigatoria'),
('Roadmapping', 'Produto', 'pl', 'obrigatoria'),
('Agile / Scrum', 'Produto', 'pl', 'obrigatoria'),
-- Produto Sr
('Estratégia de Produto', 'Produto', 'sr', 'obrigatoria'),
('OKRs de Produto', 'Produto', 'sr', 'obrigatoria'),
('Go-to-Market', 'Produto', 'sr', 'obrigatoria'),
('Liderança de Squad', 'Produto', 'sr', 'desejada')
ON CONFLICT (skill, area, nivel) DO NOTHING;
