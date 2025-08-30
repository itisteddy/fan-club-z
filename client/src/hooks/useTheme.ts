import { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

/**
 * Hook to manage theme initialization and provide theme utilities
 */
export const useTheme = () => {
  const { mode, resolvedTheme, setTheme, initializeTheme } = useThemeStore();

  useEffect(() => {
    // Initialize theme on mount
    const cleanup = initializeTheme();
    
    // Return cleanup function if provided
    return cleanup;
  }, [initializeTheme]);

  return {
    mode,
    resolvedTheme,
    setTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };
};
