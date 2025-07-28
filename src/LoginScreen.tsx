import React, { useState } from "react";
import { useAppContext } from "./AppContext";
import { useThemedStyles } from "./useThemedStyles";
import { useTheme } from "./ThemeContext";
import dolphinLogo from "./assets/logo.png";

interface LoginScreenProps {
  onSuccess: () => void;
  onShowRegister: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onShowRegister }) => {
  const { login, clearError } = useAppContext();
  const styles = useThemedStyles();
  const { isDarkMode, toggleTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    clearError();

    try {
      await login(username, password);
      onSuccess();
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err instanceof Error 
          ? err.message 
          : "Login failed. Please check your credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...styles.background,
      padding: "2rem"
    }}>
              <div style={{ 
          padding: "3rem", 
          maxWidth: "440px", 
          width: "100%",
          borderRadius: "16px",
          ...styles.surface,
          border: `1px solid ${styles.theme.border}`
        }}>
        {/* Theme Toggle */}
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          marginBottom: "1rem" 
        }}>
          <button
            onClick={toggleTheme}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              border: `2px solid ${styles.theme.border}`,
              backgroundColor: styles.theme.surface,
              color: styles.theme.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "20px",
              transition: "all 0.2s ease"
            }}
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = styles.theme.primary;
              (e.target as HTMLButtonElement).style.backgroundColor = isDarkMode ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.05)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = styles.theme.border;
              (e.target as HTMLButtonElement).style.backgroundColor = styles.theme.surface;
            }}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Logo */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          marginBottom: "2rem" 
        }}>
          <img 
            src={dolphinLogo} 
            alt="Terracrypt Chat" 
            style={{ 
              width: "120px", 
              height: "90px",
              filter: isDarkMode ? "brightness(1.2)" : "brightness(0.9)"
            }} 
          />
        </div>

        <h2 style={{ 
          textAlign: "center", 
          marginBottom: "2rem",
          fontSize: "28px",
          fontWeight: "300",
          letterSpacing: "-0.5px",
          ...styles.text
        }}>
          Welcome to Terracrypt
        </h2>
      
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="username" style={{ 
            display: "block", 
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: "500",
            ...styles.text
          }}>
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "16px 18px",
              border: `2px solid ${styles.theme.border}`,
              borderRadius: "12px",
              backgroundColor: styles.theme.surface,
              color: styles.theme.text,
              outline: "none",
              fontSize: "16px",
              fontWeight: "400",
              transition: "border-color 0.2s ease",
              boxSizing: "border-box"
            }}
            onFocus={(e) => e.target.style.borderColor = styles.theme.primary}
            onBlur={(e) => e.target.style.borderColor = styles.theme.border}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="password" style={{ 
            display: "block", 
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: "500",
            ...styles.text
          }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "16px 18px",
              border: `2px solid ${styles.theme.border}`,
              borderRadius: "12px",
              backgroundColor: styles.theme.surface,
              color: styles.theme.text,
              outline: "none",
              fontSize: "16px",
              fontWeight: "400",
              transition: "border-color 0.2s ease",
              boxSizing: "border-box"
            }}
            onFocus={(e) => e.target.style.borderColor = styles.theme.primary}
            onBlur={(e) => e.target.style.borderColor = styles.theme.border}
          />
        </div>

        {error && (
          <div style={{ 
            color: styles.theme.error,
            marginBottom: "24px",
            padding: "16px",
            backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.1)" : "rgba(220, 38, 38, 0.1)",
            borderRadius: "12px",
            border: `1px solid ${styles.theme.error}`,
            fontSize: "14px",
            fontWeight: "500"
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "18px",
            backgroundColor: isLoading ? styles.theme.textSecondary : styles.theme.primary,
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "600",
            marginTop: "8px",
            marginBottom: "24px",
            transition: "background-color 0.2s ease",
            letterSpacing: "0.5px"
          }}
          onMouseEnter={(e) => !isLoading && ((e.target as HTMLButtonElement).style.backgroundColor = styles.theme.primaryHover)}
          onMouseLeave={(e) => !isLoading && ((e.target as HTMLButtonElement).style.backgroundColor = styles.theme.primary)}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        <button
          type="button"
          onClick={onShowRegister}
          style={{
            width: "100%",
            padding: "16px",
            backgroundColor: "transparent",
            color: styles.theme.primary,
            border: `2px solid ${styles.theme.border}`,
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = isDarkMode ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.05)";
            (e.target as HTMLButtonElement).style.borderColor = styles.theme.primary;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = "transparent";
            (e.target as HTMLButtonElement).style.borderColor = styles.theme.border;
          }}
        >
          Don't have an account? Sign up
        </button>
      </form>
      </div>
    </div>
  );
};

export default LoginScreen;