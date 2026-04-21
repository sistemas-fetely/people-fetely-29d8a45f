DROP POLICY IF EXISTS "Reportes images are publicly readable" ON storage.objects;
CREATE POLICY "Reportes images are publicly readable"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'sistema-reportes'
    AND (storage.foldername(name))[1] = 'reportes'
  );