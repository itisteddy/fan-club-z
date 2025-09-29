import { Link } from 'react-router-dom';
import { useMedia } from '@/hooks/useMedia';
import { formatNumberShort, formatDurationShort } from '@lib/format';

type PredictionCardProps = {
  prediction: {
    id: string;
    title: string;
    category?: string;
    endsAt?: string;       // ISO
    pool?: number;         // total pool in base units
    players?: number;      // participants
    options?: Array<{ label: string; odds?: number }>;
    description?: string | null;
  };
};

export default function PredictionCardV3({ prediction }: PredictionCardProps) {
  const { media } = useMedia(prediction.id, {
    id: prediction.id,
    title: prediction.title,
    description: prediction.description ?? '',
    category: prediction.category,
  });

  const endsIn = prediction.endsAt
    ? formatDurationShort(Math.max(0, (new Date(prediction.endsAt).getTime() - Date.now()) / 1000))
    : null;

  return (
    <Link
      to={`/prediction/${prediction.id}`}
      className="block rounded-2xl border border-black/5 bg-white hover:shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500 transition"
    >
      <div className="flex items-stretch gap-3 p-3">
        {/* Left: text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {prediction.category && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5">{prediction.category}</span>
            )}
            {endsIn && <span className="rounded-full bg-gray-100 px-2 py-0.5">ends in {endsIn}</span>}
          </div>

          <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold text-gray-900">
            {prediction.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {typeof prediction.pool === 'number' && (
              <span>{formatNumberShort(prediction.pool, { currency: 'USD' })} pool</span>
            )}
            {typeof prediction.players === 'number' && <span>{prediction.players} players</span>}
            {prediction.options?.length ? (
              <div className="flex items-center gap-1">
                {prediction.options.slice(0, 2).map((o) => (
                  <span
                    key={o.label}
                    className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-700"
                  >
                    {o.label}
                    {o.odds ? (
                      <span className="ml-1 text-gray-500">{o.odds.toFixed(2)}x</span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: thumbnail (fixed) */}
        <div className="h-[72px] w-[96px] shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <img
            src={media.url}
            alt={media.alt || prediction.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
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