
CREATE TABLE public.parametros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria text NOT NULL,
  valor text NOT NULL,
  label text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(categoria, valor)
);

ALTER TABLE public.parametros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view parametros"
  ON public.parametros FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin and HR can manage parametros"
  ON public.parametros FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'gestor_rh'::app_role));

CREATE TRIGGER update_parametros_updated_at
  BEFORE UPDATE ON public.parametros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial data: sistemas
INSERT INTO public.parametros (categoria, valor, label, descricao, ordem) VALUES
  ('sistema', 'bling', 'Bling', 'ERP e gestão financeira', 1),
  ('sistema', 'shopify', 'Shopify', 'E-commerce', 2),
  ('sistema', 'mercus', 'Mercus', 'Gestão de desempenho', 3),
  ('sistema', 'google_workspace', 'Google Workspace', 'Email, Drive, Calendar', 4),
  ('sistema', 'slack', 'Slack', 'Comunicação interna', 5);

-- Seed: tipos de equipamento
INSERT INTO public.parametros (categoria, valor, label, ordem) VALUES
  ('tipo_equipamento', 'notebook', 'Notebook', 1),
  ('tipo_equipamento', 'celular', 'Celular', 2),
  ('tipo_equipamento', 'monitor', 'Monitor', 3),
  ('tipo_equipamento', 'desktop', 'Desktop', 4),
  ('tipo_equipamento', 'headset', 'Headset', 5),
  ('tipo_equipamento', 'teclado_mouse', 'Teclado/Mouse', 6),
  ('tipo_equipamento', 'outro', 'Outro', 7);

-- Seed: estados de equipamento
INSERT INTO public.parametros (categoria, valor, label, ordem) VALUES
  ('estado_equipamento', 'novo', 'Novo', 1),
  ('estado_equipamento', 'bom', 'Bom estado', 2),
  ('estado_equipamento', 'regular', 'Regular', 3),
  ('estado_equipamento', 'ruim', 'Necessita manutenção', 4);
