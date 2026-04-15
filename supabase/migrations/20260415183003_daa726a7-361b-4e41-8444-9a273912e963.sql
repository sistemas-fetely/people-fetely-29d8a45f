
CREATE TABLE IF NOT EXISTS public.ferramentas_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ferramenta TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'todos',
  ativo BOOLEAN DEFAULT true,
  criado_por TEXT DEFAULT 'sistema',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ferramenta, area)
);

ALTER TABLE public.ferramentas_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read ferramentas_catalogo"
ON public.ferramentas_catalogo FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can read ferramentas_catalogo"
ON public.ferramentas_catalogo FOR SELECT TO anon USING (true);

CREATE POLICY "Staff can insert ferramentas_catalogo"
ON public.ferramentas_catalogo FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador')
);

CREATE POLICY "Staff can update ferramentas_catalogo"
ON public.ferramentas_catalogo FOR UPDATE TO authenticated
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

CREATE POLICY "Staff can delete ferramentas_catalogo"
ON public.ferramentas_catalogo FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin_rh') OR
  public.has_role(auth.uid(), 'gestor_rh') OR
  public.has_role(auth.uid(), 'recrutador')
);

INSERT INTO public.ferramentas_catalogo (ferramenta, area) VALUES
('Google Workspace', 'todos'),
('Slack', 'todos'),
('Notion', 'todos'),
('Trello', 'todos'),
('Asana', 'todos'),
('Zoom', 'todos'),
('Microsoft Teams', 'todos'),
('WhatsApp Business', 'todos'),
('Figma', 'Design'),
('Adobe Illustrator', 'Design'),
('Adobe Photoshop', 'Design'),
('Adobe InDesign', 'Design'),
('Canva', 'Design'),
('CorelDraw', 'Design'),
('After Effects', 'Design'),
('Premiere', 'Design'),
('Meta Business Suite', 'Marketing'),
('Google Ads', 'Marketing'),
('Google Analytics', 'Marketing'),
('RD Station', 'Marketing'),
('Mailchimp', 'Marketing'),
('HubSpot', 'Marketing'),
('SEMrush', 'Marketing'),
('Buffer', 'Marketing'),
('Salesforce', 'Comercial'),
('Pipedrive', 'Comercial'),
('HubSpot CRM', 'Comercial'),
('Bling ERP', 'Comercial'),
('Mercado Livre', 'Comercial'),
('Mercus', 'Comercial'),
('Gupy', 'RH'),
('Greenhouse', 'RH'),
('Kenoby', 'RH'),
('Sólides', 'RH'),
('Convenia', 'RH'),
('Ponto Mais', 'RH'),
('Feedz', 'RH'),
('SAP', 'Logística'),
('TOTVS', 'Logística'),
('Bling ERP', 'Logística'),
('Tiny ERP', 'Logística'),
('WMS Sankhya', 'Logística'),
('Excel avançado', 'Logística'),
('VS Code', 'TI'),
('GitHub', 'TI'),
('Jira', 'TI'),
('Supabase', 'TI'),
('Vercel', 'TI'),
('AWS', 'TI'),
('Postman', 'TI'),
('Docker', 'TI'),
('SAP PM', 'Operacional'),
('TOTVS Manufatura', 'Operacional'),
('Excel', 'Operacional'),
('Power BI', 'Operacional'),
('SAP FI', 'Financeiro'),
('TOTVS Financeiro', 'Financeiro'),
('Conta Azul', 'Financeiro'),
('Omie', 'Financeiro'),
('Power BI', 'Financeiro'),
('Excel avançado', 'Financeiro'),
('Bling ERP', 'Financeiro'),
('Jira', 'Produto'),
('Notion', 'Produto'),
('Figma', 'Produto'),
('Miro', 'Produto'),
('Mixpanel', 'Produto'),
('Amplitude', 'Produto'),
('Linear', 'Produto')
ON CONFLICT (ferramenta, area) DO NOTHING;
