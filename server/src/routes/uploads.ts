import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { ensureAvatarsBucket } from '../startup/storage';

export const uploadsRouter = Router();

const MAX_AVATAR_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_AVATAR_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AVATAR_BYTES,
  },
});

function safeExtFromMime(mime: string | undefined): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

/**
 * POST /api/v2/uploads/avatar
 * Authenticated avatar upload that uses server service-role to write into Storage.
 *
 * Why: Client-side Supabase Storage uploads can fail in production due to bucket policy misconfig
 * (400 Bad Request). This endpoint provides a stable path for iOS/Android/web.
 */
uploadsRouter.post('/avatar', requireSupabaseAuth, upload.single('file'), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'bad_request', message: 'Missing file', version: VERSION });
    }

    const contentType = String(file.mimetype || '').toLowerCase();
    if (!ALLOWED_AVATAR_MIME.has(contentType)) {
      return res.status(400).json({
        error: 'invalid_file_type',
        message: 'Invalid image type. Please upload a JPG, PNG, GIF, or WEBP image.',
        version: VERSION,
      });
    }

    // Ensure bucket exists (best-effort; non-fatal if already exists)
    await ensureAvatarsBucket();

    const ext = safeExtFromMime(contentType);
    const nonce = crypto.randomBytes(8).toString('hex');
    const path = `${userId}/${Date.now()}-${nonce}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      // supabase-js accepts Buffer in Node
      .upload(path, file.buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadErr) {
      console.error('[uploads/avatar] Storage upload error:', uploadErr);
      return res.status(500).json({
        error: 'upload_failed',
        message: 'Failed to upload image. Please try again.',
        version: VERSION,
      });
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) {
      return res.status(500).json({
        error: 'upload_failed',
        message: 'Upload succeeded but URL generation failed.',
        version: VERSION,
      });
    }

    return res.status(201).json({
      data: { publicUrl, path },
      message: 'Avatar uploaded',
      version: VERSION,
    });
  } catch (err: any) {
    console.error('[uploads/avatar] Unhandled error:', err);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to upload image',
      version: VERSION,
    });
  }
});

