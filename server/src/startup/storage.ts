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


