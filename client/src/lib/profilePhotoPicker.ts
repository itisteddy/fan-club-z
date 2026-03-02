import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024; // 10MB

type NativeSource = 'camera' | 'photos';

export type PickProfilePhotoResult =
  | { ok: true; file: File }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; code: 'permission_denied' | 'camera_unavailable' | 'capture_failed'; message: string };

function logDev(event: string, payload?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  console.log(`[ProfilePhotoPicker] ${event}`, payload || {});
}

export function isNativeRuntime(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function validateProfilePhotoFile(file: File): { ok: true } | { ok: false; message: string } {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!allowed.has(file.type)) {
    return { ok: false, message: 'Unsupported image type. Use JPG, PNG, WEBP, or GIF.' };
  }
  if (file.size <= 0) {
    return { ok: false, message: 'Selected image is empty.' };
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return { ok: false, message: 'Image is too large. Use a file under 10 MB.' };
  }
  return { ok: true };
}

function isCancellationError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('cancel') || m.includes('canceled') || m.includes('cancelled') || m.includes('user denied');
}

function isCameraUnavailableError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('camera not available') || m.includes('no camera') || m.includes('not available');
}

async function toFileFromPhoto(photo: Photo, fallbackName: string): Promise<File> {
  let blob: Blob | null = null;
  if (photo.webPath) {
    const res = await fetch(photo.webPath);
    blob = await res.blob();
  } else if (photo.path) {
    const webPath = Capacitor.convertFileSrc(photo.path);
    const res = await fetch(webPath);
    blob = await res.blob();
  } else if (photo.base64String) {
    const mime = photo.format === 'png' ? 'image/png' : 'image/jpeg';
    const b64 = atob(photo.base64String);
    const bytes = new Uint8Array(b64.length);
    for (let i = 0; i < b64.length; i += 1) bytes[i] = b64.charCodeAt(i);
    blob = new Blob([bytes], { type: mime });
  }

  if (!blob) {
    throw new Error('No image data returned from picker');
  }

  const ext = photo.format === 'png' ? 'png' : photo.format === 'webp' ? 'webp' : 'jpg';
  const file = new File([blob], `${fallbackName}.${ext}`, {
    type: blob.type || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'),
    lastModified: Date.now(),
  });
  return file;
}

async function ensureCameraPermission(): Promise<'granted' | 'denied'> {
  const status = await Camera.checkPermissions();
  if (status.camera === 'granted') return 'granted';
  if (status.camera === 'denied') return 'denied';
  const requested = await Camera.requestPermissions();
  return requested.camera === 'granted' ? 'granted' : 'denied';
}

export async function openNativeAppSettings(): Promise<void> {
  const { App } = await import('@capacitor/app');
  await App.openSettings();
}

export async function pickNativeProfilePhoto(source: NativeSource): Promise<PickProfilePhotoResult> {
  try {
    logDev('start', {
      source,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
    });

    if (source === 'camera') {
      const permission = await ensureCameraPermission();
      logDev('camera_permission', { permission });
      if (permission !== 'granted') {
        return {
          ok: false,
          cancelled: false,
          code: 'permission_denied',
          message: 'Camera permission denied. Enable camera access in Settings.',
        };
      }
    }

    const photo = await Camera.getPhoto({
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Uri,
      quality: 85,
      allowEditing: false,
      correctOrientation: true,
      // Prevent iPad popover anchoring crashes by avoiding popover presentation.
      presentationStyle: 'fullscreen',
    });

    const file = await toFileFromPhoto(photo, source === 'camera' ? 'profile-camera' : 'profile-library');
    const validation = validateProfilePhotoFile(file);
    if (!validation.ok) {
      return { ok: false, cancelled: false, code: 'capture_failed', message: validation.message };
    }

    logDev('success', { source, bytes: file.size, mime: file.type });
    return { ok: true, file };
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to capture photo';
    logDev('error', { source, message });
    if (isCancellationError(message)) {
      return { ok: false, cancelled: true };
    }
    if (isCameraUnavailableError(message)) {
      return {
        ok: false,
        cancelled: false,
        code: 'camera_unavailable',
        message: 'Camera is not available on this device.',
      };
    }
    return {
      ok: false,
      cancelled: false,
      code: 'capture_failed',
      message,
    };
  }
}

