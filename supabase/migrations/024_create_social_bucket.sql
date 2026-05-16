-- Create social storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social', 'social', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for social bucket
-- Allow public access to read
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'social' );

-- Allow authenticated users to upload
CREATE POLICY "Auth Users Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'social' AND auth.role() = 'authenticated' );

-- Allow authenticated users to update their own uploads
CREATE POLICY "Auth Users Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'social' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'social' AND auth.role() = 'authenticated' );

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Auth Users Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'social' AND auth.uid() = owner );
