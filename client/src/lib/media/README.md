# Contextual Images & Consistency System

This system provides relevant, consistent images across all prediction components using a deterministic selection algorithm.

## Features

- **Contextual Relevance**: Smart query building with disambiguation for common terms (Apple = company, not fruit)
- **Consistency**: Same prediction always shows the same image across cards and details
- **Performance**: Caching in Supabase + memory, lazy loading, no layout shift
- **Fallbacks**: Beautiful category-based gradients when no suitable image is found
- **Provider Support**: Unsplash and Pexels APIs with safe search

## Environment Variables

Add these to your `.env` file:

```bash
# Image Provider API Keys (Optional - fallbacks will be used if not provided)
VITE_UNSPLASH_ACCESS_KEY=your-unsplash-access-key
VITE_PEXELS_API_KEY=your-pexels-api-key

# Image System Configuration
VITE_IMAGES_PROVIDER=unsplash
IMAGES_SAFE_MODE=true
IMAGES_FEATURE_FLAG=true
```

## Usage

```tsx
import { usePredictionMedia } from '@/hooks/usePredictionMedia';

function PredictionCard({ prediction }) {
  const { media, loading } = usePredictionMedia(prediction);
  
  return (
    <div className="card">
      <img 
        src={media?.urls.thumb} 
        alt={media?.alt}
        className="w-20 h-20 object-cover rounded-lg"
      />
    </div>
  );
}
```

## Database Setup

Run this SQL in Supabase to create the required table:

```sql
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

create index if not exists idx_prediction_media_picked_at on public.prediction_media (pickedAt desc);
alter table public.prediction_media enable row level security;

create policy "Allow read access to prediction_media" on public.prediction_media
  for select using (true);

create policy "Allow insert/update for authenticated users" on public.prediction_media
  for all using (true);
```

## Architecture

1. **Query Builder** (`queryBuilder.ts`): Extracts keywords and disambiguates terms
2. **Providers** (`providers.ts`): Fetches from Unsplash/Pexels with scoring
3. **Resolver** (`resolveMedia.ts`): Deterministic selection with DB caching
4. **Hook** (`usePredictionMedia.ts`): React integration with loading states
5. **Fallbacks** (`resolveMedia.ts`): Category-based gradients as data URLs

## Acceptance Criteria

- ✅ Same prediction shows identical image in card and details
- ✅ "Apple/iPhone" predictions show tech, not food
- ✅ Cards maintain fixed layout (no shift during image load)
- ✅ Fallbacks are polished gradients, not broken images
- ✅ No duplicate API calls after first view (cached in DB)
- ✅ Console logs show provider:providerId for debugging consistency
