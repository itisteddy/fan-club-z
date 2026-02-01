import { supabase } from '../config/database';

/**
 * Ensure the avatars storage bucket exists and is public.
 */
export async function ensureAvatarsBucket(): Promise<void> {
  try {
    const { data: buckets, error: listErr } = await (supabase as any).storage.listBuckets?.();
    if (listErr) {
      console.warn('⚠️ Could not list storage buckets:', listErr.message);
      return;
    }

    const exists = Array.isArray(buckets) && buckets.some((b: any) => b.name === 'avatars');
    if (!exists) {
      console.log('🪣 Creating public storage bucket: avatars');
      const { error: createErr } = await (supabase as any).storage.createBucket?.('avatars', {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/*'],
      });
      if (createErr) {
        console.warn('⚠️ Failed to create avatars bucket:', createErr.message);
      }
    }
  } catch (err: any) {
    console.warn('⚠️ ensureAvatarsBucket error:', err?.message || err);
  }
}

const PREDICTION_IMAGES_BUCKET = 'prediction-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Ensure the prediction-images storage bucket exists and is public.
 */
export async function ensurePredictionImagesBucket(): Promise<void> {
  try {
    const { data: buckets, error: listErr } = await (supabase as any).storage.listBuckets?.();
    if (listErr) {
      console.warn('⚠️ Could not list storage buckets:', listErr.message);
      return;
    }

    const exists = Array.isArray(buckets) && buckets.some((b: any) => b.name === PREDICTION_IMAGES_BUCKET);
    if (!exists) {
      console.log('🪣 Creating public storage bucket: prediction-images');
      const { error: createErr } = await (supabase as any).storage.createBucket?.(PREDICTION_IMAGES_BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_MIME,
      });
      if (createErr) {
        console.warn('⚠️ Failed to create prediction-images bucket:', createErr.message);
      }
    }
  } catch (err: any) {
    console.warn('⚠️ ensurePredictionImagesBucket error:', err?.message || err);
  }
}
