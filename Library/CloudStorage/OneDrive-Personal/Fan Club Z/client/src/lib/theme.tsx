// Enhanced theme configuration for better Apple-style customization
// File: src/lib/theme.ts

import { useEffect, useState } from 'react'

// Apple-style theme configuration
export interface AppleTheme {
  mode: 'light' | 'dark' | 'auto'
  accentColor: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'indigo'
  reducedMotion: boolean
  fontSize: 'small' | 'default' | 'large'
  highContrast: boolean
}

const defaultTheme: AppleTheme = {
  mode: 'auto',
  accentColor: 'blue',
  reducedMotion: false,
  fontSize: 'default',
  highContrast: false
}

// Theme storage key
const THEME_STORAGE_KEY = 'fan-club-z-theme'

// Custom hook for theme management
export const useAppleTheme = () => {
  const [theme, setTheme] = useState<AppleTheme>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      return stored ? { ...defaultTheme, ...JSON.parse(stored) } : defaultTheme
    } catch {
      return defaultTheme
    }
  })

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement

    // Dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark = theme.mode === 'dark' || (theme.mode === 'auto' && prefersDark)
    
    if (shouldUseDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Accent color
    root.setAttribute('data-accent', theme.accentColor)

    // Reduced motion
    if (theme.reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    // Font size
    root.setAttribute('data-font-size', theme.fontSize)

    // High contrast
    if (theme.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme))
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme.mode !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setTheme(prev => ({ ...prev })) // Trigger re-render
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme.mode])

  const updateTheme = (updates: Partial<AppleTheme>) => {
    setTheme(prev => ({ ...prev, ...updates }))
  }

  return { theme, updateTheme }
}

// Apple-style accent colors
export const accentColors = {
  blue: {
    50: '#EBF4FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#007AFF', // iOS Blue
    600: '#0056CC',
    700: '#003D99',
    800: '#002966',
    900: '#001A4D',
  },
  purple: {
    50: '#F3F1FF',
    100: '#E9E5FF',
    200: '#D4CCFF',
    300: '#B8A6FF',
    400: '#9F7AFF',
    500: '#AF52DE', // iOS Purple
    600: '#8B3DB8',
    700: '#6B2D92',
    800: '#4C1E6D',
    900: '#2E1048',
  },
  green: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#34C759', // iOS Green
    600: '#2BA846',
    700: '#228B37',
    800: '#196D28',
    900: '#10501A',
  },
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#FF9500', // iOS Orange
    600: '#E17500',
    700: '#C35500',
    800: '#A53F00',
    900: '#872A00',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#FF3B30', // iOS Red
    600: '#E12B20',
    700: '#C31E15',
    800: '#A5140D',
    900: '#870B07',
  },
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#5856D6', // iOS Indigo
    600: '#4338CA',
    700: '#3730A3',
    800: '#312E81',
    900: '#1E1B4B',
  }
}

// Generate CSS variables for accent colors
export const generateAccentColorCSS = (accent: keyof typeof accentColors) => {
  const colors = accentColors[accent]
  
  return Object.entries(colors).map(([shade, value]) => 
    `--accent-${shade}: ${value};`
  ).join('\n')
}

// Apple-style font size scales
export const fontSizeScales = {
  small: {
    'display': ['30px', { lineHeight: '36px', letterSpacing: '0.37px' }],
    'title-1': ['25px', { lineHeight: '30px', letterSpacing: '0.36px' }],
    'title-2': ['19px', { lineHeight: '25px', letterSpacing: '0.35px' }],
    'title-3': ['17px', { lineHeight: '22px', letterSpacing: '0.38px' }],
    'body-lg': ['15px', { lineHeight: '20px', letterSpacing: '-0.41px' }],
    'body': ['15px', { lineHeight: '20px', letterSpacing: '-0.41px' }],
    'body-sm': ['13px', { lineHeight: '18px', letterSpacing: '-0.24px' }],
  },
  default: {
    'display': ['34px', { lineHeight: '41px', letterSpacing: '0.37px' }],
    'title-1': ['28px', { lineHeight: '34px', letterSpacing: '0.36px' }],
    'title-2': ['22px', { lineHeight: '28px', letterSpacing: '0.35px' }],
    'title-3': ['20px', { lineHeight: '25px', letterSpacing: '0.38px' }],
    'body-lg': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px' }],
    'body': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px' }],
    'body-sm': ['15px', { lineHeight: '20px', letterSpacing: '-0.24px' }],
  },
  large: {
    'display': ['38px', { lineHeight: '46px', letterSpacing: '0.37px' }],
    'title-1': ['32px', { lineHeight: '38px', letterSpacing: '0.36px' }],
    'title-2': ['26px', { lineHeight: '32px', letterSpacing: '0.35px' }],
    'title-3': ['24px', { lineHeight: '29px', letterSpacing: '0.38px' }],
    'body-lg': ['19px', { lineHeight: '24px', letterSpacing: '-0.41px' }],
    'body': ['19px', { lineHeight: '24px', letterSpacing: '-0.41px' }],
    'body-sm': ['17px', { lineHeight: '22px', letterSpacing: '-0.24px' }],
  }
}

// Theme aware component wrapper
interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Partial<AppleTheme>
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme 
}) => {
  const { theme } = useAppleTheme()

  useEffect(() => {
    if (defaultTheme) {
      const root = document.documentElement
      
      // Apply default overrides
      Object.entries(defaultTheme).forEach(([key, value]) => {
        root.setAttribute(`data-default-${key}`, String(value))
      })
    }
  }, [defaultTheme])

  return (
    <div 
      className="theme-provider"
      data-theme-mode={theme.mode}
      data-accent-color={theme.accentColor}
      data-font-size={theme.fontSize}
      data-reduced-motion={theme.reducedMotion}
      data-high-contrast={theme.highContrast}
    >
      {children}
    </div>
  )
}

// Apple-style system utilities
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrast(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isHighContrast
}

// Apple-style spacing utilities
export const appleSpacing = {
  '2xs': '4px',
  'xs': '8px',
  'sm': '12px',
  'md': '16px',
  'lg': '20px',
  'xl': '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
} as const

// Apple-style animation utilities
export const appleAnimations = {
  micro: '0.1s',
  short: '0.2s',
  medium: '0.3s',
  long: '0.4s',
  spring: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
} as const 