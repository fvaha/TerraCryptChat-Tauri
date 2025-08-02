import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  theme: Theme;
  isLoading: boolean;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red';

interface Theme {
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
  background: "#f5f5f0", // Dirty white
  surface: "#fafaf8",
  text: "#1f2937",
  textSecondary: "#6b7280",
  border: "#d1d5db",
  primary: "#3b82f6", // Will be overridden by color scheme
  primaryHover: "#2563eb", // Will be overridden by color scheme
  accent: "#8b5cf6", // Will be overridden by color scheme
  error: "#dc2626",
  errorBackground: "#fef2f2",
  success: "#10b981",
  warning: "#f59e0b",
  selected: "#e0e7ff", // Will be overridden by color scheme
  hover: "#f3f4f6", // light gray
  sidebar: "#ffffff",
  sidebarBorder: "#e5e7eb",
  inputBackground: "#ffffff",
  cardBackground: "#ffffff",
  shadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  shadowHover: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
};

const darkTheme: Theme = {
  background: "#1a1a1a", // Darker background
  surface: "#2a2a2a",
  text: "#e5e7eb",
  textSecondary: "#9ca3af",
  border: "#404040",
  primary: "#3b82f6", // Will be overridden by color scheme
  primaryHover: "#2563eb", // Will be overridden by color scheme
  accent: "#8b5cf6", // Will be overridden by color scheme
  error: "#ef4444",
  errorBackground: "#3a2323",
  success: "#22c55e",
  warning: "#eab308",
  selected: "#232e47", // Will be overridden by color scheme
  hover: "#353a4a", // dark gray/blue
  sidebar: "#2d2d2d",
  sidebarBorder: "#404040",
  inputBackground: "#3a3a3a",
  cardBackground: "#2a2a2a",
  shadow: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)",
  shadowHover: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)"
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  console.log('[ThemeProvider] Rendering ThemeProvider');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('blue');

  // Load theme preference from localStorage and system preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        setIsLoading(true);
        console.log("[ThemeContext] Loading theme preference...");
        
        // Try to get from localStorage first
        const storedDarkMode = localStorage.getItem('darkMode');
        const storedColorScheme = localStorage.getItem('colorScheme') as ColorScheme;
        
        let initialDarkMode = false;
        let initialColorScheme: ColorScheme = 'blue';
        
        if (storedDarkMode !== null) {
          initialDarkMode = storedDarkMode === 'true';
          console.log("[ThemeContext] Using stored dark mode preference:", initialDarkMode);
        } else {
          // Default to system preference
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          initialDarkMode = prefersDark;
          console.log("[ThemeContext] Using system preference:", prefersDark);
        }
        
        if (storedColorScheme && ['blue', 'green', 'purple', 'orange', 'red'].includes(storedColorScheme)) {
          initialColorScheme = storedColorScheme;
          console.log("[ThemeContext] Using stored color scheme:", initialColorScheme);
        }
        
        setIsDarkMode(initialDarkMode);
        setColorSchemeState(initialColorScheme);
        
        // Try to sync with backend later (non-blocking)
        setTimeout(async () => {
          try {
            const currentUser = await invoke<any>('db_get_most_recent_user');
            if (currentUser && currentUser.user_id) {
              const userTheme = await invoke<boolean>('db_get_dark_mode', { 
                userId: currentUser.user_id 
              });
              console.log("[ThemeContext] Backend theme preference:", userTheme);
              
              // Only update if backend has a different preference
              if (userTheme !== initialDarkMode) {
                setIsDarkMode(userTheme);
                localStorage.setItem('darkMode', userTheme.toString());
              }
              
              try {
                const userColorScheme = await invoke<string>('db_get_color_scheme', { 
                  userId: currentUser.user_id 
                });
                if (userColorScheme && ['blue', 'green', 'purple', 'orange', 'red'].includes(userColorScheme)) {
                  setColorSchemeState(userColorScheme as ColorScheme);
                  localStorage.setItem('colorScheme', userColorScheme);
                }
              } catch (colorError) {
                console.warn('[ThemeContext] Failed to load color scheme from backend:', colorError);
              }
            }
          } catch (error) {
            console.warn('[ThemeContext] Failed to sync with backend:', error);
          }
        }, 1000); // Wait 1 second before trying to sync with backend
        
      } catch (error) {
        console.error('[ThemeContext] Failed to load theme preference:', error);
        // Default to system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(prefersDark);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadThemePreference();
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
      selected: isDark ? colors.selected + '40' : colors.selected, // Add transparency for dark mode
    };
  };

  // Apply theme to document and global styles
  useEffect(() => {
    const theme = createTheme(isDarkMode, colorScheme);
    
    console.log(`[ThemeContext] Applying ${isDarkMode ? 'dark' : 'light'} theme with ${colorScheme} color scheme`);
    
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
    
    console.log(`[ThemeContext] Theme applied successfully`);
  }, [isDarkMode, colorScheme]);

  const setTheme = async (isDark: boolean) => {
    console.log(`[ThemeContext] Setting theme to ${isDark ? 'dark' : 'light'}`);
    setIsDarkMode(isDark);
    localStorage.setItem('darkMode', isDark.toString());
    
    try {
      // Try to save to backend (non-blocking)
      const currentUser = await invoke<any>('db_get_most_recent_user');
      if (currentUser && currentUser.user_id) {
        await invoke('db_update_dark_mode', { 
          userId: currentUser.user_id, 
          isDarkMode: isDark 
        });
        console.log(`[ThemeContext] Theme preference saved to database`);
      }
    } catch (error) {
      console.warn('[ThemeContext] Failed to save theme preference to backend:', error);
    }
  };

  const setColorScheme = async (scheme: ColorScheme) => {
    console.log(`[ThemeContext] Setting color scheme to ${scheme}`);
    setColorSchemeState(scheme);
    localStorage.setItem('colorScheme', scheme);
    
    try {
      // Try to save to backend (non-blocking)
      const currentUser = await invoke<any>('db_get_most_recent_user');
      if (currentUser && currentUser.user_id) {
        await invoke('db_update_color_scheme', { 
          userId: currentUser.user_id, 
          colorScheme: scheme 
        });
        console.log(`[ThemeContext] Color scheme preference saved to database`);
      }
    } catch (error) {
      console.warn('[ThemeContext] Failed to save color scheme preference to backend:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    await setTheme(newMode);
  };

  const theme = createTheme(isDarkMode, colorScheme);

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      toggleTheme, 
      setTheme, 
      theme, 
      isLoading,
      colorScheme,
      setColorScheme
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