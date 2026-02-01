import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMedia } from '../../hooks/useMedia';
import { formatNumberShort, formatDurationShort } from '@/lib/format';
import CreatorByline from './CreatorByline';
import { getCategoryLabel } from '@/lib/categoryUi';
import { buildPredictionCanonicalPath } from '@/lib/predictionUrls';

type PredictionCardProps = {
  prediction: {
  id: string;
  title: string;
    category?: string;
    endsAt?: string;       // ISO
    pool?: number;         // total pool in base units
    players?: number;      // participants
    options?: Array<{ label?: string; title?: string; text?: string; odds?: number }>;
    description?: string | null;
    image_url?: string | null;
    creator?: {
      id?: string;
      username?: string | null;
      full_name?: string | null;
      avatar_url?: string | null;
      is_verified?: boolean | null;
    };
  };
};

export default function PredictionCardV3({ prediction }: PredictionCardProps) {
  // Add null check to prevent errors when prediction is undefined
  if (!prediction) {
    return null;
  }

  const location = useLocation();
  const fromPath = `${location.pathname}${location.search}${location.hash}`;

  const derivedKeywords = [
    prediction.category,
    prediction.creator?.username ?? undefined,
    prediction.creator?.full_name ?? undefined,
  ].filter((value): value is string => Boolean(value));

  const identityAttributes = [
    prediction.creator?.is_verified ? 'verified creator' : undefined,
  ].filter((value): value is string => Boolean(value));

  const metadata = {
    id: prediction.id,
    title: prediction.title,
    description: prediction.description ?? '',
    category: prediction.category,
    image_url: prediction.image_url ?? undefined,
    options: prediction.options?.map((option) => ({
      label: option?.label ?? option?.title ?? option?.text ?? '',
    })),
    keywords: derivedKeywords,
    attributes: identityAttributes,
    tags: derivedKeywords,
    identity: {
      creator: prediction.creator?.full_name || prediction.creator?.username || null,
      community: prediction.category ? `${prediction.category} community` : null,
      personas: identityAttributes,
    },
    popularity: {
      pool: typeof prediction.pool === 'number' ? prediction.pool : null,
      players: typeof prediction.players === 'number' ? prediction.players : null,
    },
  };

  const { media } = useMedia(prediction.id, metadata);

  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
  }, [media.url]);

  // formatDurationShort expects milliseconds; provide ms to avoid truncation to minutes
  const endsIn = prediction.endsAt
    ? formatDurationShort(Math.max(0, new Date(prediction.endsAt).getTime() - Date.now()))
    : null;

  return (
    <Link
      to={buildPredictionCanonicalPath(prediction.id, prediction.title)}
      state={{ from: fromPath }}
      className="block rounded-2xl border border-black/5 bg-white hover:shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500 transition"
    >
      <div className="flex items-stretch gap-3 p-3">
        {/* Left: text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {(() => {
              const categoryLabel = getCategoryLabel(prediction);
              return categoryLabel ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium">{categoryLabel}</span>
              ) : null;
            })()}
            {endsIn && <span className="rounded-full bg-gray-100 px-2 py-0.5">ends in {endsIn}</span>}
        </div>

          <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold text-gray-900">
            {prediction.title}
        </h3>

          {prediction.creator && (
            <CreatorByline creator={prediction.creator} className="mt-1.5 text-xs" />
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {typeof prediction.pool === 'number' && (
              <span>${formatNumberShort(prediction.pool)} pool</span>
            )}
            {typeof prediction.players === 'number' && <span>{prediction.players} players</span>}
            {prediction.options?.length ? (
              <div className="flex items-center gap-1">
                {prediction.options.slice(0, 2).map((o, index) => {
                  const optionLabel = o.label ?? o.title ?? o.text ?? `Option ${index + 1}`;
                  return (
                    <span
                    key={`${optionLabel}-${index}`}
                    className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-700"
                  >
                    {optionLabel}
                    {o.odds ? (
                      <span className="ml-1 text-gray-500">{o.odds.toFixed(2)}x</span>
                    ) : null}
                    </span>
                  );
                })}
          </div>
            ) : null}
        </div>
      </div>

        {/* Right: thumbnail (fixed 16:9) */}
        <div className="relative w-[96px] aspect-video shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {media.url ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 animate-pulse bg-gray-200" />
              )}
              <img
                src={media.url}
                alt={media.alt || prediction.title}
                className="h-full w-full object-cover object-center block transition-opacity duration-300"
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(false)}
                style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 200ms ease' }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-300" />
          )}
        </div>
      </div>
    </Link>
  );
}

export function PredictionCardV3Skeleton() {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-3">
      <div className="flex items-stretch gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-4 w-12 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 rounded-full animate-pulse" />
        </div>
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-1" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="flex items-center gap-3">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-[72px] w-[96px] bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}