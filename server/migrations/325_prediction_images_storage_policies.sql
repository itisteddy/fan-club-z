-- Prediction cover images (Supabase Storage) policies
-- Bucket: prediction-images
-- Object path shape: {predictionId}/cover.webp (or cover.jpg)
--
-- Goal: allow ONLY the prediction creator to upload/update objects in their prediction folder.
-- Note: Storage "public bucket" controls read access to object bytes; these policies cover RLS on storage.objects.

-- Enable RLS is already on for storage.objects in Supabase projects; do not disable it.

-- Allow public read of object metadata for this bucket (optional but useful for list/download endpoints).
drop policy if exists "prediction-images: public read" on storage.objects;
create policy "prediction-images: public read"
on storage.objects
for select
to public
using (bucket_id = 'prediction-images');

-- Allow creator to insert cover images into their own prediction folder.
drop policy if exists "prediction-images: creator insert" on storage.objects;
create policy "prediction-images: creator insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'prediction-images'
  and exists (
    select 1
    from public.predictions p
    where p.id::text = split_part(name, '/', 1)
      and p.creator_id = auth.uid()
  )
);

-- Allow creator to update/overwrite cover images in their own prediction folder.
drop policy if exists "prediction-images: creator update" on storage.objects;
create policy "prediction-images: creator update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'prediction-images'
  and exists (
    select 1
    from public.predictions p
    where p.id::text = split_part(name, '/', 1)
      and p.creator_id = auth.uid()
  )
)
with check (
  bucket_id = 'prediction-images'
  and exists (
    select 1
    from public.predictions p
    where p.id::text = split_part(name, '/', 1)
      and p.creator_id = auth.uid()
  )
);

