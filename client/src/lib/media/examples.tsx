// Example usage of usePredictionMedia hook
// This file demonstrates how to use the media solution in your components

import { usePredictionMedia } from './usePredictionMedia';

// ============================================================================
// Example 1: Prediction Card Component
// ============================================================================

interface Prediction {
  id: string;
  title: string;
  categorySlug?: string;
  description?: string;
  closeDate?: string;
}

export function PredictionCard({ prediction }: { prediction: Prediction }) {
  const imageUrl = usePredictionMedia({
    id: prediction.id,
    title: prediction.title,
    category: prediction.categorySlug, // e.g., 'tech', 'crypto', 'sports'
  });

  return (
    <div className="rounded-lg overflow-hidden shadow-lg bg-white">
      {/* Image Section */}
      <div className="relative h-48 w-full">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={prediction.title}
            className="w-full h-full object-cover"
          />
        ) : (
          // Fallback: Category-based gradient art
          <div className={`w-full h-full ${getCategoryGradient(prediction.categorySlug)}`}>
            <div className="flex items-center justify-center h-full">
              <span className="text-white text-4xl opacity-50">
                {getCategoryIcon(prediction.categorySlug)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {prediction.title}
        </h3>
        {prediction.description && (
          <p className="text-gray-600 text-sm line-clamp-2">
            {prediction.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Example 2: Prediction Details Page
// ============================================================================

export function PredictionDetails({ prediction }: { prediction: Prediction }) {
  // Same hook, same image! 🎉
  const imageUrl = usePredictionMedia({
    id: prediction.id,
    title: prediction.title,
    category: prediction.categorySlug,
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Image */}
      <div className="relative h-96 w-full rounded-lg overflow-hidden mb-6">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={prediction.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full ${getCategoryGradient(prediction.categorySlug)}`}>
            <div className="flex items-center justify-center h-full">
              <span className="text-white text-6xl opacity-50">
                {getCategoryIcon(prediction.categorySlug)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {prediction.title}
        </h1>
        {prediction.description && (
          <p className="text-gray-700 text-lg">
            {prediction.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Example 3: Prediction Grid
// ============================================================================

export function PredictionGrid({ predictions }: { predictions: Prediction[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {predictions.map((prediction) => (
        <PredictionCard key={prediction.id} prediction={prediction} />
      ))}
    </div>
  );
}

// ============================================================================
// Example 4: Prediction List (Compact)
// ============================================================================

export function PredictionListItem({ prediction }: { prediction: Prediction }) {
  const imageUrl = usePredictionMedia({
    id: prediction.id,
    title: prediction.title,
    category: prediction.categorySlug,
  });

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
      {/* Thumbnail */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={prediction.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full ${getCategoryGradient(prediction.categorySlug)}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 truncate">
          {prediction.title}
        </h4>
        {prediction.closeDate && (
          <p className="text-sm text-gray-500">
            Closes: {new Date(prediction.closeDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCategoryGradient(category?: string): string {
  const gradients: Record<string, string> = {
    tech: 'bg-gradient-to-br from-blue-500 to-purple-600',
    crypto: 'bg-gradient-to-br from-orange-500 to-yellow-600',
    sports: 'bg-gradient-to-br from-green-500 to-teal-600',
    politics: 'bg-gradient-to-br from-red-500 to-pink-600',
    finance: 'bg-gradient-to-br from-emerald-500 to-blue-600',
    entertainment: 'bg-gradient-to-br from-purple-500 to-pink-600',
    science: 'bg-gradient-to-br from-cyan-500 to-blue-600',
  };

  return gradients[category || ''] || 'bg-gradient-to-br from-gray-500 to-slate-600';
}

function getCategoryIcon(category?: string): string {
  const icons: Record<string, string> = {
    tech: '💻',
    crypto: '₿',
    sports: '⚽',
    politics: '🏛️',
    finance: '💰',
    entertainment: '🎬',
    science: '🔬',
  };

  return icons[category || ''] || '❓';
}

// ============================================================================
// Example 5: With Loading State
// ============================================================================

export function PredictionCardWithLoading({ prediction }: { prediction: Prediction }) {
  const imageUrl = usePredictionMedia({
    id: prediction.id,
    title: prediction.title,
    category: prediction.categorySlug,
  });

  const [imageLoaded, setImageLoaded] = React.useState(false);

  return (
    <div className="rounded-lg overflow-hidden shadow-lg bg-white">
      <div className="relative h-48 w-full">
        {imageUrl ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gray-200" />
            )}
            <img
              src={imageUrl}
              alt={prediction.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className={`w-full h-full ${getCategoryGradient(prediction.categorySlug)}`} />
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900">{prediction.title}</h3>
      </div>
    </div>
  );
}

// ============================================================================
// Example 6: TypeScript Type Definitions
// ============================================================================

export type PredictionCategory = 
  | 'tech' 
  | 'crypto' 
  | 'sports' 
  | 'politics' 
  | 'finance' 
  | 'entertainment' 
  | 'science' 
  | 'custom';

export interface PredictionWithMedia extends Prediction {
  categorySlug: PredictionCategory;
}

// ============================================================================
// Usage Tips
// ============================================================================

/*
1. **Always pass the same prediction object structure** to ensure consistency
   between Card and Details views.

2. **The hook handles all caching automatically:**
   - First call: Fetches from API (~300-500ms)
   - Subsequent calls: Returns from memory (~10ms)
   - Cross-device: Uses Supabase cache (~50-100ms)

3. **Provide category for better results:**
   Good: usePredictionMedia({ id, title, category: 'tech' })
   OK:   usePredictionMedia({ id, title })

4. **Always have a fallback UI** for when imageUrl is null:
   - Category gradients (shown above)
   - Generic placeholder image
   - Skeleton loading state

5. **The hook is lightweight** - safe to use in lists of 100+ items

6. **Images persist** - once fetched, they're cached forever (until you clear DB)
*/
