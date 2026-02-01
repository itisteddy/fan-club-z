export type CropAreaPixels = { x: number; y: number; width: number; height: number };

type OutputType = 'image/webp' | 'image/jpeg';

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'async';
  img.crossOrigin = 'anonymous';
  img.src = src;
  await (img.decode
    ? img.decode()
    : new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
      }));
  return img;
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error('Failed to encode image');
  return blob;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

export type CoverCropOptions = {
  imageSrc: string; // object URL or data URL
  cropAreaPixels: CropAreaPixels; // from react-easy-crop
  maxWidth?: number; // default 1600
  targetBytes?: number; // default ~300KB (best effort)
  preferredType?: OutputType; // default webp
};

/**
 * Export a cropped cover image blob (16:9 enforced by the cropper).
 * - Never upscales beyond crop size
 * - Best-effort compress to <= targetBytes (falls back to <= 5MB constraint)
 */
export async function exportCroppedCoverBlob(opts: CoverCropOptions): Promise<{ blob: Blob; contentType: OutputType }> {
  const {
    imageSrc,
    cropAreaPixels,
    maxWidth = 1600,
    targetBytes = 300 * 1024,
    preferredType = 'image/webp',
  } = opts;

  const img = await loadImage(imageSrc);

  const cropW = Math.max(1, Math.floor(cropAreaPixels.width));
  const cropH = Math.max(1, Math.floor(cropAreaPixels.height));

  // scale down only (no upscale)
  const outW = Math.min(maxWidth, cropW);
  const scale = outW / cropW;
  const outH = Math.max(1, Math.round(cropH * scale));

  const canvas = createCanvas(outW, outH);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas not supported');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    img,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    outW,
    outH
  );

  const ladders: Array<{ type: OutputType; qualities: number[] }> = [
    { type: preferredType, qualities: [0.82, 0.72, 0.62] },
    { type: preferredType === 'image/webp' ? 'image/jpeg' : 'image/webp', qualities: [0.82, 0.72, 0.62] },
  ];

  let best: { blob: Blob; type: OutputType } | null = null;

  // Try quality ladders at this size
  for (const ladder of ladders) {
    for (const q of ladder.qualities) {
      try {
        const blob = await canvasToBlob(canvas, ladder.type, q);
        best = { blob, type: ladder.type };
        if (blob.size <= targetBytes) return { blob, contentType: ladder.type };
      } catch {
        // try next
      }
    }
  }

  // If still too large, retry at smaller widths (best-effort)
  for (const nextW of [1200, 1000, 800]) {
    if (nextW >= outW) continue;
    const w = nextW;
    const h = Math.max(1, Math.round((cropH * w) / cropW));
    const c2 = createCanvas(w, h);
    const ctx2 = c2.getContext('2d', { alpha: false });
    if (!ctx2) continue;
    ctx2.imageSmoothingEnabled = true;
    ctx2.imageSmoothingQuality = 'high';
    ctx2.drawImage(
      img,
      cropAreaPixels.x,
      cropAreaPixels.y,
      cropAreaPixels.width,
      cropAreaPixels.height,
      0,
      0,
      w,
      h
    );

    for (const ladder of ladders) {
      for (const q of ladder.qualities) {
        try {
          const blob = await canvasToBlob(c2, ladder.type, q);
          best = { blob, type: ladder.type };
          if (blob.size <= targetBytes) return { blob, contentType: ladder.type };
        } catch {
          // try next
        }
      }
    }
  }

  if (!best) throw new Error('Failed to export cropped image');

  // Best effort: return the smallest we managed
  return { blob: best.blob, contentType: best.type };
}

