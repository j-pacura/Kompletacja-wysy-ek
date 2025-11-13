import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Theme types
export type ThemeMode = 'dark' | 'light';
export type ColorScheme = 'default' | 'blue' | 'purple' | 'green';

interface ThemeContextType {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleMode: () => void;
}

// Color definitions for each scheme
const COLOR_SCHEMES = {
  dark: {
    default: {
      'bg-primary': '#0a0e27',
      'bg-secondary': '#1a1f3a',
      'bg-tertiary': '#2a3150',
      'accent-primary': '#3b82f6',
      'accent-secondary': '#8b5cf6',
      'accent-success': '#10b981',
      'accent-warning': '#f59e0b',
      'accent-error': '#ef4444',
      'text-primary': '#ffffff',
      'text-secondary': '#94a3b8',
      'text-tertiary': '#64748b',
    },
    blue: {
      'bg-primary': '#0c1222',
      'bg-secondary': '#1a2332',
      'bg-tertiary': '#2a3444',
      'accent-primary': '#0ea5e9',
      'accent-secondary': '#06b6d4',
      'accent-success': '#10b981',
      'accent-warning': '#f59e0b',
      'accent-error': '#ef4444',
      'text-primary': '#ffffff',
      'text-secondary': '#94a3b8',
      'text-tertiary': '#64748b',
    },
    purple: {
      'bg-primary': '#130f1a',
      'bg-secondary': '#1e1829',
      'bg-tertiary': '#2a2338',
      'accent-primary': '#a855f7',
      'accent-secondary': '#ec4899',
      'accent-success': '#10b981',
      'accent-warning': '#f59e0b',
      'accent-error': '#ef4444',
      'text-primary': '#ffffff',
      'text-secondary': '#94a3b8',
      'text-tertiary': '#64748b',
    },
    green: {
      'bg-primary': '#0a1612',
      'bg-secondary': '#14241f',
      'bg-tertiary': '#1e332c',
      'accent-primary': '#1db954',
      'accent-secondary': '#14a44d',
      'accent-success': '#10b981',
      'accent-warning': '#f59e0b',
      'accent-error': '#ef4444',
      'text-primary': '#ffffff',
      'text-secondary': '#94a3b8',
      'text-tertiary': '#64748b',
    },
  },
  light: {
    default: {
      'bg-primary': '#f8fafc',
      'bg-secondary': '#ffffff',
      'bg-tertiary': '#e2e8f0',
      'accent-primary': '#3b82f6',
      'accent-secondary': '#8b5cf6',
      'accent-success': '#10b981',
      'accent-warning': '#f59e0b',
      'accent-error': '#ef4444',
      'text-primary': '#0f172a',
      'text-secondary': '#475569',
      'text-tertiary': '#94a3b8',
    },
    blue: {
      'bg-primary': '#f0f9ff',
      'bg-secondary': '#ffffff',
      'bg-tertiary': '#e0f2fe',
      'accent-primary': '#0ea5e9',
      'accent-secondary': '#06b6d4',
      'accent-success': '#10b981',
      'accent-warning': '#f59e0b',
      'accent-error': '#ef4444',
      'text-primary': '#0c4a6e',
      'text-secondary': '#075985',
      'text-tertiary': '#0369a1',
    },
    purple: {
      'bg-primary': '#faf5ff',
      'bg-secondary': '#ffffff',
      'bg-tertiary': '#f3e8ff',
      'accent-primary': '#a855f7',
      'accent-secondary': '#ec4899',
      'accent-success': '#10b981',
      'accent-warning': '#f59e0b',
      'accent-error': '#ef4444',
      'text-primary': '#581c87',
      'text-secondary': '#6b21a8',
      'text-tertiary': '#7e22ce',
    },
    green: {
      'bg-primary': '#f0fdf4',
      'bg-secondary': '#ffffff',
      'bg-tertiary': '#dcfce7',
      'accent-primary': '#1db954',
      'accent-secondary': '#14a44d',
      'accent-success': '#10b981',
      'accent-warning': '#f59e0b',
      'accent-error': '#ef4444',
      'text-primary': '#14532d',
      'text-secondary': '#166534',
      'text-tertiary': '#15803d',
    },
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('default');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme from database on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('db:get-settings');

        if (result.success) {
          const settings = result.data;
          const savedMode = (settings.theme || 'dark') as ThemeMode;
          const savedScheme = (settings.color_scheme || 'default') as ColorScheme;

          setModeState(savedMode);
          setColorSchemeState(savedScheme);
          applyTheme(savedMode, savedScheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // Apply theme colors to CSS variables
  const applyTheme = (themeMode: ThemeMode, scheme: ColorScheme) => {
    const colors = COLOR_SCHEMES[themeMode][scheme];
    const root = document.documentElement;

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Update data-theme attribute for Tailwind
    root.setAttribute('data-theme', themeMode);
    root.setAttribute('data-color-scheme', scheme);
  };

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    applyTheme(newMode, colorScheme);

    // Save to database
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('db:update-setting', 'theme', newMode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  const setColorScheme = async (newScheme: ColorScheme) => {
    setColorSchemeState(newScheme);
    applyTheme(mode, newScheme);

    // Save to database
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('db:update-setting', 'color_scheme', newScheme);
    } catch (error) {
      console.error('Error saving color scheme:', error);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  // Don't render children until theme is loaded
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-bg-primary">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-text-secondary text-lg">Ładowanie motywu...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        colorScheme,
        setMode,
        setColorScheme,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
