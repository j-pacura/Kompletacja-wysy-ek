import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Theme types
export type ThemeMode = 'dark' | 'light';
export type ColorScheme = 'green' | 'blue' | 'purple' | 'orange' | 'red';

interface ThemeContextType {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleMode: () => void;
}

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
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('green');
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
          const savedScheme = (settings.color_scheme || 'green') as ColorScheme;

          setModeState(savedMode);
          setColorSchemeState(savedScheme);
          applyTheme(savedMode, savedScheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        // Apply default theme if loading fails
        applyTheme('dark', 'green');
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // Apply theme to HTML element
  const applyTheme = (themeMode: ThemeMode, scheme: ColorScheme) => {
    const root = document.documentElement;
    const themeString = `${themeMode}-${scheme}`;

    // Update class for dark mode
    if (themeMode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Update data-theme attribute (e.g., "dark-green", "light-blue")
    root.setAttribute('data-theme', themeString);
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
      <div className="flex items-center justify-center w-screen h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-on-surface-variant text-lg font-body">Ładowanie motywu...</p>
        </div>
      </div>
    );
  };

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
