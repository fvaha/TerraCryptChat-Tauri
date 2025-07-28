
import React, { useState } from "react";
import { useAppContext } from "./AppContext";
import { useThemedStyles } from "./useThemedStyles";
import { useTheme } from "./ThemeContext";
import dolphinLogo from "./assets/logo.png";

interface RegisterFormProps {
  onSuccess: () => void;
  onBackToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onBackToLogin }) => {
  const { services } = useAppContext();
  const styles = useThemedStyles();
  const { isDarkMode } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validation
    if (!username.trim()) {
      setError("Username is required.");
      setIsLoading(false);
      return;
    }
    if (!password) {
      setError("Password is required.");
      setIsLoading(false);
      return;
    }
    if (!repeatPassword) {
      setError("Repeat password is required.");
      setIsLoading(false);
      return;
    }
    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }
    if (!isValidEmail(email)) {
      setError("Invalid email format.");
      setIsLoading(false);
      return;
    }

    try {
      // Call registration service
      const response = await services.authService.register(username, email, password);

      // TODO: Handle successful registration
      console.log("Registration successful:", response.access_token);
      
      onSuccess();
    } catch (err) {
      console.error("Registration failed:", err);
      setError(
        err instanceof Error 
          ? err.message 
          : "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: "3rem", 
      maxWidth: "440px", 
      margin: "auto",
      borderRadius: "16px",
      ...styles.surface,
      border: `1px solid ${styles.theme.border}`
    }}>
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
        Join Terracrypt
      </h2>
      
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="username" style={{ 
            display: "block", 
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: "500",
            ...styles.text
          }}>
            Username *
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
            onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = styles.theme.primary}
            onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = styles.theme.border}
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
            Password *
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
            onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = styles.theme.primary}
            onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = styles.theme.border}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="repeatPassword" style={{ 
            display: "block", 
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: "500",
            ...styles.text
          }}>
            Repeat Password *
          </label>
          <input
            id="repeatPassword"
            type="password"
            placeholder="Repeat your password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "16px 18px",
              border: `2px solid ${repeatPassword && repeatPassword !== password ? styles.theme.error : styles.theme.border}`,
              borderRadius: "12px",
              backgroundColor: styles.theme.surface,
              color: styles.theme.text,
              outline: "none",
              fontSize: "16px",
              fontWeight: "400",
              transition: "border-color 0.2s ease",
              boxSizing: "border-box"
            }}
            onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = styles.theme.primary}
            onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = repeatPassword && repeatPassword !== password ? styles.theme.error : styles.theme.border}
          />
          {repeatPassword && repeatPassword !== password && (
            <div style={{ 
              color: styles.theme.error, 
              fontSize: "14px", 
              marginTop: "8px",
              fontWeight: "500"
            }}>
              Passwords do not match
            </div>
          )}
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="email" style={{ 
            display: "block", 
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: "500",
            ...styles.text
          }}>
            Email *
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "16px 18px",
              border: `2px solid ${email && !isValidEmail(email) ? styles.theme.error : styles.theme.border}`,
              borderRadius: "12px",
              backgroundColor: styles.theme.surface,
              color: styles.theme.text,
              outline: "none",
              fontSize: "16px",
              fontWeight: "400",
              transition: "border-color 0.2s ease",
              boxSizing: "border-box"
            }}
            onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = styles.theme.primary}
            onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = email && !isValidEmail(email) ? styles.theme.error : styles.theme.border}
          />
          {email && !isValidEmail(email) && (
            <div style={{ 
              color: styles.theme.error, 
              fontSize: "14px", 
              marginTop: "8px",
              fontWeight: "500"
            }}>
              Invalid email format
            </div>
          )}
        </div>

        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <a 
            href="https://terracrypt.cc/tos.html" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: styles.theme.primary, 
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            Terms of Service
          </a>
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
          disabled={isLoading || !username || !password || !repeatPassword || !email || password !== repeatPassword || !isValidEmail(email)}
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
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>

        <button
          type="button"
          onClick={onBackToLogin}
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
          Already have an account? Sign In
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
    