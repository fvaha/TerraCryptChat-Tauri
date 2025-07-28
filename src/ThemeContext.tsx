import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: Theme;
}

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
}

const lightTheme: Theme = {
  background: "#f5f5f0", // Dirty white
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
  selected: "#e0e7ff", // subtle blue
  hover: "#f3f4f6" // light gray
};

const darkTheme: Theme = {
  background: "#2a2a2a", // Dark grey
  surface: "#3a3a3a",
  text: "#e5e7eb",
  textSecondary: "#9ca3af",
  border: "#4a4a4a",
  primary: "#3b82f6",
  primaryHover: "#2563eb",
  accent: "#8b5cf6",
  error: "#ef4444",
  errorBackground: "#3a2323",
  success: "#22c55e",
  warning: "#eab308",
  selected: "#232e47", // subtle dark blue
  hover: "#353a4a" // dark gray/blue
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load theme preference from database on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        // Get most recent user from database (like Kotlin/Swift)
        const currentUser = await invoke<any>('db_get_most_recent_user');
        
        if (currentUser) {
          setIsDarkMode(currentUser.is_dark_mode);
        } else {
          // Default to system preference
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          setIsDarkMode(prefersDark);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
        // Default to system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(prefersDark);
      }
    };
    
    loadThemePreference();
  }, []);

  // Apply theme to document
  useEffect(() => {
    const theme = isDarkMode ? darkTheme : lightTheme;
    
    // Apply CSS custom properties to document root
    document.documentElement.style.setProperty("--bg-color", theme.background);
    document.documentElement.style.setProperty("--surface-color", theme.surface);
    document.documentElement.style.setProperty("--text-color", theme.text);
    document.documentElement.style.setProperty("--text-secondary-color", theme.textSecondary);
    document.documentElement.style.setProperty("--border-color", theme.border);
    document.documentElement.style.setProperty("--primary-color", theme.primary);
    document.documentElement.style.setProperty("--primary-hover-color", theme.primaryHover);
    
    // Update body background
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.text;
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", theme.surface);
    }
  }, [isDarkMode]);

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    try {
      // Get most recent user from database (like Kotlin/Swift)
      const currentUser = await invoke<any>('db_get_most_recent_user');
      
      if (currentUser) {
        await invoke('db_update_dark_mode', { 
          user_id: currentUser.user_id, 
          is_dark_mode: newMode 
        });
      }
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
    
    console.log(`Theme switched to ${newMode ? "dark" : "light"} mode`);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
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

export default ThemeContext; 