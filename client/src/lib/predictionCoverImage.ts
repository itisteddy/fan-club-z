/**
 * Prediction cover image upload to Supabase Storage.
 *
 * - Bucket: `prediction-images` (public read)
 * - Stable object path: `{predictionId}/cover.webp` (or `.jpg` fallback)
 * - Client-side optimization: center-crop to 16:9, max 1600x900
 */

import { supabase } from '@/lib/supabase';

const BUCKET = 'prediction-images';

// Input validation (pre-optimization)
const MAX_INPUT_BYTES = 12 * 1024 * 1024; // 12MB
const ALLOWED_INPUT_MIME_PREFIX = 'image/';

// Output constraints (bucket is limited server-side too)
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const TARGET_ASPECT = 16 / 9;
const TARGET_MAX_W = 1600;
const TARGET_MAX_H = 900;

export const COVER_IMAGE_MAX_SIZE = MAX_INPUT_BYTES;
export const COVER_IMAGE_ACCEPT = 'image/*';

export interface UploadCoverImageResult {
  coverImageUrl: string;
  path: string;
  contentType: string;
  size: number;
  optimized: boolean;
}

function validateInput(file: File | Blob): void {
  const size = file.size ?? 0;
  if (size > MAX_INPUT_BYTES) {
    throw new Error('Image is too large. Please choose a file under 12 MB.');
  }
  const type = ('type' in file ? (file.type || '') : '').toLowerCase();
  if (type && !type.startsWith(ALLOWED_INPUT_MIME_PREFIX)) {
    throw new Error('Invalid file type. Please choose an image.');
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeCenterCropRect(srcW: number, srcH: number): { x: number; y: number; w: number; h: number } {
  // Center-crop to 16:9
  const srcAspect = srcW / srcH;
  let cropW = srcW;
  let cropH = srcH;
  let cropX = 0;
  let cropY = 0;
  if (srcAspect > TARGET_ASPECT) {
    // Too wide: crop left/right
    cropW = Math.round(srcH * TARGET_ASPECT);
    cropX = Math.round((srcW - cropW) / 2);
  } else if (srcAspect < TARGET_ASPECT) {
    // Too tall: crop top/bottom
    cropH = Math.round(srcW / TARGET_ASPECT);
    cropY = Math.round((srcH - cropH) / 2);
  }
  return { x: cropX, y: cropY, w: cropW, h: cropH };
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  // Fast path
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through
    }
  }

  // Fallback for older WebViews / Safari edge cases
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await (img.decode ? img.decode() : new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to decode image'));
    }));
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getBitmapSize(bmp: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  if ('width' in bmp && 'height' in bmp) return { width: bmp.width, height: bmp.height };
  // Should never happen
  return { width: (bmp as any).width ?? 0, height: (bmp as any).height ?? 0 };
}

function drawCoverToCanvas(bmp: ImageBitmap | HTMLImageElement, outW: number, outH: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas not supported');

  const { width: srcW, height: srcH } = getBitmapSize(bmp);
  if (!srcW || !srcH) throw new Error('Invalid image dimensions');

  const { x: cropX, y: cropY, w: cropW, h: cropH } = computeCenterCropRect(srcW, srcH);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp as any, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error('Failed to encode image');
  return blob;
}

async function optimizeToCover(file: File): Promise<{ blob: Blob; contentType: string; ext: 'webp' | 'jpg'; optimized: boolean }> {
  // If anything fails, caller can fallback to original upload
  const bmp = await loadBitmap(file);
  const { width: srcW, height: srcH } = getBitmapSize(bmp);

  // Avoid upscaling: compute crop rect first, then scale down to max bounds.
  const { w: cropW, h: cropH } = computeCenterCropRect(srcW, srcH);

  let outW = Math.min(TARGET_MAX_W, cropW);
  let outH = Math.round(outW / TARGET_ASPECT);

  // Ensure we fit within max height too.
  if (outH > TARGET_MAX_H) {
    outH = TARGET_MAX_H;
    outW = Math.round(outH * TARGET_ASPECT);
  }

  // Do not upscale beyond crop dimensions.
  outW = Math.min(outW, cropW);
  outH = Math.min(outH, cropH);

  // Provide a reasonable minimum so tiny images don't become unusably small.
  outW = clamp(outW, 320, TARGET_MAX_W);
  outH = Math.round(outW / TARGET_ASPECT);

  const canvas = drawCoverToCanvas(bmp, outW, outH);

  // Try WebP first; fallback to JPEG if unsupported
  const candidates: Array<{ type: string; ext: 'webp' | 'jpg' }> = [
    { type: 'image/webp', ext: 'webp' },
    { type: 'image/jpeg', ext: 'jpg' },
  ];

  let best: { blob: Blob; contentType: string; ext: 'webp' | 'jpg' } | null = null;
  for (const c of candidates) {
    // Quality ladder to ensure we fit under MAX_UPLOAD_BYTES
    for (const q of [0.82, 0.72, 0.62]) {
      try {
        const blob = await canvasToBlob(canvas, c.type, q);
        best = { blob, contentType: c.type, ext: c.ext };
        if (blob.size <= MAX_UPLOAD_BYTES) {
          return { blob, contentType: c.type, ext: c.ext, optimized: true };
        }
      } catch {
        // try next encoding
      }
    }
  }

  // If we got something but it's still too big, return it anyway (upload may still fail)
  if (best) return { ...best, optimized: true };

  throw new Error('Failed to optimize image');
}

async function requireSupabaseSession(): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (import.meta.env.DEV) console.warn('[cover-upload] session check error', error);
  }
  if (!data?.session) {
    throw new Error('Please sign in again to upload a cover image.');
  }
}

function normalizePredictionId(predictionId: string): string {
  const id = String(predictionId || '').trim();
  if (!id) throw new Error('Missing prediction id for cover upload');
  // Keep only safe URL/path characters (stable & portable)
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function uploadPredictionCoverImage(
  predictionId: string,
  file: File,
  opts?: { upsert?: boolean }
): Promise<UploadCoverImageResult> {
  validateInput(file);
  await requireSupabaseSession();

  const safeId = normalizePredictionId(predictionId);

  let uploadBlob: Blob = file;
  let contentType = file.type || 'application/octet-stream';
  let ext: 'webp' | 'jpg' = 'jpg';
  let optimized = false;

  try {
    const optimizedResult = await optimizeToCover(file);
    uploadBlob = optimizedResult.blob;
    contentType = optimizedResult.contentType;
    ext = optimizedResult.ext;
    optimized = optimizedResult.optimized;
  } catch (e) {
    // Optimization failure should not block upload; fallback to original file
    if (import.meta.env.DEV) {
      console.warn('[cover-upload] optimize failed; falling back to original', e);
    }
  }

  const path = `${safeId}/cover.${ext}`;

  if (import.meta.env.DEV) {
    console.log('[cover-upload] PUT', { bucket: BUCKET, path, contentType, size: uploadBlob.size, optimized });
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, uploadBlob, {
      cacheControl: '3600',
      upsert: opts?.upsert ?? true,
      contentType,
    });

  if (error) {
    if (import.meta.env.DEV) console.warn('[cover-upload] upload error', error);
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('policy')) {
      throw new Error('Cover upload blocked by storage policy. Please sign in again and retry.');
    }
    if (msg.includes('file size') || msg.includes('too large')) {
      throw new Error('Cover image is too large after optimization. Please choose a smaller image.');
    }
    throw new Error(error.message || 'Upload failed');
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return {
    coverImageUrl: urlData.publicUrl,
    path: data.path,
    contentType,
    size: uploadBlob.size,
    optimized,
  };
}
