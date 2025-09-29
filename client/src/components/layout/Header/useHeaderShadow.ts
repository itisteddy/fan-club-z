import { useEffect, useRef, useState } from 'react';

export function useHeaderShadow(threshold = 10) {
  const [showShadow, setShowShadow] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let animationFrame: number;
    
    const handleScroll = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      
      animationFrame = requestAnimationFrame(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        setShowShadow(scrollTop > threshold);
      });
    };

    // Initial check
    handleScroll();

    // Add event listener with passive option for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [threshold]);

  return { showShadow, headerRef };
}
