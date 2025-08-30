import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
  initializeTheme: () => void;
}

// Utility to get system preference
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Utility to resolve theme based on mode
const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
};

// Utility to apply theme to document
const applyTheme = (theme: ResolvedTheme) => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#1f2937' : '#ffffff');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolvedTheme: 'light',
      
      setTheme: (mode: ThemeMode) => {
        const resolvedTheme = resolveTheme(mode);
        applyTheme(resolvedTheme);
        
        set({ mode, resolvedTheme });
      },
      
      initializeTheme: () => {
        const { mode } = get();
        const resolvedTheme = resolveTheme(mode);
        applyTheme(resolvedTheme);
        
        set({ resolvedTheme });
        
        // Listen for system theme changes when in system mode
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          
          const handleSystemThemeChange = () => {
            const currentState = get();
            if (currentState.mode === 'system') {
              const newResolvedTheme = getSystemTheme();
              applyTheme(newResolvedTheme);
              set({ resolvedTheme: newResolvedTheme });
            }
          };
          
          mediaQuery.addEventListener('change', handleSystemThemeChange);
          
          // Return cleanup function
          return () => {
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
          };
        }
      },
    }),
    {
      name: 'fanclubz-theme',
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);
