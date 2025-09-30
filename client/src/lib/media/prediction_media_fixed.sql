-- Supabase table for persisting image picks
-- Run this once in your Supabase SQL editor

-- Create the table
create table if not exists prediction_media (
  prediction_id uuid primary key,
  image_url text,
  query text,
  source text,
  created_at timestamptz default now()
);

-- Add an index for performance (optional but recommended)
create index if not exists idx_prediction_media_created_at 
  on prediction_media(created_at desc);

-- Optional: Enable RLS (Row Level Security) if needed
-- Uncomment these lines if you want to add security policies
-- alter table prediction_media enable row level security;

-- Example RLS policies (uncomment and adjust as needed):
-- Allow anyone to read
-- create policy "Public read access"
--   on prediction_media for select
--   using (true);

-- Allow authenticated users to insert/update
-- create policy "Authenticated users can insert"
--   on prediction_media for insert
--   with check (auth.role() = 'authenticated');

-- create policy "Authenticated users can update"
--   on prediction_media for update
--   using (auth.role() = 'authenticated');
