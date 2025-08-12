import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  theme: Theme;
  isLoading: boolean;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  syncFromBackend: (userId: string) => Promise<void>;
}

export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red';

interface CurrentUser {
  user_id: string;
  [key: string]: unknown;
}

export interface Theme {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  primaryHover: string;
  accent: string;
  error: string;
  errorBackground: string;
  success: string;
  warning: string;
  selected: string;
  hover: string;
  sidebar: string;
  sidebarBorder: string;
  inputBackground: string;
  cardBackground: string;
  shadow: string;
  shadowHover: string;
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
}

// Color scheme definitions
const colorSchemes = {
  blue: {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    accent: '#8b5cf6',
    selected: '#e0e7ff',
  },
  green: {
    primary: '#10b981',
    primaryHover: '#059669',
    accent: '#84cc16',
    selected: '#d1fae5',
  },
  purple: {
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    accent: '#ec4899',
    selected: '#ede9fe',
  },
  orange: {
    primary: '#f97316',
    primaryHover: '#ea580c',
    accent: '#f59e0b',
    selected: '#fed7aa',
  },
  red: {
    primary: '#ef4444',
    primaryHover: '#dc2626',
    accent: '#f97316',
    selected: '#fee2e2',
  },
};

const lightTheme: Theme = {
  background: "#f5f5f0",
  surface: "#fafaf8",
  text: "#1f2937",
  textSecondary: "#6b7280",
  border: "#d1d5db",
  primary: "#3b82f6",
  primaryHover: "#2563eb",
  accent: "#8b5cf6",
  error: "#dc2626",
  errorBackground: "#fef2f2",
  success: "#10b981",
  warning: "#f59e0b",
  selected: "#e0e7ff",
  hover: "#f3f4f6",
  sidebar: "#ffffff",
  sidebarBorder: "#e5e7eb",
  inputBackground: "#ffffff",
  cardBackground: "#ffffff",
  shadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  shadowHover: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  scrollbarTrack: "#e5e7eb",
  scrollbarThumb: "#9ca3af",
  scrollbarThumbHover: "#4b5563"
};

const darkTheme: Theme = {
  background: "#1a1a1a",
  surface: "#2a2a2a",
  text: "#e5e7eb",
  textSecondary: "#9ca3af",
  border: "#404040",
  primary: "#3b82f6",
  primaryHover: "#2563eb",
  accent: "#8b5cf6",
  error: "#ef4444",
  errorBackground: "#3a2323",
  success: "#22c55e",
  warning: "#eab308",
  selected: "#232e47",
  hover: "#353a4a",
  sidebar: "#2d2d2d",
  sidebarBorder: "#404040",
  inputBackground: "#3a3a3a",
  cardBackground: "#2a2a2a",
  shadow: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)",
  shadowHover: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
  scrollbarTrack: "#404040",
  scrollbarThumb: "#6b7280",
  scrollbarThumbHover: "#9ca3af"
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('blue');

  // Load theme preference from localStorage and system preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        setIsLoading(true);
        console.log('[ThemeContext] Loading theme preferences...');
        
        // Try to get from localStorage first
        const storedDarkMode = localStorage.getItem('darkMode');
        const storedColorScheme = localStorage.getItem('colorScheme') as ColorScheme;
        
        let initialDarkMode = false;
        let initialColorScheme: ColorScheme = 'blue';
        
        if (storedDarkMode !== null) {
          initialDarkMode = storedDarkMode === 'true';
        } else {
          // Default to system preference
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          initialDarkMode = prefersDark;
        }
        
        if (storedColorScheme && ['blue', 'green', 'purple', 'orange', 'red'].includes(storedColorScheme)) {
          initialColorScheme = storedColorScheme;
        }
        
        setIsDarkMode(initialDarkMode);
        setColorSchemeState(initialColorScheme);
        console.log('[ThemeContext] Theme preferences loaded successfully');
        
      } catch (error) {
        console.error('[ThemeContext] Failed to load theme preference:', error);
        // Default to system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(prefersDark);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.warn('[ThemeContext] Theme loading timeout, using defaults');
      setIsLoading(false);
    }, 3000);
    
    loadThemePreference().finally(() => {
      clearTimeout(timeoutId);
    });
  }, []);

  // Create theme with current color scheme
  const createTheme = (isDark: boolean, scheme: ColorScheme): Theme => {
    const baseTheme = isDark ? darkTheme : lightTheme;
    const colors = colorSchemes[scheme];
    
    return {
      ...baseTheme,
      primary: colors.primary,
      primaryHover: colors.primaryHover,
      accent: colors.accent,
      selected: isDark ? colors.selected + '40' : colors.selected,
      scrollbarTrack: baseTheme.scrollbarTrack,
      scrollbarThumb: baseTheme.scrollbarThumb,
      scrollbarThumbHover: baseTheme.scrollbarThumbHover,
    };
  };

  // Apply theme to document and global styles
  useEffect(() => {
    const theme = createTheme(isDarkMode, colorScheme);
    
    // Apply CSS custom properties to document root
    const root = document.documentElement;
    root.style.setProperty("--bg-color", theme.background);
    root.style.setProperty("--surface-color", theme.surface);
    root.style.setProperty("--text-color", theme.text);
    root.style.setProperty("--text-secondary-color", theme.textSecondary);
    root.style.setProperty("--border-color", theme.border);
    root.style.setProperty("--primary-color", theme.primary);
    root.style.setProperty("--primary-hover-color", theme.primaryHover);
    root.style.setProperty("--accent-color", theme.accent);
    root.style.setProperty("--error-color", theme.error);
    root.style.setProperty("--success-color", theme.success);
    root.style.setProperty("--warning-color", theme.warning);
    root.style.setProperty("--selected-color", theme.selected);
    root.style.setProperty("--hover-color", theme.hover);
    root.style.setProperty("--sidebar-color", theme.sidebar);
    root.style.setProperty("--sidebar-border-color", theme.sidebarBorder);
    root.style.setProperty("--input-bg-color", theme.inputBackground);
    root.style.setProperty("--card-bg-color", theme.cardBackground);
    root.style.setProperty("--shadow-color", theme.shadow);
    root.style.setProperty("--shadow-hover-color", theme.shadowHover);
    
    // Update body background and text color
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.text;
    
    // Add/remove dark class to body for Tailwind compatibility
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", theme.surface);
    }
  }, [isDarkMode, colorScheme]);

  const setTheme = async (isDark: boolean) => {
    setIsDarkMode(isDark);
    localStorage.setItem('darkMode', isDark.toString());
    
    try {
      // Try to save to backend if user is logged in
      const currentUser = await invoke<CurrentUser>('db_get_most_recent_user');
      if (currentUser && currentUser.user_id) {
        await invoke('db_update_dark_mode', { 
          userId: currentUser.user_id, 
          isDarkMode: isDark 
        });
      }
    } catch (error) {
      console.warn('[ThemeContext] Failed to save theme preference to backend:', error);
    }
  };

  const setColorScheme = async (scheme: ColorScheme) => {
    try {
      setColorSchemeState(scheme);
      localStorage.setItem('colorScheme', scheme);
      
              // Try to save to backend if user is logged in
        try {
          const currentUser = await invoke<CurrentUser>('db_get_most_recent_user');
        if (currentUser && currentUser.user_id) {
          await invoke('db_update_color_scheme', { 
            userId: currentUser.user_id, 
            colorScheme: scheme 
          });
        }
      } catch (error) {
        console.warn('[ThemeContext] Failed to save color scheme to backend:', error);
      }
    } catch (error) {
      console.error('[ThemeContext] Failed to set color scheme:', error);
    }
  };

  // Method to sync theme preferences from backend (called by SessionManager)
  const syncFromBackend = async (userId: string) => {
    try {
      const userTheme = await invoke<boolean>('db_get_dark_mode', { userId });
      if (userTheme !== null) {
        setIsDarkMode(userTheme);
        localStorage.setItem('darkMode', userTheme.toString());
      }
      
      try {
        const userColorScheme = await invoke<string>('db_get_color_scheme', { userId });
        if (userColorScheme && ['blue', 'green', 'purple', 'orange', 'red'].includes(userColorScheme)) {
          setColorSchemeState(userColorScheme as ColorScheme);
          localStorage.setItem('colorScheme', userColorScheme);
        }
      } catch (colorError) {
        console.warn('[ThemeContext] Failed to sync color scheme from backend:', colorError);
      }
    } catch (error) {
      console.warn('[ThemeContext] Failed to sync theme preferences from backend:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    await setTheme(newMode);
  };

  const theme = useMemo(() => createTheme(isDarkMode, colorScheme), [isDarkMode, colorScheme]);

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      toggleTheme, 
      setTheme, 
      theme, 
      isLoading,
      colorScheme,
      setColorScheme,
      syncFromBackend
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}; 
