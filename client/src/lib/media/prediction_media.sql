-- Supabase table for persisting image picks
-- Run this once in your Supabase SQL editor

create table if not exists prediction_media (
  prediction_id uuid primary key,
  image_url text,
  query text,
  source text,
  updated_at timestamptz default now()
);

-- Optional: Add an index on updated_at for performance
create index if not exists idx_prediction_media_updated_at 
  on prediction_media(updated_at desc);

-- Optional: Add RLS policies if needed
-- alter table prediction_media enable row level security;

-- Example policy (adjust based on your auth requirements):
-- create policy "Public read access"
--   on prediction_media for select
--   using (true);

-- create policy "Authenticated users can insert/update"
--   on prediction_media for insert
--   with check (auth.role() = 'authenticated');

-- create policy "Authenticated users can update"
--   on prediction_media for update
--   using (auth.role() = 'authenticated');
