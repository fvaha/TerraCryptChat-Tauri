import React, { useState } from "react";
import { useAppContext } from "../AppContext";
import { useThemedStyles } from "../components/useThemedStyles";
import { useTheme } from "../components/ThemeContext";
import dolphinLogo from "../assets/logo.png";

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
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation like Kotlin version
    if (username.trim().length === 0) {
      setError("Please enter your username.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    clearError();

    try {
      await login(username.trim(), password);
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

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  return (
    <div style={{ 
      height: "100vh",
      width: "100vw",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...styles.background,
      position: "relative",
      overflow: "hidden",
      padding: "1rem"
    }}>
      {/* Background Pattern */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDarkMode 
          ? "radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.08) 0%, transparent 50%)"
          : "radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.03) 0%, transparent 50%)",
        pointerEvents: "none"
      }} />

      <div 
        data-screen="login"
        style={{ 
          padding: "clamp(2rem, 5vw, 3rem)", 
          maxWidth: "min(500px, 90vw)", 
          width: "100%",
          borderRadius: "16px",
          ...styles.surface,
          border: `1px solid ${styles.theme.border}`,
          boxShadow: isDarkMode 
            ? "0 20px 40px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)"
            : "0 20px 40px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          backdropFilter: "blur(8px)",
          position: "relative",
          zIndex: 1,
          animation: "fadeInUp 0.5s ease-out"
        }}
      >
        {/* Header with Theme Toggle */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "clamp(1rem, 3vw, 1.5rem)" 
        }}>
          <h2 style={{ 
            fontSize: "clamp(18px, 4vw, 24px)",
            fontWeight: "600",
            ...styles.text,
            margin: 0
          }}>
            Terracrypt Chat
          </h2>
          <button
            onClick={toggleTheme}
            style={{
              width: "clamp(32px, 6vw, 40px)",
              height: "clamp(32px, 6vw, 40px)",
              borderRadius: "8px",
              border: `1px solid ${styles.theme.border}`,
              backgroundColor: styles.theme.surface,
              color: styles.theme.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "clamp(14px, 3vw, 16px)",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
            }}
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = "scale(1.05)";
              (e.target as HTMLButtonElement).style.borderColor = styles.theme.primary;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = "scale(1)";
              (e.target as HTMLButtonElement).style.borderColor = styles.theme.border;
            }}
          >
            {isDarkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Logo */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          marginBottom: "clamp(1rem, 3vw, 1.5rem)" 
        }}>
          <div style={{
            position: "relative",
            animation: "logoFloat 3s ease-in-out infinite"
          }}>
            <img 
              src={dolphinLogo} 
              alt="Terracrypt Chat" 
              style={{ 
                width: "clamp(50px, 12vw, 70px)", 
                height: "auto",
                filter: isDarkMode ? "brightness(1.2) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))" : "brightness(0.9) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))"
              }} 
            />
          </div>
        </div>

        <h3 style={{ 
          textAlign: "center", 
          marginBottom: "clamp(1rem, 3vw, 1.5rem)",
          fontSize: "clamp(16px, 3.5vw, 20px)",
          fontWeight: "500",
          ...styles.text,
          opacity: 0.9
        }}>
          Welcome back
        </h3>
      
        <form onSubmit={handleLogin} style={{ marginBottom: "0" }}>
          <div style={{ marginBottom: "clamp(0.75rem, 2vw, 1rem)" }}>
            <label htmlFor="username" style={{ 
              display: "block", 
              marginBottom: "6px",
              fontSize: "clamp(13px, 2.5vw, 15px)",
              fontWeight: "600",
              ...styles.text,
              opacity: 0.8
            }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={handleUsernameChange}
              style={{ 
                width: "100%", 
                padding: "clamp(12px, 2.5vw, 16px)",
                border: `1px solid ${styles.theme.border}`,
                borderRadius: "10px",
                backgroundColor: styles.theme.surface,
                color: styles.theme.text,
                outline: "none",
                fontSize: "clamp(14px, 2.5vw, 16px)",
                fontWeight: "400",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = styles.theme.primary;
                e.target.style.boxShadow = `0 0 0 2px ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = styles.theme.border;
                e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
              }}
            />
          </div>

          <div style={{ marginBottom: "clamp(1rem, 2.5vw, 1.25rem)" }}>
            <label htmlFor="password" style={{ 
              display: "block", 
              marginBottom: "6px",
              fontSize: "clamp(13px, 2.5vw, 15px)",
              fontWeight: "600",
              ...styles.text,
              opacity: 0.8
            }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
                style={{ 
                  width: "100%", 
                  padding: "clamp(12px, 2.5vw, 16px)",
                  paddingRight: "clamp(40px, 8vw, 50px)",
                  border: `1px solid ${styles.theme.border}`,
                  borderRadius: "10px",
                  backgroundColor: styles.theme.surface,
                  color: styles.theme.text,
                  outline: "none",
                  fontSize: "clamp(14px, 2.5vw, 16px)",
                  fontWeight: "400",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = styles.theme.primary;
                  e.target.style.boxShadow = `0 0 0 2px ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = styles.theme.border;
                  e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "clamp(8px, 2vw, 12px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: styles.theme.textSecondary,
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.color = styles.theme.text;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.color = styles.theme.textSecondary;
                }}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ 
              color: styles.theme.error,
              marginBottom: "clamp(0.75rem, 2vw, 1rem)",
              padding: "clamp(8px, 2vw, 12px)",
              backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.1)" : "rgba(220, 38, 38, 0.1)",
              borderRadius: "8px",
              border: `1px solid ${styles.theme.error}`,
              fontSize: "clamp(12px, 2.5vw, 14px)",
              fontWeight: "500",
              animation: "shake 0.4s ease-in-out"
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !username.trim() || !password}
            style={{
              width: "100%",
              padding: "clamp(14px, 2.5vw, 18px)",
              backgroundColor: isLoading || !username.trim() || !password ? styles.theme.textSecondary : styles.theme.primary,
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: isLoading || !username.trim() || !password ? "not-allowed" : "pointer",
              fontSize: "clamp(14px, 2.5vw, 16px)",
              fontWeight: "600",
              marginBottom: "clamp(0.75rem, 2vw, 1rem)",
              transition: "all 0.2s ease",
              letterSpacing: "0.3px",
              boxShadow: isLoading || !username.trim() || !password ? "none" : "0 2px 8px rgba(59, 130, 246, 0.3)",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              if (!isLoading && username.trim() && password) {
                (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.target as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && username.trim() && password) {
                (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                (e.target as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.3)";
              }
            }}
          >
            {isLoading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <div style={{
                  width: "clamp(12px, 2.5vw, 14px)",
                  height: "clamp(12px, 2.5vw, 14px)",
                  border: "2px solid transparent",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                Signing In...
              </span>
            ) : (
              "Sign In"
            )}
          </button>

          <div style={{
            textAlign: "center",
            padding: "clamp(0.5rem, 2vw, 0.75rem) 0",
            borderTop: `1px solid ${styles.theme.border}`,
            marginTop: "clamp(0.5rem, 2vw, 0.75rem)"
          }}>
            <p style={{
              fontSize: "clamp(12px, 2.5vw, 14px)",
              color: styles.theme.textSecondary,
              margin: "0 0 clamp(0.5rem, 2vw, 0.75rem) 0"
            }}>
              Don't have an account?
            </p>
            <button
              type="button"
              onClick={onShowRegister}
              style={{
                padding: "clamp(6px, 2vw, 10px) clamp(12px, 3vw, 18px)",
                backgroundColor: "transparent",
                color: styles.theme.primary,
                border: `1px solid ${styles.theme.border}`,
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                fontWeight: "600",
                transition: "all 0.2s ease",
                minWidth: "clamp(100px, 20vw, 120px)"
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = isDarkMode ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.05)";
                (e.target as HTMLButtonElement).style.borderColor = styles.theme.primary;
                (e.target as HTMLButtonElement).style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = "transparent";
                (e.target as HTMLButtonElement).style.borderColor = styles.theme.border;
                (e.target as HTMLButtonElement).style.transform = "scale(1)";
              }}
            >
              Create Account
            </button>
          </div>
        </form>

        {/* CSS Animations */}
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes logoFloat {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-6px);
            }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-3px); }
            75% { transform: translateX(3px); }
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LoginScreen;