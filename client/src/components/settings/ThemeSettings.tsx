import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore, ThemeMode } from '../../store/themeStore';

const ThemeSettings: React.FC = () => {
  const { mode, setTheme } = useThemeStore();

  const themeOptions: Array<{
    value: ThemeMode;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      value: 'light',
      label: 'Light',
      description: 'Always use light theme',
      icon: <Sun size={20} className="text-amber-500" />
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Always use dark theme',
      icon: <Moon size={20} className="text-blue-500" />
    },
    {
      value: 'system',
      label: 'System',
      description: 'Follow system preference',
      icon: <Monitor size={20} className="text-gray-500" />
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Theme Preference
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Choose how the app should appear
        </p>
      </div>

      <div className="space-y-2">
        {themeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all
              ${mode === option.value
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <div className="flex-shrink-0">
              {option.icon}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900 dark:text-white">
                {option.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {option.description}
              </div>
            </div>
            <div className="flex-shrink-0">
              {mode === option.value && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSettings;
