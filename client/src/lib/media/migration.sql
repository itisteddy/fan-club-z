-- Migration: Create prediction_media table
-- This should be run in Supabase SQL editor or via migration tool

create table if not exists public.prediction_media (
  predictionId uuid primary key references public.predictions(id) on delete cascade,
  provider text not null,
  providerId text not null,
  query text not null,
  urls jsonb not null,
  alt text not null,
  attribution jsonb not null,
  score numeric not null,
  pickedAt timestamptz not null default now()
);

-- Create index for performance
create index if not exists idx_prediction_media_picked_at on public.prediction_media (pickedAt desc);

-- Enable RLS (Row Level Security)
alter table public.prediction_media enable row level security;

-- Create policy to allow read access to all users
create policy "Allow read access to prediction_media" on public.prediction_media
  for select using (true);

-- Create policy to allow insert/update for authenticated users
create policy "Allow insert/update for authenticated users" on public.prediction_media
  for all using (auth.role() = 'authenticated');
