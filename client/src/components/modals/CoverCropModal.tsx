import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { X, ZoomIn } from 'lucide-react';
import type { CropAreaPixels } from '@/lib/coverCrop';
import { exportCroppedCoverBlob } from '@/lib/coverCrop';

interface CoverCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  originalFile?: File | null;
  onClose: () => void;
  onConfirm: (result: { file: File; previewUrl: string }) => void;
  title?: string;
}

function fileFromBlob(blob: Blob, name: string): File {
  // File constructor works in modern browsers + Capacitor WebViews.
  return new File([blob], name, { type: blob.type || 'application/octet-stream' });
}

export default function CoverCropModal({
  isOpen,
  imageSrc,
  originalFile = null,
  onClose,
  onConfirm,
  title = 'Crop cover image',
}: CoverCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropAreaPixels | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const canRender = Boolean(isOpen && imageSrc);

  const onCropComplete = useCallback((_area: any, areaPixels: any) => {
    // react-easy-crop gives pixels in original image coordinate space
    setCroppedAreaPixels(areaPixels as CropAreaPixels);
  }, []);

  const acceptDisabledReason = useMemo(() => {
    if (!imageSrc) return 'No image selected';
    if (!croppedAreaPixels) return 'Crop area not ready';
    return null;
  }, [imageSrc, croppedAreaPixels]);

  const handleUseImage = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsExporting(true);
    try {
      const { blob, contentType } = await exportCroppedCoverBlob({
        imageSrc,
        cropAreaPixels: croppedAreaPixels,
        maxWidth: 1600,
        targetBytes: 300 * 1024,
        preferredType: 'image/webp',
      });

      const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
      const file = fileFromBlob(blob, `cover.${ext}`);
      const previewUrl = URL.createObjectURL(file);
      onConfirm({ file, previewUrl });
    } finally {
      setIsExporting(false);
    }
  }, [croppedAreaPixels, imageSrc, onConfirm]);

  const handleUseOriginal = useCallback(() => {
    if (!originalFile) return;
    const previewUrl = URL.createObjectURL(originalFile);
    onConfirm({ file: originalFile, previewUrl });
  }, [onConfirm, originalFile]);

  return (
    <AnimatePresence mode="wait">
      {canRender && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => (isExporting ? null : onClose())}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500">Aspect ratio is fixed to 16:9.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                aria-label="Close crop modal"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                <Cropper
                  image={imageSrc || undefined}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 9}
                  cropShape="rect"
                  showGrid={true}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-600 shrink-0">
                  <ZoomIn className="w-4 h-4" />
                  Zoom
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="w-10 text-right text-xs text-gray-500 tabular-nums">
                  {zoom.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              {originalFile ? (
                <button
                  type="button"
                  onClick={handleUseOriginal}
                  disabled={isExporting}
                  className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Use original
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleUseImage}
                disabled={isExporting || !!acceptDisabledReason}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'Processing…' : 'Use image'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

