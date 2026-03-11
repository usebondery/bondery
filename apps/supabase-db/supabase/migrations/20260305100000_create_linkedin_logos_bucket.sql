-- Create linkedin_logos storage bucket for company/school logo images.
-- Mirrors the avatars bucket: public, per-user folders keyed by auth.uid().
-- Migration: 20260305100000_create_linkedin_logos_bucket

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('linkedin_logos', 'linkedin_logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can view their own logos
CREATE POLICY "Users can view their own linkedin logos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'linkedin_logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: users can upload logos to their own folder
CREATE POLICY "Users can upload linkedin logos to their own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'linkedin_logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: users can update their own logos
CREATE POLICY "Users can update their own linkedin logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'linkedin_logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
) WITH CHECK (
  bucket_id = 'linkedin_logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: users can delete their own logos
CREATE POLICY "Users can delete their own linkedin logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'linkedin_logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access (logos are not sensitive)
CREATE POLICY "Public can view all linkedin logos" ON storage.objects
FOR SELECT USING (bucket_id = 'linkedin_logos');
