-- Create table for storing NASA Astronomy Picture of the Day (APOD) data
CREATE TABLE IF NOT EXISTS nasa_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  explanation TEXT,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  copyright TEXT,
  hdurl TEXT,
  storage_path TEXT,
  thumbnail_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_nasa_images_date ON nasa_images(date);

-- Create storage bucket for NASA images
INSERT INTO storage.buckets (id, name, public)
VALUES ('nasa-images', 'nasa-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the nasa-images bucket
CREATE POLICY "Public read access for nasa-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'nasa-images');

CREATE POLICY "Authenticated users can upload nasa-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nasa-images' AND auth.role() = 'authenticated');

-- Enable RLS on nasa_images table
ALTER TABLE nasa_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access to nasa_images
CREATE POLICY "Public read access for nasa_images"
ON nasa_images FOR SELECT
USING (true);

-- Allow service role to insert/update
CREATE POLICY "Service role can insert nasa_images"
ON nasa_images FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update nasa_images"
ON nasa_images FOR UPDATE
USING (auth.role() = 'service_role');
