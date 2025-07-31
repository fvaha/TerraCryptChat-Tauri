import { useTheme } from "./ThemeContext";

export const useThemedStyles = () => {
  const { theme } = useTheme();

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
    
    // Get the theme object directly
    theme
  };
}; 