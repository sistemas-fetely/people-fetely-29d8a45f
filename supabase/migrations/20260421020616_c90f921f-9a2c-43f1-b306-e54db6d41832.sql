-- 1. Favoritar conversas do Fala Fetely
ALTER TABLE public.fala_fetely_conversas
  ADD COLUMN IF NOT EXISTS favorita BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_fala_fetely_conversas_user_fav
  ON public.fala_fetely_conversas(user_id, favorita DESC, updated_at DESC);

-- 2. Imagem opcional em sistema_reportes
ALTER TABLE public.sistema_reportes
  ADD COLUMN IF NOT EXISTS imagem_url TEXT;

-- 3. Bucket público para imagens de reportes
INSERT INTO storage.buckets (id, name, public)
VALUES ('sistema-reportes', 'sistema-reportes', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Policies de storage
DROP POLICY IF EXISTS "Reportes images are publicly readable" ON storage.objects;
CREATE POLICY "Reportes images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sistema-reportes');

DROP POLICY IF EXISTS "Authenticated users can upload report images" ON storage.objects;
CREATE POLICY "Authenticated users can upload report images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sistema-reportes');

DROP POLICY IF EXISTS "Users can update their own report images" ON storage.objects;
CREATE POLICY "Users can update their own report images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'sistema-reportes' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'sistema-reportes' AND owner = auth.uid());