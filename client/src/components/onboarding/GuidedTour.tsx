import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { TourStep } from './TourProvider';

interface GuidedTourProps {
  isOpen: boolean;
  steps: TourStep[];
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const getTargetRect = (selector: string) => {
  const el = document.querySelector(`[data-tour-id="${selector}"]`) as HTMLElement | null;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { rect, el };
};

const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, steps, index, onClose, onNext, onPrev }) => {
  const current = steps[index];
  const targetInfo = useMemo(() => (current ? getTargetRect(current.target) : null), [current]);

  // Ensure the target is scrolled into view for accessibility
  useEffect(() => {
    if (targetInfo?.el) {
      try {
        targetInfo.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {}
    }
  }, [index, targetInfo?.el]);

  useEffect(() => {
    function onResize() { /* re-render for new rect */ }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const bottomOffset = React.useMemo(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    // Extra space for iOS bottom browser bar + our bottom nav + possible FAB
    return isIOS ? 200 : 160;
  }, []);

  const overlay = (
    <AnimatePresence>
      {isOpen && current && (
        <div className="fixed inset-0 z-[13000] pointer-events-none">
          {/* Dim background */}
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

          {/* Highlight box */}
          {targetInfo && (
            <motion.div
              className="absolute border-2 border-teal-400 rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                left: Math.max(8, targetInfo.rect.left - 6),
                top: Math.max(8, targetInfo.rect.top - 6),
                width: Math.min(window.innerWidth - 16, targetInfo.rect.width + 12),
                height: targetInfo.rect.height + 12,
              }}
            />
          )}

          {/* Tooltip card */}
          <motion.div
            className="fixed bg-white rounded-2xl shadow-2xl pointer-events-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              left: '50%',
              top: '50%',
              // Center the tooltip on screen to avoid right-leaning/cutoff
              transform: 'translate(-50%, -50%)',
              // Prevent overflow on small devices
              width: 'min(92vw, 420px)',
              boxSizing: 'border-box',
              marginLeft: '16px',
              marginRight: '16px',
            }}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-base">{current.title}</h3>
              <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close tour">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 text-sm text-gray-700 break-normal">
              {current.description}
            </div>
            <div className="p-3 grid grid-cols-[auto,1fr,auto] items-center gap-2 w-full">
              <button onClick={onPrev} disabled={index === 0} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 disabled:opacity-50 min-w-[72px] flex items-center gap-1 justify-center">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <div className="flex items-center justify-center gap-1">
                {steps.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i === index ? 'bg-teal-500' : 'bg-gray-300'}`} />
                ))}
              </div>
              <button onClick={onNext} className="px-3 py-2 rounded-lg bg-teal-600 text-white min-w-[72px] flex items-center gap-1 justify-center">
                {index === steps.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // Render overlay in a portal to avoid being affected by parent transforms/overflow
  if (typeof document !== 'undefined') {
    return createPortal(overlay, document.body);
  }
  return overlay;
};

export default GuidedTour;


