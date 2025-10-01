import { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import ShareResultCard from './ShareResultCard';
import type { ShareResultProps } from './ShareResultCard';
import toast from 'react-hot-toast';

export interface ShareOptions {
  title: string;
  url: string;
  text?: string;
}

/**
 * Hook for sharing prediction results as images
 * Uses Web Share API with fallback to download/copy link
 */
export function useShareResult() {
  const cardRef = useRef<HTMLDivElement>(null);

  /**
   * Share preview component - renders off-screen
   */
  const SharePreview = (props: ShareResultProps) => (
    <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
      <ShareResultCard ref={cardRef} {...props} />
    </div>
  );

  /**
   * Generate image and share via native share or fallback
   */
  const share = useCallback(async (options: ShareOptions) => {
    if (!cardRef.current) {
      toast.error('Unable to generate share image');
      return;
    }

    try {
      // Generate image from card
      toast.loading('Generating image...', { id: 'share-generating' });
      
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // Higher quality for sharing
        backgroundColor: '#ffffff'
      });

      toast.dismiss('share-generating');

      // Convert to blob for sharing
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'fanclubz-result.png', { type: 'image/png' });

      // Try native share with file
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: options.title,
            text: options.text || 'Check out my prediction result on FanClubZ!',
            url: options.url
          });
          toast.success('Shared successfully!');
          return;
        } catch (shareError: any) {
          // User cancelled or share failed
          if (shareError.name !== 'AbortError') {
            console.error('Share failed:', shareError);
          }
        }
      }

      // Fallback 1: Try share without file (just link)
      if (navigator.share) {
        try {
          await navigator.share({
            title: options.title,
            text: options.text || 'Check out my prediction result on FanClubZ!',
            url: options.url
          });
          toast.success('Link shared successfully!');
          return;
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') {
            console.error('Share link failed:', shareError);
          }
        }
      }

      // Fallback 2: Download image
      const link = document.createElement('a');
      link.download = 'fanclubz-result.png';
      link.href = dataUrl;
      link.click();
      toast.success('Image downloaded!');

      // Also copy link to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(options.url);
        toast.success('Link copied to clipboard!', { id: 'link-copied' });
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share result');
    }
  }, []);

  return {
    SharePreview,
    share
  };
}

