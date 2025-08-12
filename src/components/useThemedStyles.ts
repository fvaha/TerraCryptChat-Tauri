import { useTheme } from "./ThemeContext";

export const useThemedStyles = () => {
  const { theme } = useTheme();

  // If theme is not loaded yet, return a fallback
  if (!theme) {
    console.log('[useThemedStyles] Theme not loaded yet, using fallback');
    const fallbackTheme = {
      background: '#1a1a1a',
      surface: '#2a2a2a',
      text: '#ffffff',
      textSecondary: '#a0a0a0',
      border: '#333333',
      primary: '#3b82f6',
      scrollbarThumb: '#666666',
      scrollbarTrack: '#1a1a1a'
    };

    return {
      // Container styles
      background: { backgroundColor: fallbackTheme.background },
      surface: { backgroundColor: fallbackTheme.surface },
      
      // Text styles
      text: { color: fallbackTheme.text },
      textSecondary: { color: fallbackTheme.textSecondary },
      
      // Border styles
      border: { borderColor: fallbackTheme.border },
      borderTop: { borderTopColor: fallbackTheme.border },
      borderBottom: { borderBottomColor: fallbackTheme.border },
      borderLeft: { borderLeftColor: fallbackTheme.border },
      borderRight: { borderRightColor: fallbackTheme.border },
      
      // Button styles
      primaryButton: {
        backgroundColor: fallbackTheme.primary,
        color: "white",
        border: "none"
      },
      secondaryButton: {
        backgroundColor: fallbackTheme.surface,
        color: fallbackTheme.text,
        border: `1px solid ${fallbackTheme.border}`
      },
      
      // Input styles
      input: {
        backgroundColor: fallbackTheme.surface,
        color: fallbackTheme.text,
        borderColor: fallbackTheme.border
      },
      
      // Common combined styles
      card: {
        backgroundColor: fallbackTheme.surface,
        borderColor: fallbackTheme.border,
        color: fallbackTheme.text
      },
      
      header: {
        backgroundColor: fallbackTheme.surface,
        borderBottomColor: fallbackTheme.border,
        color: fallbackTheme.text
      },
      
      // Scrollbar styles
      scrollbar: {
        scrollbarWidth: 'thin' as const,
        scrollbarColor: `${fallbackTheme.scrollbarThumb} ${fallbackTheme.scrollbarTrack}`,
      },
      
      // Get the theme object directly
      theme: fallbackTheme
    };
  }

  return {
    // Container styles
    background: { backgroundColor: theme.background },
    surface: { backgroundColor: theme.surface },
    
    // Text styles
    text: { color: theme.text },
    textSecondary: { color: theme.textSecondary },
    
    // Border styles
    border: { borderColor: theme.border },
    borderTop: { borderTopColor: theme.border },
    borderBottom: { borderBottomColor: theme.border },
    borderLeft: { borderLeftColor: theme.border },
    borderRight: { borderRightColor: theme.border },
    
    // Button styles
    primaryButton: {
      backgroundColor: theme.primary,
      color: "white",
      border: "none"
    },
    secondaryButton: {
      backgroundColor: theme.surface,
      color: theme.text,
      border: `1px solid ${theme.border}`
    },
    
    // Input styles
    input: {
      backgroundColor: theme.surface,
      color: theme.text,
      borderColor: theme.border
    },
    
    // Common combined styles
    card: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      color: theme.text
    },
    
    header: {
      backgroundColor: theme.surface,
      borderBottomColor: theme.border,
      color: theme.text
    },
    
    // Scrollbar styles
    scrollbar: {
      scrollbarWidth: 'thin' as const,
      scrollbarColor: `${theme.scrollbarThumb} ${theme.scrollbarTrack}`,
    },
    
    // Get the theme object directly
    theme
  };
}; 
