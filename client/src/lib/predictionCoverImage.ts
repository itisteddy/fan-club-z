/**
 * Prediction cover image upload to Supabase Storage.
 * Bucket: prediction-images (public read). Path: {userId}/{predictionId|temp}/{timestamp}.{ext}
 */

import { supabase } from '@/lib/supabase';

const BUCKET = 'prediction-images';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export const COVER_IMAGE_MAX_SIZE = MAX_SIZE_BYTES;
export const COVER_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

function getExtension(file: File): string {
  const name = file.name || '';
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ext === 'jpg' ? 'jpeg' : ext;
  const mime = file.type?.toLowerCase() || '';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpeg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpeg';
}

function validateFile(file: File): void {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Image is too large. Please choose a file under 5 MB.');
  }
  const type = (file.type || '').toLowerCase();
  const allowed = ALLOWED_MIME.some((m) => type === m || type.startsWith(m.replace('/x-', '/')));
  if (!allowed) {
    throw new Error('Invalid image type. Please use JPEG, PNG, or WebP.');
  }
}

export interface UploadCoverImageResult {
  coverImageUrl: string;
  path: string;
  contentType: string;
  size: number;
}

/**
 * Upload a cover image file to prediction-images bucket.
 * Path: prediction-images/{userId}/{predictionId|temp}/{timestamp}.{ext}
 */
export async function uploadPredictionCoverImage(
  file: File,
  userId: string,
  predictionId?: string
): Promise<UploadCoverImageResult> {
  validateFile(file);
  const ext = getExtension(file);
  const segment = predictionId || 'temp';
  const path = `${userId}/${segment}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

  if (error) {
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('file size') || msg.includes('too large')) {
      throw new Error('Image is too large. Please choose a file under 5 MB.');
    }
    if (msg.includes('mime') || msg.includes('content-type')) {
      throw new Error('Invalid image type. Please use JPEG, PNG, or WebP.');
    }
    throw new Error(error.message || 'Upload failed');
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return {
    coverImageUrl: urlData.publicUrl,
    path: data.path,
    contentType: file.type,
    size: file.size,
  };
}
